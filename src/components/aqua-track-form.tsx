
"use client";

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon, User, Truck, IndianRupee, FileText, Loader2, Gauge, Edit } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { salesDataSchema, type SalesDataFormValues, type UserRole } from '@/lib/types';

interface AquaTrackFormProps {
  onSubmit: (values: SalesDataFormValues) => Promise<void>;
  isProcessing: boolean;
  currentUserRole: UserRole;
  lastMeterReadingsByVehicle: Record<string, number>;
  riderNames: string[];
}

const vehicleOptions = ['Alpha', 'Beta', 'Croma', 'Delta', 'Eta'];

export function AquaTrackForm({ onSubmit, isProcessing, currentUserRole, lastMeterReadingsByVehicle, riderNames }: AquaTrackFormProps) {
  const form = useForm<SalesDataFormValues>({
    resolver: zodResolver(salesDataSchema),
    defaultValues: {
      date: new Date(),
      riderName: '',
      vehicleName: '',
      previousMeterReading: 0,
      currentMeterReading: 0,
      overrideLitersSold: undefined,
      ratePerLiter: 0,
      cashReceived: 0,
      onlineReceived: 0,
      dueCollected: 0,
      newDueAmount: 0,
      tokenMoney: 0,
      staffExpense: 0,
      extraAmount: 0,
      comment: '',
    },
  });

  const selectedVehicleName = useWatch({ control: form.control, name: 'vehicleName' });
  const { setValue, getValues } = form;

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (currentUserRole === 'Team Leader') {
      setValue('date', new Date(), { shouldValidate: true, shouldDirty: true });
      setValue('overrideLitersSold', undefined);
    }
    if (currentUserRole !== 'Admin' && getValues('overrideLitersSold') !== undefined) {
      setValue('overrideLitersSold', undefined, { shouldValidate: true });
    }
  }, [currentUserRole, setValue, getValues]);

  useEffect(() => {
    if (isClient && selectedVehicleName) {
      const lastReading = lastMeterReadingsByVehicle[selectedVehicleName];
      if (lastReading !== undefined) {
        setValue('previousMeterReading', lastReading, { shouldValidate: true, shouldDirty: true });
      } else {
        setValue('previousMeterReading', 0, { shouldValidate: true, shouldDirty: true });
      }
    } else if (isClient) {
      setValue('previousMeterReading', 0, { shouldValidate: true, shouldDirty: true });
    }
  }, [selectedVehicleName, lastMeterReadingsByVehicle, setValue, isClient]);

  const [
    previousMeterReading,
    currentMeterReading,
    overrideLitersSold,
    ratePerLiter,
    cashReceived,
    onlineReceived,
    dueCollected,
    newDueAmount,
    tokenMoney,
    staffExpense,
    extraAmount,
  ] = useWatch({
    control: form.control,
    name: [
      'previousMeterReading',
      'currentMeterReading',
      'overrideLitersSold',
      'ratePerLiter',
      'cashReceived',
      'onlineReceived',
      'dueCollected',
      'newDueAmount',
      'tokenMoney',
      'staffExpense',
      'extraAmount',
    ],
  });

  const liveCalculatedLitersSold = React.useMemo(() => {
    const prev = Number(previousMeterReading);
    const curr = Number(currentMeterReading);
    const override = Number(overrideLitersSold);

    if (currentUserRole === 'Admin' && typeof overrideLitersSold === 'number' && overrideLitersSold > 0) {
      return override;
    }
    if (!isNaN(prev) && !isNaN(curr) && curr >= prev) {
      return curr - prev;
    }
    return 0;
  }, [previousMeterReading, currentMeterReading, overrideLitersSold, currentUserRole]);

  const liveTotalSale = React.useMemo(() => {
    return liveCalculatedLitersSold * (Number(ratePerLiter) || 0);
  }, [liveCalculatedLitersSold, ratePerLiter]);

  const liveDiscrepancy = React.useMemo(() => {
    const totalSaleVal = liveTotalSale;
    const dueCollectedVal = Number(dueCollected) || 0;
    const cashReceivedVal = Number(cashReceived) || 0;
    const onlineReceivedVal = Number(onlineReceived) || 0;
    const newDueAmountVal = Number(newDueAmount) || 0;
    const tokenMoneyVal = Number(tokenMoney) || 0;
    const extraAmountVal = Number(extraAmount) || 0;
    const staffExpenseVal = Number(staffExpense) || 0;

    return (totalSaleVal + dueCollectedVal) - cashReceivedVal - onlineReceivedVal - newDueAmountVal - tokenMoneyVal - extraAmountVal - staffExpenseVal;
  }, [liveTotalSale, cashReceived, onlineReceived, dueCollected, newDueAmount, tokenMoney, staffExpense, extraAmount]);


  const inputFields = [
    { name: 'riderName', label: 'Rider Name', icon: User, placeholder: 'Select rider name', componentType: 'select', options: riderNames },
    { name: 'vehicleName', label: 'Vehicle Name', icon: Truck, componentType: 'select', options: vehicleOptions, placeholder: 'Select vehicle name' },
    { name: 'previousMeterReading', label: 'Previous Meter Reading', icon: Gauge, type: 'number', placeholder: 'e.g., 12300', componentType: 'input', description: currentUserRole === 'Admin' ? "Auto-filled from session, editable by Admin." : "Auto-filled from session for vehicle." },
    { name: 'currentMeterReading', label: 'Current Meter Reading', icon: Gauge, type: 'number', placeholder: 'e.g., 12450', componentType: 'input' },
    { name: 'ratePerLiter', label: 'Rate Per Liter', icon: IndianRupee, type: 'number', placeholder: 'e.g., 2.5', componentType: 'input' },
    { name: 'cashReceived', label: 'Cash Received', icon: IndianRupee, type: 'number', placeholder: 'e.g., 3000', componentType: 'input' },
    { name: 'onlineReceived', label: 'Online Received', icon: IndianRupee, type: 'number', placeholder: 'e.g., 500', componentType: 'input' },
    { name: 'dueCollected', label: 'Due Collected (Past Dues)', icon: IndianRupee, type: 'number', placeholder: 'e.g., 100', componentType: 'input' },
    { name: 'newDueAmount', label: 'New Due Amount (Today\'s Sale)', icon: IndianRupee, type: 'number', placeholder: 'e.g., 30', componentType: 'input' },
    { name: 'tokenMoney', label: 'Token Money', icon: IndianRupee, type: 'number', placeholder: 'e.g., 50', componentType: 'input' },
    { name: 'staffExpense', label: 'Staff Expense', icon: IndianRupee, type: 'number', placeholder: 'e.g., 20', componentType: 'input' },
    { name: 'extraAmount', label: 'Extra Amount', icon: IndianRupee, type: 'number', placeholder: 'e.g., 10', componentType: 'input' },
  ] as const;


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of Sale</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground",
                        currentUserRole === 'Team Leader' && "cursor-not-allowed opacity-70"
                      )}
                      disabled={currentUserRole === 'Team Leader'}
                    >
                      {isClient && field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>{field.value ? "Initializing date..." : "Pick a date"}</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                {currentUserRole === 'Admin' && (
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        if (date) field.onChange(date);
                      }}
                      disabled={(date) =>
                        date > new Date() ||
                        date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                )}
              </Popover>
              {currentUserRole === 'Team Leader' && <FormDescription className="mt-1">Date is automatically set to today for Team Leaders.</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {inputFields.map((inputField) => {
            const isPrevMeterReadingField = inputField.name === 'previousMeterReading';
            const isRatePerLiterField = inputField.name === 'ratePerLiter';
            
            let fieldIsDisabled = false;
            if (isPrevMeterReadingField && currentUserRole === 'Team Leader') {
              fieldIsDisabled = true;
            }
            if (isRatePerLiterField && currentUserRole === 'Team Leader') {
              fieldIsDisabled = true;
            }
            
            const currentOptions = inputField.name === 'riderName' ? riderNames : (inputField.options || []);


            return (
              <FormField
                key={inputField.name}
                control={form.control}
                name={inputField.name as keyof SalesDataFormValues}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <inputField.icon className="mr-2 h-4 w-4 text-primary" />
                      {inputField.label}
                    </FormLabel>
                    <FormControl>
                      {inputField.componentType === 'select' ? (
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                          }}
                          value={field.value as string || ""}
                        >
                          <SelectTrigger className="text-base">
                            <SelectValue placeholder={inputField.placeholder} />
                          </SelectTrigger>
                          <SelectContent>
                            {currentOptions && currentOptions.length > 0 ? (
                              currentOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="" disabled>
                                {inputField.name === 'riderName' ? 'No riders available (add in Admin Panel)' : 'No options'}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={inputField.type || 'text'}
                          placeholder={inputField.placeholder}
                          {...field}
                          disabled={fieldIsDisabled}
                          value={ typeof field.value === 'number' && field.value === 0 && inputField.name !== 'previousMeterReading' && inputField.name !== 'currentMeterReading' && inputField.name !== 'overrideLitersSold' && inputField.name !== 'newDueAmount' ? "" : field.value }
                          onChange={event => {
                            if (inputField.type === 'number') {
                              const numValue = parseFloat(event.target.value);
                              field.onChange(isNaN(numValue) ? (inputField.name === 'overrideLitersSold' ? undefined : 0) : numValue);
                            } else {
                              field.onChange(event.target.value);
                            }
                          }}
                          className={cn("text-base", fieldIsDisabled && "cursor-not-allowed opacity-70")}
                        />
                      )}
                    </FormControl>
                    {inputField.description && <FormDescription>{inputField.description}</FormDescription>}
                    {isRatePerLiterField && currentUserRole === 'Team Leader' && <FormDescription>Rate per liter is set by Admin and cannot be changed by Team Leader.</FormDescription>}
                    {isPrevMeterReadingField && currentUserRole === 'Team Leader' && isClient && selectedVehicleName && lastMeterReadingsByVehicle[selectedVehicleName] === undefined && <FormDescription>No previous reading for this vehicle in session.</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />
            );
          })}
        </div>

        {currentUserRole === 'Admin' && (
          <FormField
            control={form.control}
            name="overrideLitersSold"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  <Edit className="mr-2 h-4 w-4 text-primary" />
                  Override Liters Sold (Admin Only, Optional)
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 150 (Overrides calculation if set)"
                    {...field}
                    value={field.value === undefined ? "" : field.value}
                     onChange={event => {
                        const numValue = parseFloat(event.target.value);
                        field.onChange(isNaN(numValue) || event.target.value === '' ? undefined : numValue);
                      }}
                    className="text-base"
                  />
                </FormControl>
                <FormDescription>If a value is entered here, it will be used as Liters Sold, otherwise it's calculated from meter readings.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-muted/50 rounded-md">
            <FormLabel className="flex items-center text-primary">
              <Gauge className="mr-2 h-4 w-4" /> Calculated Liters Sold
            </FormLabel>
            <p className="text-2xl font-bold mt-1">{liveCalculatedLitersSold.toFixed(2)} L</p>
            <FormDescription>
              {currentUserRole === 'Admin' && typeof overrideLitersSold === 'number' && overrideLitersSold > 0
                ? "Using admin override value."
                : "Calculated from meter readings."}
            </FormDescription>
            {(form.formState.errors.currentMeterReading?.message || form.formState.errors.previousMeterReading?.message) &&
               <FormMessage className="mt-1">{form.formState.errors.currentMeterReading?.message || form.formState.errors.previousMeterReading?.message}</FormMessage>
            }
          </div>
          <div className="p-4 bg-muted/50 rounded-md">
            <FormLabel className="flex items-center text-primary">
              <IndianRupee className="mr-2 h-4 w-4" /> Live Discrepancy
            </FormLabel>
            <p className="text-2xl font-bold mt-1">₹{liveDiscrepancy.toFixed(2)}</p>
            <FormDescription>Based on current form values.</FormDescription>
          </div>
        </div>

        <FormField
          control={form.control}
          name="comment"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                <FileText className="mr-2 h-4 w-4 text-primary" />
                Comment (Optional)
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter any comments related to the sales data"
                  className="resize-none text-base"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full text-lg py-6" disabled={isProcessing}>
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            'Calculate & Generate Report'
          )}
        </Button>
      </form>
    </Form>
  );
}


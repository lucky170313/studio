
"use client";

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon, User, Truck, IndianRupee, FileText, Loader2, Gauge, Edit, Clock, Image as ImageIcon } from 'lucide-react';
import NextImage from 'next/image'; // Renamed to avoid conflict with lucide-react Image


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
import { getLastMeterReadingForVehicleAction } from '@/app/actions';

interface AquaTrackFormProps {
  onSubmit: (values: SalesDataFormValues) => void;
  isProcessing: boolean;
  currentUserRole: UserRole;
  riderNames: string[];
  persistentRatePerLiter: number;
}

const vehicleOptions = ['Alpha', 'Beta', 'Croma', 'Delta', 'Eta'];
const hoursWorkedOptions = Array.from({ length: 9 }, (_, i) => String(i + 1));

export function AquaTrackForm({ onSubmit, isProcessing, currentUserRole, riderNames, persistentRatePerLiter }: AquaTrackFormProps) {
  const form = useForm<SalesDataFormValues>({
    resolver: zodResolver(salesDataSchema),
    defaultValues: {
      date: new Date(),
      riderName: '',
      vehicleName: '',
      previousMeterReading: 0,
      currentMeterReading: 0,
      overrideLitersSold: undefined,
      ratePerLiter: persistentRatePerLiter,
      cashReceived: 0,
      onlineReceived: 0,
      dueCollected: 0,
      newDueAmount: 0,
      tokenMoney: 0,
      staffExpense: 0,
      extraAmount: 0,
      hoursWorked: 9,
      comment: '',
      meterReadingImage: undefined,
    },
  });

  const selectedVehicleName = useWatch({ control: form.control, name: 'vehicleName' });
  const meterReadingImageFile = useWatch({ control: form.control, name: 'meterReadingImage' });
  const { setValue, getValues, watch } = form;

  const [isClient, setIsClient] = useState(false);
  const [isLoadingPrevReading, setIsLoadingPrevReading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      if (currentUserRole === 'TeamLeader') {
        setValue('date', new Date(), { shouldValidate: true, shouldDirty: true });
        setValue('ratePerLiter', persistentRatePerLiter, { shouldValidate: true, shouldDirty: true });
      } else if (currentUserRole === 'Admin') {
         setValue('ratePerLiter', persistentRatePerLiter, { shouldValidate: true, shouldDirty: true });
      }
      if (currentUserRole !== 'Admin' && getValues('overrideLitersSold') !== undefined) {
        setValue('overrideLitersSold', undefined, { shouldValidate: true });
      }
    }
  }, [currentUserRole, setValue, getValues, persistentRatePerLiter, isClient]);


  useEffect(() => {
    if (isClient && selectedVehicleName) {
      const fetchPrevReading = async () => {
        setIsLoadingPrevReading(true);
        const result = await getLastMeterReadingForVehicleAction(selectedVehicleName);
        if (result.success) {
          setValue('previousMeterReading', result.reading, { shouldValidate: true, shouldDirty: true });
        } else {
          setValue('previousMeterReading', 0, { shouldValidate: true, shouldDirty: true });
        }
        setIsLoadingPrevReading(false);
      };
      fetchPrevReading();
    } else if (isClient && !selectedVehicleName) {
      setValue('previousMeterReading', 0, { shouldValidate: true, shouldDirty: true });
    }
  }, [selectedVehicleName, setValue, isClient]);

  useEffect(() => {
    if (meterReadingImageFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(meterReadingImageFile);
    } else {
      setImagePreview(null);
    }
  }, [meterReadingImageFile]);

  const [
    watchedPreviousMeterReading,
    watchedCurrentMeterReading,
    watchedOverrideLitersSold,
    watchedRatePerLiter,
    watchedCashReceived,
    watchedOnlineReceived,
    watchedDueCollected,
    watchedNewDueAmount,
    watchedTokenMoney,
    watchedStaffExpense,
    watchedExtraAmount,
  ] = watch([
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
  ]);


  const liveCalculatedLitersSold = React.useMemo(() => {
    const prev = Number(watchedPreviousMeterReading);
    const curr = Number(watchedCurrentMeterReading);
    const override = watchedOverrideLitersSold !== undefined ? Number(watchedOverrideLitersSold) : undefined;

    if (currentUserRole === 'Admin' && typeof override === 'number' && override >= 0) {
      return override;
    }
    if (!isNaN(prev) && !isNaN(curr) && curr >= prev) {
      return curr - prev;
    }
    return 0;
  }, [watchedPreviousMeterReading, watchedCurrentMeterReading, watchedOverrideLitersSold, currentUserRole]);

  const liveTotalSale = React.useMemo(() => {
    return liveCalculatedLitersSold * (Number(watchedRatePerLiter) || 0);
  }, [liveCalculatedLitersSold, watchedRatePerLiter]);

  const liveDiscrepancy = React.useMemo(() => {
    const totalSaleVal = liveTotalSale;
    const dueCollectedVal = Number(watchedDueCollected) || 0;
    const cashReceivedVal = Number(watchedCashReceived) || 0;
    const onlineReceivedVal = Number(watchedOnlineReceived) || 0;
    const newDueAmountVal = Number(watchedNewDueAmount) || 0;
    const tokenMoneyVal = Number(watchedTokenMoney) || 0;
    const extraAmountVal = Number(watchedExtraAmount) || 0;
    const staffExpenseVal = Number(watchedStaffExpense) || 0;

    return (totalSaleVal + dueCollectedVal) - (cashReceivedVal + onlineReceivedVal + newDueAmountVal + tokenMoneyVal + extraAmountVal + staffExpenseVal);
  }, [liveTotalSale, watchedCashReceived, watchedOnlineReceived, watchedDueCollected, watchedNewDueAmount, watchedTokenMoney, watchedStaffExpense, watchedExtraAmount]);

  const inputFields = [
    { name: 'riderName', label: 'Rider Name', icon: User, placeholder: 'Select rider name', componentType: 'select', options: riderNames },
    { name: 'vehicleName', label: 'Vehicle Name', icon: Truck, componentType: 'select', options: vehicleOptions, placeholder: 'Select vehicle name' },
    { name: 'hoursWorked', label: 'Hours Worked', icon: Clock, componentType: 'select', options: hoursWorkedOptions, placeholder: 'Select hours' },
    { name: 'previousMeterReading', label: 'Previous Meter Reading', icon: Gauge, type: 'number', placeholder: 'e.g., 12300', componentType: 'input', description: "Auto-filled from DB. Admin can edit." },
    { name: 'currentMeterReading', label: 'Current Meter Reading', icon: Gauge, type: 'number', placeholder: 'e.g., 12450', componentType: 'input' },
    // Meter Reading Image will be inserted after this field by checking the name
    { name: 'ratePerLiter', label: 'Rate Per Liter', icon: IndianRupee, type: 'number', placeholder: 'e.g., 2.5', componentType: 'input', description: currentUserRole === 'TeamLeader' ? `Global rate: ₹${persistentRatePerLiter.toFixed(2)} (Set by Admin)` : `Global rate: ₹${persistentRatePerLiter.toFixed(2)} (Editable by Admin).` },
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
                        currentUserRole === 'TeamLeader' && "cursor-not-allowed opacity-70"
                      )}
                      disabled={currentUserRole === 'TeamLeader'}
                    >
                      {isClient && field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>{isClient ? "Initializing date..." : "Pick a date"}</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                {currentUserRole === 'Admin' && (
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value instanceof Date ? field.value : new Date(field.value || Date.now())}
                      onSelect={(date) => {
                        if (date && isClient) field.onChange(date);
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
              {currentUserRole === 'TeamLeader' && <FormDescription className="mt-1">Date is automatically set to today for Team Leaders.</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {inputFields.map((inputField) => {
            const isPrevMeterReadingField = inputField.name === 'previousMeterReading';
            const isRatePerLiterField = inputField.name === 'ratePerLiter';

            let fieldIsDisabled = false;
            if (isPrevMeterReadingField && (currentUserRole === 'TeamLeader' || isLoadingPrevReading)) {
              fieldIsDisabled = true;
            }
            if (isRatePerLiterField && currentUserRole === 'TeamLeader') {
              fieldIsDisabled = true;
            }

            let currentOptions: string[] = [];
            if (inputField.name === 'riderName') {
                currentOptions = riderNames;
            } else if (inputField.name === 'vehicleName') {
                currentOptions = vehicleOptions;
            } else if (inputField.name === 'hoursWorked') {
                currentOptions = hoursWorkedOptions;
            }

            const fieldElement = (
              <FormField
                key={inputField.name}
                control={form.control}
                name={inputField.name as keyof SalesDataFormValues}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      {inputField.icon && <inputField.icon className="mr-2 h-4 w-4 text-primary" />}
                      {inputField.label}
                      {isPrevMeterReadingField && isLoadingPrevReading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    </FormLabel>
                    <FormControl>
                      {inputField.componentType === 'select' ? (
                        <Select
                          onValueChange={(value) => {
                            const valToSet = inputField.name === 'hoursWorked' ? parseInt(value, 10) : value;
                            field.onChange(valToSet);
                          }}
                          value={String(field.value === undefined || field.value === null ? (inputField.name === 'hoursWorked' ? '9' : '') : field.value)}
                          disabled={fieldIsDisabled}
                        >
                          <SelectTrigger className={cn("text-base", fieldIsDisabled && "cursor-not-allowed opacity-70")}>
                            <SelectValue placeholder={inputField.placeholder} />
                          </SelectTrigger>
                          <SelectContent>
                            {currentOptions && currentOptions.length > 0 ? (
                              currentOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option} {inputField.name === 'hoursWorked' ? 'hr' : ''}
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
                          value={ typeof field.value === 'number' && field.value === 0 && inputField.name !== 'previousMeterReading' && inputField.name !== 'currentMeterReading' && inputField.name !== 'overrideLitersSold' && inputField.name !== 'newDueAmount' ? "" : (field.value ?? "") }
                          onChange={event => {
                            if (inputField.type === 'number') {
                              const numValue = parseFloat(event.target.value);
                              field.onChange(isNaN(numValue) ? (inputField.name === 'overrideLitersSold' ? undefined : '') : numValue);
                            } else {
                              field.onChange(event.target.value);
                            }
                          }}
                          className={cn("text-base", fieldIsDisabled && "cursor-not-allowed opacity-70")}
                        />
                      )}
                    </FormControl>
                    {inputField.description && <FormDescription>{inputField.description}</FormDescription>}
                    {isPrevMeterReadingField && currentUserRole === 'TeamLeader' && isClient && selectedVehicleName && !isLoadingPrevReading && form.getValues('previousMeterReading') === 0 && <FormDescription>No previous reading for this vehicle found in DB.</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />
            );

            if (inputField.name === 'currentMeterReading') {
              return (
                <React.Fragment key={`${inputField.name}-fragment`}>
                  {fieldElement}
                  <FormField
                    key="meterReadingImageField"
                    control={form.control}
                    name="meterReadingImage"
                    render={({ field: imageField }) => (
                        <FormItem>
                            <FormLabel className="flex items-center">
                                <ImageIcon className="mr-2 h-4 w-4 text-primary" />
                                Meter Reading Image
                            </FormLabel>
                            <FormControl>
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => imageField.onChange(e.target.files ? e.target.files[0] : undefined)}
                                    className="text-base"
                                />
                            </FormControl>
                            <FormDescription>Upload an image of the meter reading. Actual Google Drive upload not yet implemented.</FormDescription>
                            {imagePreview && (
                                <div className="mt-2">
                                    <NextImage src={imagePreview} alt="Meter reading preview" width={200} height={200} className="rounded-md border" />
                                </div>
                            )}
                            <FormMessage />
                        </FormItem>
                    )}
                  />
                </React.Fragment>
              );
            }
            return fieldElement;
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
              {currentUserRole === 'Admin' && typeof watchedOverrideLitersSold === 'number' && watchedOverrideLitersSold >= 0
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

        <Button type="submit" className="w-full text-lg py-6" disabled={isProcessing || isLoadingPrevReading}>
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : isLoadingPrevReading ? (
             <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Fetching Previous Reading...
            </>
          ) : (
            'Calculate & Generate Report'
          )}
        </Button>
      </form>
    </Form>
  );
}

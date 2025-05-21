
"use client";

import type * as React from 'react';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon, User, Truck, Droplets, DollarSign, FileText, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
}

const vehicleOptions = ['Alpha', 'Beta', 'Croma', 'Delta', 'Eta'];
// Placeholder for rider names - you can populate this from a backend or define statically
const riderNameOptions = ['Rider John', 'Rider Jane', 'Rider Alex']; 

export function AquaTrackForm({ onSubmit, isProcessing, currentUserRole }: AquaTrackFormProps) {
  const form = useForm<SalesDataFormValues>({
    resolver: zodResolver(salesDataSchema),
    defaultValues: {
      date: currentUserRole === 'Team Leader' ? new Date() : undefined, // Set today for TL
      riderName: '',
      vehicleName: '',
      litersSold: 0,
      ratePerLiter: 0,
      cashReceived: 0,
      onlineReceived: 0,
      dueCollected: 0,
      tokenMoney: 0,
      staffExpense: 0,
      extraAmount: 0,
      comment: '',
    },
  });

  // Watch for role changes to update date field if necessary
  const role = useWatch({ control: form.control, name: 'currentUserRole' as any, defaultValue: currentUserRole });
  
  useEffect(() => {
    if (currentUserRole === 'Team Leader') {
      form.setValue('date', new Date(), { shouldValidate: true, shouldDirty: true });
    } else {
      // For Admin, if date was set by TL default, allow them to change it by not forcing a value
      // Or, if you want to clear it when switching to Admin:
      // form.setValue('date', undefined, { shouldValidate: true, shouldDirty: true }); 
    }
  }, [currentUserRole, form]);


  const inputFields = [
    { name: 'riderName', label: 'Rider Name', icon: User, placeholder: 'Select or enter rider name', componentType: 'select', options: riderNameOptions }, // Changed to select
    { name: 'vehicleName', label: 'Vehicle Name', icon: Truck, componentType: 'select', options: vehicleOptions, placeholder: 'Select vehicle name' },
    { name: 'litersSold', label: 'Liters Sold', icon: Droplets, type: 'number', placeholder: 'e.g., 1500', componentType: 'input' },
    { name: 'ratePerLiter', label: 'Rate Per Liter', icon: DollarSign, type: 'number', placeholder: 'e.g., 2.5', componentType: 'input' },
    { name: 'cashReceived', label: 'Cash Received', icon: DollarSign, type: 'number', placeholder: 'e.g., 3000', componentType: 'input' },
    { name: 'onlineReceived', label: 'Online Received', icon: DollarSign, type: 'number', placeholder: 'e.g., 500', componentType: 'input' },
    { name: 'dueCollected', label: 'Due Collected', icon: DollarSign, type: 'number', placeholder: 'e.g., 100', componentType: 'input' },
    { name: 'tokenMoney', label: 'Token Money', icon: DollarSign, type: 'number', placeholder: 'e.g., 50', componentType: 'input' },
    { name: 'staffExpense', label: 'Staff Expense', icon: DollarSign, type: 'number', placeholder: 'e.g., 20', componentType: 'input' },
    { name: 'extraAmount', label: 'Extra Amount', icon: DollarSign, type: 'number', placeholder: 'e.g., 10', componentType: 'input' },
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
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                {currentUserRole === 'Admin' && ( // Only show calendar popover for Admin
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        if (date) field.onChange(date);
                      }}
                      disabled={(date) => // Admin can select any date, for TL it's disabled anyway
                        currentUserRole === 'Team Leader' || // Redundant due to PopoverContent conditional render but good for clarity
                        date > new Date() || 
                        date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                )}
              </Popover>
              {currentUserRole === 'Team Leader' && <p className="text-sm text-muted-foreground mt-1">Date is automatically set to today for Team Leaders.</p>}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {inputFields.map((inputField) => (
            <FormField
              key={inputField.name}
              control={form.control}
              name={inputField.name as keyof SalesDataFormValues} // Type assertion
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <inputField.icon className="mr-2 h-4 w-4 text-primary" />
                    {inputField.label}
                  </FormLabel>
                  <FormControl>
                    {inputField.componentType === 'select' ? (
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value as string} // Ensure value is string for Select
                        value={field.value as string} // Controlled component
                      >
                        <SelectTrigger className="text-base">
                          <SelectValue placeholder={inputField.placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {inputField.options?.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={inputField.type || 'text'}
                        placeholder={inputField.placeholder}
                        {...field}
                        value={ typeof field.value === 'number' && field.value === 0 && (inputField.name === 'litersSold' || inputField.name === 'ratePerLiter') ? "" : field.value } // Show empty for 0 for certain fields initially
                        onChange={event => {
                          if (inputField.type === 'number') {
                            field.onChange(parseFloat(event.target.value) || 0);
                          } else {
                            field.onChange(event.target.value);
                          }
                        }}
                        className="text-base"
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
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

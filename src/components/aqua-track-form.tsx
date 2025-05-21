
"use client";

import type * as React from 'react';
import { useForm } from 'react-hook-form';
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
import { cn } from '@/lib/utils';
import { salesDataSchema, type SalesDataFormValues } from '@/lib/types';

interface AquaTrackFormProps {
  onSubmit: (values: SalesDataFormValues) => Promise<void>;
  isProcessing: boolean;
}

export function AquaTrackForm({ onSubmit, isProcessing }: AquaTrackFormProps) {
  const form = useForm<SalesDataFormValues>({
    resolver: zodResolver(salesDataSchema),
    defaultValues: {
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

  const inputFields = [
    { name: 'riderName', label: 'Rider Name', icon: User, placeholder: 'Enter rider name' },
    { name: 'vehicleName', label: 'Vehicle Name', icon: Truck, placeholder: 'Enter vehicle name' },
    { name: 'litersSold', label: 'Liters Sold', icon: Droplets, type: 'number', placeholder: 'e.g., 1500' },
    { name: 'ratePerLiter', label: 'Rate Per Liter', icon: DollarSign, type: 'number', placeholder: 'e.g., 2.5' },
    { name: 'cashReceived', label: 'Cash Received', icon: DollarSign, type: 'number', placeholder: 'e.g., 3000' },
    { name: 'onlineReceived', label: 'Online Received', icon: DollarSign, type: 'number', placeholder: 'e.g., 500' },
    { name: 'dueCollected', label: 'Due Collected', icon: DollarSign, type: 'number', placeholder: 'e.g., 100' },
    { name: 'tokenMoney', label: 'Token Money', icon: DollarSign, type: 'number', placeholder: 'e.g., 50' },
    { name: 'staffExpense', label: 'Staff Expense', icon: DollarSign, type: 'number', placeholder: 'e.g., 20' },
    { name: 'extraAmount', label: 'Extra Amount', icon: DollarSign, type: 'number', placeholder: 'e.g., 10' },
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
                        !field.value && "text-muted-foreground"
                      )}
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
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {inputFields.map((inputField) => (
            <FormField
              key={inputField.name}
              control={form.control}
              name={inputField.name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <inputField.icon className="mr-2 h-4 w-4 text-primary" />
                    {inputField.label}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type={inputField.type || 'text'}
                      placeholder={inputField.placeholder}
                      {...field}
                      className="text-base"
                    />
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

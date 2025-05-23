
"use client";

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format as formatDateFns, getYear, getMonth } from 'date-fns';
import Link from 'next/link';
import { CalendarIcon, User, IndianRupee, FileText, Loader2, Landmark, ArrowLeft, Download, AlertCircleIcon, MinusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { SalaryPaymentFormValues } from '@/lib/types';
import { salaryPaymentSchema } from '@/lib/types';
import { saveSalaryPaymentAction, getRiderMonthlyAggregatesAction } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const RIDER_NAMES_KEY = 'riderNamesDropAquaTrackApp';
const LOGIN_SESSION_KEY = 'loginSessionDropAquaTrackApp';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i); // Last 5 years
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function SalaryPaymentPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingSalary, setIsFetchingSalary] = useState(false);
  const { toast } = useToast();
  const [riderNames, setRiderNames] = useState<string[]>([]);
  const [loggedInUsername, setLoggedInUsername] = useState<string | null>(null);

  const form = useForm<SalaryPaymentFormValues>({
    resolver: zodResolver(salaryPaymentSchema),
    defaultValues: {
      paymentDate: new Date(),
      riderName: '',
      salaryGiverName: '', 
      selectedYear: String(currentYear),
      selectedMonth: String(getMonth(new Date())), 
      salaryAmountForPeriod: 0,
      amountPaid: 0,
      deductionAmount: 0,
      comment: '',
    },
  });

  const { watch, setValue, getValues } = form;
  const watchedSalaryAmount = watch('salaryAmountForPeriod');
  const watchedAmountPaid = watch('amountPaid');
  const watchedDeductionAmount = watch('deductionAmount');
  const watchedRiderName = watch('riderName');
  const watchedSelectedYear = watch('selectedYear');
  const watchedSelectedMonth = watch('selectedMonth');

  const remainingAmount = useMemo(() => {
    const salary = Number(watchedSalaryAmount) || 0;
    const paid = Number(watchedAmountPaid) || 0;
    const deduction = Number(watchedDeductionAmount) || 0;
    return salary - paid - deduction;
  }, [watchedSalaryAmount, watchedAmountPaid, watchedDeductionAmount]);

  useEffect(() => {
    try {
      const storedRiderNames = localStorage.getItem(RIDER_NAMES_KEY);
      if (storedRiderNames) {
        const parsedRiderNames = JSON.parse(storedRiderNames);
        if (Array.isArray(parsedRiderNames) && parsedRiderNames.length > 0) {
          setRiderNames(parsedRiderNames);
        }
      }
    } catch (error) {
      console.error("Failed to parse riderNames from localStorage", error);
    }

    try {
      const storedSession = localStorage.getItem(LOGIN_SESSION_KEY);
      if (storedSession) {
        const session = JSON.parse(storedSession);
        if (session.isLoggedIn && session.loggedInUsername) {
          setLoggedInUsername(session.loggedInUsername);
          setValue('salaryGiverName', session.loggedInUsername, { shouldValidate: true });
        } else {
          toast({ title: "Access Denied", description: "You must be logged in to access this page.", variant: "destructive" });
        }
      } else {
         toast({ title: "Access Denied", description: "You must be logged in to access this page.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Failed to parse login session from localStorage", error);
       toast({ title: "Error", description: "Could not verify login status.", variant: "destructive" });
    }
  }, [setValue, toast]);

  useEffect(() => {
    const fetchAndSetSalary = async () => {
      if (watchedRiderName && watchedSelectedYear && watchedSelectedMonth) {
        setIsFetchingSalary(true);
        setValue('salaryAmountForPeriod', 0); 
        try {
          const result = await getRiderMonthlyAggregatesAction(
            watchedRiderName,
            parseInt(watchedSelectedYear),
            parseInt(watchedSelectedMonth)
          );
          if (result.success && result.aggregates) {
            setValue('salaryAmountForPeriod', result.aggregates.netMonthlyEarning, { shouldValidate: true });
          } else {
            toast({ title: "Info", description: result.message || "Could not fetch monthly earnings for this rider/period. Please enter manually.", variant: "default" });
            setValue('salaryAmountForPeriod', 0);
          }
        } catch (error) {
          toast({ title: "Error", description: "Failed to fetch rider's monthly earnings.", variant: "destructive" });
          setValue('salaryAmountForPeriod', 0);
        } finally {
          setIsFetchingSalary(false);
        }
      }
    };
    fetchAndSetSalary();
  }, [watchedRiderName, watchedSelectedYear, watchedSelectedMonth, setValue, toast]);


  const onSubmit = async (values: SalaryPaymentFormValues) => {
    if (!loggedInUsername) {
      toast({ title: "Error", description: "Cannot submit payment. Logged in user not found.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const paymentDataToServer = {
        paymentDate: values.paymentDate,
        riderName: values.riderName,
        salaryGiverName: loggedInUsername, // Use the loggedInUsername state
        salaryAmountForPeriod: values.salaryAmountForPeriod,
        amountPaid: values.amountPaid,
        deductionAmount: values.deductionAmount || 0,
        comment: values.comment,
        recordedBy: loggedInUsername,
      };

      const result = await saveSalaryPaymentAction(paymentDataToServer);

      if (result.success) {
        toast({ title: 'Payment Recorded', description: 'Salary payment details saved successfully.', variant: 'default' });
        form.reset({
          paymentDate: new Date(),
          riderName: '',
          salaryGiverName: loggedInUsername,
          selectedYear: String(currentYear),
          selectedMonth: String(getMonth(new Date())),
          salaryAmountForPeriod: 0,
          amountPaid: 0,
          deductionAmount: 0,
          comment: '',
        });
      } else {
        toast({ title: 'Error', description: result.message || 'Failed to save salary payment.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error saving salary payment:', error);
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadSlip = () => {
    const values = getValues();
     if (!values.riderName || !values.selectedYear || !values.selectedMonth) {
        toast({
            title: "Cannot Generate Slip",
            description: "Please select a rider, year, and month to generate the slip.",
            variant: "destructive",
        });
        return;
    }
    const slipContent = `
      <html>
        <head>
          <title>Salary Slip - ${values.riderName} - ${monthNames[parseInt(values.selectedMonth)]} ${values.selectedYear}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .slip-container { border: 1px solid #ccc; padding: 20px; width: 400px; margin: auto; }
            h2 { text-align: center; color: #333; }
            .field { margin-bottom: 10px; }
            .label { font-weight: bold; color: #555; }
            .value { margin-left: 5px; }
            .footer { margin-top: 20px; text-align: center; font-size: 0.8em; color: #777; }
          </style>
        </head>
        <body>
          <div class="slip-container">
            <h2>Salary Payment Slip</h2>
            <div class="field"><span class="label">Rider Name:</span><span class="value">${values.riderName}</span></div>
            <div class="field"><span class="label">Payment Date:</span><span class="value">${formatDateFns(values.paymentDate, "PPP")}</span></div>
            <div class="field"><span class="label">Salary For:</span><span class="value">${monthNames[parseInt(values.selectedMonth)]} ${values.selectedYear}</span></div>
            <div class="field"><span class="label">Salary Giver:</span><span class="value">${values.salaryGiverName}</span></div>
            <hr/>
            <div class="field"><span class="label">Salary Amount for Period:</span><span class="value">₹${(values.salaryAmountForPeriod || 0).toFixed(2)}</span></div>
            <div class="field"><span class="label">Amount Paid:</span><span class="value">₹${(values.amountPaid || 0).toFixed(2)}</span></div>
            <div class="field"><span class="label">Deduction Amount:</span><span class="value">₹${(values.deductionAmount || 0).toFixed(2)}</span></div>
            <div class="field"><span class="label">Remaining Amount:</span><span class="value">₹${remainingAmount.toFixed(2)}</span></div>
            ${values.comment ? `<div class="field"><span class="label">Comment:</span><span class="value">${values.comment}</span></div>` : ''}
            <div class="footer">Drop Aqua Track - Payment Summary</div>
          </div>
        </body>
      </html>
    `;
    const slipWindow = window.open('', '_blank');
    slipWindow?.document.write(slipContent);
    slipWindow?.document.close();
  };

  if (!loggedInUsername) {
      return (
         <main className="min-h-screen container mx-auto px-4 py-8 flex flex-col items-center justify-center">
            <Alert variant="destructive" className="mb-4 max-w-md">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertTitle>Access Denied</AlertTitle>
              <AlertDescription>You must be logged in to make salary payments.</AlertDescription>
            </Alert>
             <Link href="/" passHref className="mt-4">
                <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/> Go to Login</Button>
            </Link>
         </main>
      )
  }

  return (
    <main className="min-h-screen container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary flex items-center">
          <Landmark className="mr-3 h-8 w-8" />
          Salary Payment Entry
        </h1>
        <Link href="/" passHref>
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Dashboard</Button>
        </Link>
      </div>

      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle>Record Salary Payment</CardTitle>
          <CardDescription>Enter the details of the salary payment. Salary for period auto-fills based on rider's performance for selected month/year.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Payment Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? formatDateFns(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="salaryGiverName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><User className="mr-2 h-4 w-4 text-primary" />Salary Giver Name (Recorded By)</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly className="bg-muted/50" />
                    </FormControl>
                    <FormDescription>This is automatically filled with your User ID.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                    control={form.control}
                    name="riderName"
                    render={({ field }) => (
                    <FormItem className="sm:col-span-1">
                        <FormLabel className="flex items-center"><User className="mr-2 h-4 w-4 text-primary" />Select Rider</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select a rider" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {riderNames.length > 0 ? (
                            riderNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)
                            ) : (
                            <SelectItem value="" disabled>No riders (manage in Admin)</SelectItem>
                            )}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="selectedYear"
                    render={({ field }) => (
                        <FormItem className="sm:col-span-1">
                            <FormLabel>For Year</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select Year" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="selectedMonth"
                    render={({ field }) => (
                        <FormItem className="sm:col-span-1">
                            <FormLabel>For Month</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select Month" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {monthNames.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
              </div>


              <FormField
                control={form.control}
                name="salaryAmountForPeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                        <IndianRupee className="mr-2 h-4 w-4 text-primary" />
                        Salary Amount for Period (₹)
                        {isFetchingSalary && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Auto-fills or enter manually"
                        {...field}
                        onChange={event => field.onChange(parseFloat(event.target.value) || 0)}
                        readOnly={isFetchingSalary}
                        className={cn(isFetchingSalary && "bg-muted/50")}
                      />
                    </FormControl>
                     <FormDescription>Auto-fills based on rider's performance for selected month/year. Can be overridden.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amountPaid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><IndianRupee className="mr-2 h-4 w-4 text-primary" />Amount Paid (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 10000"
                        {...field}
                        onChange={event => field.onChange(parseFloat(event.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>Enter the actual amount paid to the rider (can be full or partial).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deductionAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><MinusCircle className="mr-2 h-4 w-4 text-primary" />Deduction Amount (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 500"
                        {...field}
                        onChange={event => field.onChange(parseFloat(event.target.value) || 0)}
                        value={field.value ?? 0}
                      />
                    </FormControl>
                    <FormDescription>Enter any deductions (e.g., for damages, penalties). Optional.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel className="flex items-center"><IndianRupee className="mr-2 h-4 w-4 text-primary" />Remaining Amount (₹)</FormLabel>
                <Input type="text" value={`₹${remainingAmount.toFixed(2)}`} readOnly className="bg-muted/50 font-semibold" />
                <FormDescription>Calculated as: Salary Amount for Period - Amount Paid - Deduction Amount.</FormDescription>
              </FormItem>
              
              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><FileText className="mr-2 h-4 w-4 text-primary" />Comment (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Advance for May, Full payment for April" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || isFetchingSalary}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Record Payment
                </Button>
                <Button type="button" variant="outline" onClick={handleDownloadSlip} className="w-full sm:w-auto">
                  <Download className="mr-2 h-4 w-4" /> Download Slip Summary
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Drop Aqua Track. Salary Payment.</p>
      </footer>
    </main>
  );
}

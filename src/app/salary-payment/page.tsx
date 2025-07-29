
"use client";

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format as formatDateFns, getYear, getMonth } from 'date-fns';
import Link from 'next/link';
import { CalendarIcon, User, IndianRupee, FileText, Loader2, Landmark, ArrowLeft, Download, AlertCircleIcon, MinusCircle, DollarSign, RefreshCw } from 'lucide-react';

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
import type { SalaryPaymentFormValues, Rider, UserRole } from '@/lib/types';
import { salaryPaymentSchema } from '@/lib/types';
import { saveSalaryPaymentAction, getRiderMonthlyAggregatesAction, getRidersAction } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const LOGIN_SESSION_KEY = 'loginSessionDropAquaTrackApp';
const ADMIN_LOGIN_SESSION_KEY = 'adminLoginSessionDropAquaTrackApp';


const defaultCurrentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => defaultCurrentYear - i);
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function SalaryPaymentPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingSalary, setIsFetchingSalary] = useState(false);
  const { toast } = useToast();
  const [riders, setRiders] = useState<Rider[]>([]);
  const [isLoadingRiders, setIsLoadingRiders] = useState(false);
  const [loggedInUsername, setLoggedInUsername] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);


  const form = useForm<SalaryPaymentFormValues>({
    resolver: zodResolver(salaryPaymentSchema),
    defaultValues: {
      paymentDate: new Date(),
      riderName: '',
      salaryGiverName: '',
      selectedYear: String(defaultCurrentYear),
      selectedMonth: String(getMonth(new Date())),
      salaryAmountForPeriod: 0,
      amountPaid: 0,
      deductionAmount: 0,
      advancePayment: 0,
      comment: '',
    },
  });

  const { watch, setValue, getValues } = form;
  const watchedSalaryAmount = watch('salaryAmountForPeriod');
  const watchedAmountPaid = watch('amountPaid');
  const watchedDeductionAmount = watch('deductionAmount');
  const watchedAdvancePayment = watch('advancePayment');
  const watchedRiderName = watch('riderName');
  const watchedSelectedYear = watch('selectedYear');
  const watchedSelectedMonth = watch('selectedMonth');

  const remainingAmount = useMemo(() => {
    const salary = Number(watchedSalaryAmount) || 0;
    const paid = Number(watchedAmountPaid) || 0;
    const deduction = Number(watchedDeductionAmount) || 0;
    return salary - paid - deduction;
  }, [watchedSalaryAmount, watchedAmountPaid, watchedDeductionAmount]);

  const fetchRidersForDropdown = async () => {
    setIsLoadingRiders(true);
    try {
      const result = await getRidersAction();
      if (result.success && result.riders) {
        setRiders(result.riders);
      } else {
        toast({ title: "Error", description: result.message || "Failed to fetch riders for dropdown.", variant: "destructive" });
        setRiders([]);
      }
    } catch (error: any) {
      toast({ title: "Error", description: `Failed to fetch riders: ${error.message}`, variant: "destructive" });
      setRiders([]);
    } finally {
      setIsLoadingRiders(false);
    }
  };

  useEffect(() => {
    let userIsAuthenticated = false;
    let username: string | null = null;
    let role: UserRole | null = null;

    try {
      // Check Admin session first (sessionStorage)
      const adminSessionData = sessionStorage.getItem(ADMIN_LOGIN_SESSION_KEY);
      if (adminSessionData) {
        const session = JSON.parse(adminSessionData);
        if (session.isLoggedIn && session.loggedInUsername && session.currentUserRole === 'Admin') {
          userIsAuthenticated = true;
          username = session.loggedInUsername;
          role = session.currentUserRole;
        }
      }

      // If no Admin session, check TeamLeader session (localStorage)
      if (!userIsAuthenticated) {
        const teamLeaderSessionData = localStorage.getItem(LOGIN_SESSION_KEY);
        if (teamLeaderSessionData) {
          const session = JSON.parse(teamLeaderSessionData);
           if (session.isLoggedIn && session.loggedInUsername && (session.currentUserRole === 'TeamLeader' || session.currentUserRole === 'Admin')) { // Also allow admin here for robustness
            userIsAuthenticated = true;
            username = session.loggedInUsername;
            role = session.currentUserRole;
          }
        }
      }
      
      if (userIsAuthenticated && username && role) {
        setLoggedInUsername(username);
        setCurrentUserRole(role);
        setValue('salaryGiverName', username, { shouldValidate: true });
        fetchRidersForDropdown();
      } else {
        toast({ title: "Access Denied", description: "You must be logged in to access this page.", variant: "destructive" });
        setLoggedInUsername(null);
        setCurrentUserRole(null);
      }
    } catch (error) {
      console.error("Failed to parse login session", error);
      toast({ title: "Error", description: "Could not verify login status.", variant: "destructive" });
      setLoggedInUsername(null);
      setCurrentUserRole(null);
    }
  }, [setValue, toast]);

  useEffect(() => {
    const fetchAndSetSalary = async () => {
      if (loggedInUsername && watchedRiderName && watchedSelectedYear && watchedSelectedMonth) {
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
    if (loggedInUsername) { // Only fetch if user is logged in
        fetchAndSetSalary();
    }
  }, [loggedInUsername, watchedRiderName, watchedSelectedYear, watchedSelectedMonth, setValue, toast]);


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
        salaryGiverName: loggedInUsername, // Ensure this is from state
        salaryAmountForPeriod: values.salaryAmountForPeriod,
        amountPaid: values.amountPaid,
        deductionAmount: values.deductionAmount || 0,
        advancePayment: values.advancePayment || 0,
        comment: values.comment,
        recordedBy: loggedInUsername, // Ensure this is from state
      };

      const result = await saveSalaryPaymentAction(paymentDataToServer);

      if (result.success) {
        toast({ title: 'Payment Recorded', description: 'Salary payment details saved successfully.', variant: 'default' });
        form.reset({
          paymentDate: new Date(),
          riderName: '',
          salaryGiverName: loggedInUsername, // Reset with current username
          selectedYear: String(defaultCurrentYear),
          selectedMonth: String(getMonth(new Date())),
          salaryAmountForPeriod: 0,
          amountPaid: 0,
          deductionAmount: 0,
          advancePayment: 0,
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
            <div class="field"><span class="label">Amount Paid (This Period):</span><span class="value">₹${(values.amountPaid || 0).toFixed(2)}</span></div>
            <div class="field"><span class="label">Deduction Amount:</span><span class="value">₹${(values.deductionAmount || 0).toFixed(2)}</span></div>
            <div class="field"><span class="label">Advance Payment (Given Now):</span><span class="value">₹${(values.advancePayment || 0).toFixed(2)}</span></div>
            <div class="field"><span class="label">Remaining Salary (This Period):</span><span class="value">₹${remainingAmount.toFixed(2)}</span></div>
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

  if (!loggedInUsername && !isLoadingRiders) { // Ensure not to show this if riders are just loading
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
  
  if (isLoadingRiders && !loggedInUsername) { // Show loader if session check is pending and might grant access
    return (
      <main className="min-h-screen container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Verifying access and loading data...</p>
      </main>
    );
  }


  return (
    <main className="min-h-screen container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center">
          <Landmark className="mr-3 h-8 w-8" />
          Salary Payment Entry
        </h1>
        <Link href="/" passHref>
          <Button variant="outline" className="w-full sm:w-auto"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Dashboard</Button>
        </Link>
      </div>
       {currentUserRole && <p className="text-sm text-muted-foreground mb-4">Logged in as: {loggedInUsername} (Role: {currentUserRole})</p>}


      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Record Salary Payment</CardTitle>
              <CardDescription>Enter the details of the salary payment. Salary for period auto-fills based on rider's performance for selected month/year.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchRidersForDropdown} disabled={isLoadingRiders}>
                <RefreshCw className={cn("h-4 w-4", isLoadingRiders && "animate-spin")} />
            </Button>
          </div>
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
                        <Select onValueChange={field.onChange} value={field.value || ""} disabled={isLoadingRiders || riders.length === 0}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select a rider" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {isLoadingRiders ? <SelectItem value="loading_placeholder_riders" disabled>Loading riders...</SelectItem> :
                            riders.length > 0 ? (
                            riders.map(r => <SelectItem key={r._id} value={r.name}>{r.name}</SelectItem>)
                            ) : (
                            <SelectItem value="no_riders_placeholder" disabled>No riders available</SelectItem>
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
                    <FormLabel className="flex items-center"><IndianRupee className="mr-2 h-4 w-4 text-primary" />Amount Paid (for current salary period) (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 10000"
                        {...field}
                        onChange={event => field.onChange(parseFloat(event.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>Enter the actual amount paid to the rider towards this period's salary.</FormDescription>
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

              <FormField
                control={form.control}
                name="advancePayment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><DollarSign className="mr-2 h-4 w-4 text-primary" />Advance Payment (Given Now) (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 2000"
                        {...field}
                        onChange={event => field.onChange(parseFloat(event.target.value) || 0)}
                        value={field.value ?? 0}
                      />
                    </FormControl>
                    <FormDescription>Enter any advance given to the rider in this transaction (for future salary). Optional.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel className="flex items-center"><IndianRupee className="mr-2 h-4 w-4 text-primary" />Remaining Salary (This Period) (₹)</FormLabel>
                <Input type="text" value={`₹${remainingAmount.toFixed(2)}`} readOnly className="bg-muted/50 font-semibold" />
                <FormDescription>Calculated as: Salary Amount for Period - Amount Paid (for this period) - Deduction Amount.</FormDescription>
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
                <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || isFetchingSalary || isLoadingRiders}>
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

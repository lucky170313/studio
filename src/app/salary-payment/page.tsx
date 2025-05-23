
"use client";

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format as formatDateFns } from 'date-fns';
import Link from 'next/link';
import { CalendarIcon, User, IndianRupee, FileText, Loader2, Landmark, ArrowLeft, Download } from 'lucide-react';

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
import type { SalaryPaymentFormValues, UserRole } from '@/lib/types';
import { salaryPaymentSchema } from '@/lib/types';
import { saveSalaryPaymentAction } from '@/app/actions';

const RIDER_NAMES_KEY = 'riderNamesDropAquaTrackApp';
const LOGIN_SESSION_KEY = 'loginSessionDropAquaTrackApp';

export default function SalaryPaymentPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [riderNames, setRiderNames] = useState<string[]>([]);
  const [loggedInUsername, setLoggedInUsername] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);

  const form = useForm<SalaryPaymentFormValues>({
    resolver: zodResolver(salaryPaymentSchema),
    defaultValues: {
      paymentDate: new Date(),
      riderName: '',
      salaryGiverName: '', // Will be auto-filled
      salaryAmountForPeriod: 0,
      amountPaid: 0,
      comment: '',
    },
  });

  const { watch, setValue } = form;
  const watchedSalaryAmount = watch('salaryAmountForPeriod');
  const watchedAmountPaid = watch('amountPaid');

  const remainingAmount = useMemo(() => {
    const salary = Number(watchedSalaryAmount) || 0;
    const paid = Number(watchedAmountPaid) || 0;
    return salary - paid;
  }, [watchedSalaryAmount, watchedAmountPaid]);

  useEffect(() => {
    // Load rider names from localStorage
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

    // Load logged-in user from localStorage
    try {
      const storedSession = localStorage.getItem(LOGIN_SESSION_KEY);
      if (storedSession) {
        const session = JSON.parse(storedSession);
        if (session.isLoggedIn && session.loggedInUsername && session.currentUserRole) {
          setLoggedInUsername(session.loggedInUsername);
          setCurrentUserRole(session.currentUserRole);
          setValue('salaryGiverName', session.loggedInUsername, { shouldValidate: true });
        } else {
          // Redirect or show error if not logged in
          toast({ title: "Access Denied", description: "You must be logged in to access this page.", variant: "destructive" });
          // Consider redirecting: router.push('/');
        }
      } else {
         toast({ title: "Access Denied", description: "You must be logged in to access this page.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Failed to parse login session from localStorage", error);
       toast({ title: "Error", description: "Could not verify login status.", variant: "destructive" });
    }
  }, [setValue, toast]);


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
        salaryGiverName: loggedInUsername, // Ensure this is the loggedInUsername
        salaryAmountForPeriod: values.salaryAmountForPeriod,
        amountPaid: values.amountPaid,
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
          salaryAmountForPeriod: 0,
          amountPaid: 0,
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
    // Placeholder for slip download functionality
    toast({ title: "Feature Not Implemented", description: "Downloading salary slips will be available soon." });
  };

  if (!loggedInUsername) {
      return (
         <main className="min-h-screen container mx-auto px-4 py-8 flex flex-col items-center justify-center">
            <p className="text-lg text-destructive">You must be logged in to make salary payments.</p>
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
          <CardDescription>Enter the details of the salary payment made to a rider.</CardDescription>
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

              <FormField
                control={form.control}
                name="riderName"
                render={({ field }) => (
                  <FormItem>
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
                          <SelectItem value="" disabled>No riders available (manage in Admin panel)</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="salaryAmountForPeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><IndianRupee className="mr-2 h-4 w-4 text-primary" />Salary Amount for Period (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 15000"
                        {...field}
                        onChange={event => field.onChange(parseFloat(event.target.value) || 0)}
                      />
                    </FormControl>
                     <FormDescription>Enter the total salary being considered for this payment period.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amountPaid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><IndianRupee className="mr-2 h-4 w-4 text-primary" />Amount Given (₹)</FormLabel>
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

              <FormItem>
                <FormLabel className="flex items-center"><IndianRupee className="mr-2 h-4 w-4 text-primary" />Remaining Amount (₹)</FormLabel>
                <Input type="text" value={`₹${remainingAmount.toFixed(2)}`} readOnly className="bg-muted/50 font-semibold" />
                <FormDescription>Calculated as: Salary Amount for Period - Amount Given.</FormDescription>
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
                <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Record Payment
                </Button>
                <Button type="button" variant="outline" onClick={handleDownloadSlip} className="w-full sm:w-auto">
                  <Download className="mr-2 h-4 w-4" /> Download Slip (Placeholder)
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

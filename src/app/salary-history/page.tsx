
"use client";

import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import type { SalaryPaymentData, Rider } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, AlertCircle, History, CalendarDays, User, IndianRupee, FileSpreadsheet, Users, MinusCircle, DollarSign, RefreshCw } from 'lucide-react';
import { format as formatDateFns, getYear, getMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import { getSalaryPaymentsAction, getRidersAction } from '@/app/actions';
import { cn } from '@/lib/utils';

const LOGIN_SESSION_KEY = 'loginSessionDropAquaTrackApp';
const ADMIN_LOGIN_SESSION_KEY = 'adminLoginSessionDropAquaTrackApp';

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function SalaryHistoryPage() {
  const [allPayments, setAllPayments] = useState<SalaryPaymentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRiders, setIsLoadingRiders] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const [selectedRiderName, setSelectedRiderName] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const [availableRiders, setAvailableRiders] = useState<Rider[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    setIsLoadingRiders(true);
    let userIsAuthenticated = false;
    let role = null;

    try {
      const adminSessionData = sessionStorage.getItem(ADMIN_LOGIN_SESSION_KEY);
      if (adminSessionData) {
        const session = JSON.parse(adminSessionData);
        if (session.isLoggedIn && session.currentUserRole === 'Admin') {
          userIsAuthenticated = true;
          role = session.currentUserRole;
        }
      }

      if (!userIsAuthenticated) {
        const teamLeaderSessionData = localStorage.getItem(LOGIN_SESSION_KEY);
        if (teamLeaderSessionData) {
          const session = JSON.parse(teamLeaderSessionData);
          if (session.isLoggedIn && (session.currentUserRole === 'TeamLeader' || session.currentUserRole === 'Admin')) { // Allow Admin if somehow in localStorage
            userIsAuthenticated = true;
            role = session.currentUserRole;
          }
        }
      }
      
      setIsLoggedIn(userIsAuthenticated);
      setCurrentUserRole(role);

      if (userIsAuthenticated) {
        const [paymentsResult, ridersResult] = await Promise.all([
          getSalaryPaymentsAction(),
          getRidersAction()
        ]);

        if (paymentsResult.success && paymentsResult.payments) {
          const paymentsWithDateObjects = paymentsResult.payments.map(p => ({
            ...p,
            paymentDate: new Date(p.paymentDate)
          }));
          setAllPayments(paymentsWithDateObjects);
          if (paymentsWithDateObjects.length > 0) {
            const years = Array.from(new Set(paymentsWithDateObjects.map(p => getYear(p.paymentDate)))).sort((a, b) => b - a);
            setAvailableYears(years);
          }
        } else {
          setError(paymentsResult.message || "Failed to fetch salary payments.");
          setAllPayments([]);
        }

        if (ridersResult.success && ridersResult.riders) {
          setAvailableRiders(ridersResult.riders);
        } else {
          setError(prevError => prevError ? `${prevError} ${ridersResult.message}` : ridersResult.message || "Failed to fetch riders.");
          setAvailableRiders([]);
        }

      } else {
        // Not logged in, clear data
        setAllPayments([]);
        setAvailableRiders([]);
      }
    } catch (err: any) {
      console.error("Error fetching initial data:", err);
      setError(err.message || "Failed to load page data.");
      setAllPayments([]);
      setAvailableRiders([]);
      setIsLoggedIn(false); // Ensure logged out state on error
    } finally {
      setIsLoading(false);
      setIsLoadingRiders(false);
    }
  };
  
  useEffect(() => {
    fetchInitialData();
  }, []);


  const filteredPayments = useMemo(() => {
    return allPayments.filter(payment => {
      const paymentDateObj = payment.paymentDate;
      const riderMatch = selectedRiderName === "all" || payment.riderName === selectedRiderName;
      const yearMatch = selectedYear === "all" || getYear(paymentDateObj) === parseInt(selectedYear);
      const monthMatch = selectedMonth === "all" || getMonth(paymentDateObj) === parseInt(selectedMonth);
      return riderMatch && yearMatch && monthMatch;
    }).sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime());
  }, [allPayments, selectedRiderName, selectedYear, selectedMonth]);

  const totalAmountPaidFiltered = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + p.amountPaid, 0);
  }, [filteredPayments]);
  
  const totalDeductionsFiltered = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + (p.deductionAmount || 0), 0);
  }, [filteredPayments]);

  const totalAdvancePaidFiltered = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + (p.advancePayment || 0), 0);
  }, [filteredPayments]);


  const handleExcelExport = () => {
    if (filteredPayments.length === 0) {
      alert("No data available to export for the current selection.");
      return;
    }
    const dataToExport = filteredPayments.map(p => ({
      "Payment ID": p._id,
      "Payment Date": formatDateFns(p.paymentDate, "yyyy-MM-dd"),
      "Rider Name": p.riderName,
      "Salary Giver": p.salaryGiverName,
      "Salary Amount for Period (₹)": p.salaryAmountForPeriod.toFixed(2),
      "Amount Paid (₹)": p.amountPaid.toFixed(2),
      "Deduction Amount (₹)": (p.deductionAmount || 0).toFixed(2),
      "Advance Paid (₹)": (p.advancePayment || 0).toFixed(2),
      "Remaining Amount (₹)": p.remainingAmount.toFixed(2),
      "Comment": p.comment || "",
      "Recorded By": p.recordedBy,
      "Record Created At": p.createdAt ? formatDateFns(new Date(p.createdAt), "yyyy-MM-dd HH:mm") : "",
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Salary Payments");
    XLSX.writeFile(wb, `SalaryPaymentHistory_DropAquaTrack_${formatDateFns(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  if (!isLoggedIn && !isLoading) { 
    return (
       <main className="min-h-screen container mx-auto px-4 py-8 flex flex-col items-center justify-center">
          <p className="text-lg text-destructive">You must be logged in to view salary payment history.</p>
           <Link href="/" passHref className="mt-4">
              <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/> Go to Login</Button>
          </Link>
       </main>
    );
  }

  if (isLoading) {
    return (
      <main className="min-h-screen container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading salary payment history...</p>
      </main>
    );
  }

  if (error && !isLoading) { 
    return (
      <main className="min-h-screen container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg text-destructive mb-4">{error}</p>
        <Link href="/" passHref>
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center">
          <History className="mr-3 h-8 w-8" />
          Salary Payment History
        </h1>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExcelExport} className="w-full sm:w-auto">
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Download as Excel
          </Button>
          <Link href="/" passHref>
            <Button variant="outline" className="w-full sm:w-auto"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Button>
          </Link>
        </div>
      </div>
      { currentUserRole && <p className="text-sm text-muted-foreground mb-4">Logged in as: {currentUserRole}</p> }

      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
              <CardTitle>Filters</CardTitle>
              <Button variant="ghost" size="sm" onClick={fetchInitialData} disabled={isLoading || isLoadingRiders}>
                  <RefreshCw className={cn("h-4 w-4", (isLoading || isLoadingRiders) && "animate-spin")} />
              </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="rider-filter">Filter by Rider</Label>
            <Select value={selectedRiderName} onValueChange={setSelectedRiderName} disabled={isLoadingRiders}>
              <SelectTrigger id="rider-filter"><SelectValue placeholder="Select Rider" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Riders</SelectItem>
                {availableRiders.map(rider => <SelectItem key={rider._id} value={rider.name}>{rider.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="year-filter">Filter by Year</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger id="year-filter"><SelectValue placeholder="Select Year" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="month-filter">Filter by Month</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger id="month-filter"><SelectValue placeholder="Select Month" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {monthNames.map((month, index) => <SelectItem key={index} value={String(index)}>{month}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Payment Records</CardTitle>
          <CardDescription>
            Displaying {filteredPayments.length} of {allPayments.length} total payment records based on filters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No salary payment records found for the selected filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><CalendarDays className="inline-block mr-1 h-4 w-4"/>Payment Date</TableHead>
                    <TableHead><User className="inline-block mr-1 h-4 w-4"/>Rider Name</TableHead>
                    <TableHead><Users className="inline-block mr-1 h-4 w-4"/>Salary Giver</TableHead>
                    <TableHead className="text-right"><IndianRupee className="inline-block mr-1 h-4 w-4"/>Salary For Period (₹)</TableHead>
                    <TableHead className="text-right"><IndianRupee className="inline-block mr-1 h-4 w-4"/>Amount Paid (₹)</TableHead>
                    <TableHead className="text-right"><MinusCircle className="inline-block mr-1 h-4 w-4"/>Deduction (₹)</TableHead>
                    <TableHead className="text-right"><DollarSign className="inline-block mr-1 h-4 w-4"/>Advance Paid (₹)</TableHead>
                    <TableHead className="text-right"><IndianRupee className="inline-block mr-1 h-4 w-4"/>Remaining (₹)</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Recorded By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment._id}>
                      <TableCell className="whitespace-nowrap">{formatDateFns(payment.paymentDate, "dd-MMM-yyyy")}</TableCell>
                      <TableCell>{payment.riderName}</TableCell>
                      <TableCell>{payment.salaryGiverName}</TableCell>
                      <TableCell className="text-right">₹{payment.salaryAmountForPeriod.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">₹{payment.amountPaid.toFixed(2)}</TableCell>
                      <TableCell className="text-right">₹{(payment.deductionAmount || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right">₹{(payment.advancePayment || 0).toFixed(2)}</TableCell>
                      <TableCell className={`text-right ${payment.remainingAmount > 0 ? 'text-orange-600' : payment.remainingAmount < 0 ? 'text-green-600' : ''}`}>
                        ₹{payment.remainingAmount.toFixed(2)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={payment.comment}>{payment.comment || "-"}</TableCell>
                      <TableCell>{payment.recordedBy}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={4}>Totals for Filtered Payments:</TableCell>
                    <TableCell className="text-right text-lg">₹{totalAmountPaidFiltered.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-lg">₹{totalDeductionsFiltered.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-lg">₹{totalAdvancePaidFiltered.toFixed(2)}</TableCell>
                    <TableCell colSpan={3}></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Drop Aqua Track. Salary Payment History.</p>
      </footer>
    </main>
  );
}

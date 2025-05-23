
"use client";

import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import type { SalaryPaymentData, UserRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, AlertCircle, History, CalendarDays, User, IndianRupee, FileSpreadsheet, Users } from 'lucide-react';
import { format as formatDateFns, getYear, getMonth, parse } from 'date-fns';
import * as XLSX from 'xlsx';
import { getSalaryPaymentsAction } from '@/app/actions';

const RIDER_NAMES_KEY = 'riderNamesDropAquaTrackApp';
const LOGIN_SESSION_KEY = 'loginSessionDropAquaTrackApp'; // To check if user is logged in

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function SalaryHistoryPage() {
  const [allPayments, setAllPayments] = useState<SalaryPaymentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Basic check

  const [selectedRider, setSelectedRider] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const [availableRiders, setAvailableRiders] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    // Check login status
    const storedSession = localStorage.getItem(LOGIN_SESSION_KEY);
    if (storedSession) {
      const session = JSON.parse(storedSession);
      if (session.isLoggedIn) {
        setIsLoggedIn(true);
      }
    }

    // Load rider names for filter dropdown
    try {
      const storedRiderNames = localStorage.getItem(RIDER_NAMES_KEY);
      if (storedRiderNames) {
        setAvailableRiders(JSON.parse(storedRiderNames));
      }
    } catch (e) { console.error("Failed to load rider names for filter", e); }

    // Fetch salary payments
    setIsLoading(true);
    getSalaryPaymentsAction()
      .then(result => {
        if (result.success && result.payments) {
          const paymentsWithDateObjects = result.payments.map(p => ({
            ...p,
            paymentDate: new Date(p.paymentDate) // Ensure paymentDate is a Date object
          }));
          setAllPayments(paymentsWithDateObjects);
          if (paymentsWithDateObjects.length > 0) {
            const years = Array.from(new Set(paymentsWithDateObjects.map(p => getYear(p.paymentDate)))).sort((a, b) => b - a);
            setAvailableYears(years);
          }
          setError(null);
        } else {
          setError(result.message || "Failed to fetch salary payments.");
          setAllPayments([]);
        }
      })
      .catch(err => {
        console.error("Error fetching salary payments:", err);
        setError(err.message || "Failed to load salary payments.");
        setAllPayments([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const filteredPayments = useMemo(() => {
    return allPayments.filter(payment => {
      const paymentDateObj = payment.paymentDate; // Already a Date object
      const riderMatch = selectedRider === "all" || payment.riderName === selectedRider;
      const yearMatch = selectedYear === "all" || getYear(paymentDateObj) === parseInt(selectedYear);
      const monthMatch = selectedMonth === "all" || getMonth(paymentDateObj) === parseInt(selectedMonth);
      return riderMatch && yearMatch && monthMatch;
    }).sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime()); // Sort by most recent first
  }, [allPayments, selectedRider, selectedYear, selectedMonth]);

  const totalAmountPaidFiltered = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + p.amountPaid, 0);
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

  if (!isLoggedIn) {
    return (
       <main className="min-h-screen container mx-auto px-4 py-8 flex flex-col items-center justify-center">
          <p className="text-lg text-destructive">You must be logged in to view salary payment history.</p>
           <Link href="/" passHref className="mt-4">
              <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/> Go to Login</Button>
          </Link>
       </main>
    )
  }

  if (isLoading) {
    return (
      <main className="min-h-screen container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading salary payment history...</p>
      </main>
    );
  }

  if (error) {
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary flex items-center">
          <History className="mr-3 h-8 w-8" />
          Salary Payment History
        </h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleExcelExport}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Download as Excel
          </Button>
          <Link href="/" passHref>
            <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Button>
          </Link>
        </div>
      </div>

      <Card className="mb-8 shadow-lg">
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="rider-filter">Filter by Rider</Label>
            <Select value={selectedRider} onValueChange={setSelectedRider}>
              <SelectTrigger id="rider-filter"><SelectValue placeholder="Select Rider" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Riders</SelectItem>
                {availableRiders.map(rider => <SelectItem key={rider} value={rider}>{rider}</SelectItem>)}
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
                    <TableCell colSpan={4}>Total for Filtered Payments:</TableCell>
                    <TableCell className="text-right text-lg">₹{totalAmountPaidFiltered.toFixed(2)}</TableCell>
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


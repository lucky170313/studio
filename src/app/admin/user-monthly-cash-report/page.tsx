
"use client";

import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import type { SalesReportData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, AlertCircle, Users, CalendarDays, IndianRupee, FileSpreadsheet } from 'lucide-react';
import { format as formatDateFns, getYear, getMonth, parse, format } from 'date-fns';
import * as XLSX from 'xlsx';

interface UserMonthlyCashStats {
  totalCashReceived: number;
}

interface UserMonthlyData {
  [userName: string]: { 
    [monthYear: string]: UserMonthlyCashStats;
  };
}

interface AggregatedReportData {
  userData: UserMonthlyData;
}

const formatDisplayDateToMonthYear = (dateInput: any): string => {
  if (!dateInput) return 'Invalid Date';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  return formatDateFns(date, 'MMMM yyyy');
};

async function fetchSalesDataForReport(): Promise<SalesReportData[]> {
  const response = await fetch('/api/sales-reports');
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to fetch sales data for report');
  }
  const data = await response.json();
  return data.map((entry: any) => ({
    ...entry,
    firestoreDate: new Date(entry.firestoreDate),
  }));
}

const handleExcelExport = (sheetsData: Array<{data: any[], sheetName: string}>, fileName: string) => {
  if (sheetsData.every(sheet => sheet.data.length === 0)) {
    alert("No data available to export for the current selection.");
    return;
  }
  const wb = XLSX.utils.book_new();
  sheetsData.forEach(sheetInfo => {
    if (sheetInfo.data.length > 0) {
      const ws = XLSX.utils.json_to_sheet(sheetInfo.data);
      XLSX.utils.book_append_sheet(wb, ws, sheetInfo.sheetName);
    }
  });
  if (wb.SheetNames.length > 0) {
    XLSX.writeFile(wb, `${fileName}_${formatDateFns(new Date(), 'yyyy-MM-dd')}.xlsx`);
  } else {
    alert("No data available to export for the current selection.");
  }
};

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function CollectorMonthlyCashReportPage() { 
  const [allSalesEntries, setAllSalesEntries] = useState<SalesReportData[]>([]);
  const [reportData, setReportData] = useState<AggregatedReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportGeneratedTimestamp, setReportGeneratedTimestamp] = useState<string>('');

  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    setIsLoading(true);
    setReportGeneratedTimestamp(formatDateFns(new Date(), 'PPP p'));
    fetchSalesDataForReport()
      .then(fetchedEntries => {
        setAllSalesEntries(fetchedEntries);
        if (fetchedEntries.length > 0) {
           const years = Array.from(new Set(fetchedEntries.map(entry => getYear(new Date(entry.firestoreDate))))).sort((a,b) => b-a);
           setAvailableYears(years);
        }
        setError(null);
      })
      .catch(err => {
        console.error("Error fetching sales data for collector's cash report:", err);
        setError(err.message || 'Failed to load sales entries.');
        setReportData(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const filteredEntries = useMemo(() => {
    if (isLoading || allSalesEntries.length === 0) return [];
    return allSalesEntries.filter(entry => {
        const entryDate = new Date(entry.firestoreDate);
        const yearMatch = selectedYear === "all" || getYear(entryDate) === parseInt(selectedYear);
        const monthMatch = selectedMonth === "all" || getMonth(entryDate) === parseInt(selectedMonth);
        return yearMatch && monthMatch;
    });
  }, [allSalesEntries, selectedYear, selectedMonth, isLoading]);

  useEffect(() => {
    if (isLoading && allSalesEntries.length > 0) return;
    if (allSalesEntries.length === 0 && !isLoading) {
        setReportData({ userData: {} });
        return;
    }

    const userMonthlyCashData: UserMonthlyData = {};

    filteredEntries.forEach(entry => {
      const user = entry.recordedBy; 
      const entryDate = new Date(entry.firestoreDate);
      const monthYear = formatDisplayDateToMonthYear(entryDate);

      if (!userMonthlyCashData[user]) {
        userMonthlyCashData[user] = {};
      }
      if (!userMonthlyCashData[user][monthYear]) {
        userMonthlyCashData[user][monthYear] = {
          totalCashReceived: 0,
        };
      }
      userMonthlyCashData[user][monthYear].totalCashReceived += entry.cashReceived || 0;
    });

    setReportData({ userData: userMonthlyCashData });
    setError(null);

  }, [filteredEntries, isLoading, allSalesEntries]);

  const exportCurrentReportData = () => {
    const sheetsToExport = [];
    const exportableData: any[] = [];

    if (reportData?.userData) {
        Object.entries(reportData.userData).forEach(([userName, monthlyData]) => {
            Object.entries(monthlyData).forEach(([monthYear, stats]) => {
                exportableData.push({
                    "Collector (User ID)": userName,
                    "Month-Year": monthYear,
                    "Total Cash Received (₹)": stats.totalCashReceived.toFixed(2)
                });
            });
        });
    }
    
    if (exportableData.length > 0) {
        sheetsToExport.push({data: exportableData, sheetName: "Collector Monthly Cash Received"});
    }
    
    handleExcelExport(sheetsToExport, "CollectorMonthlyCashReport_DropAquaTrack");
  };

  if (isLoading && !reportData) {
    return (
      <main className="min-h-screen container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Generating collector's cash report...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg text-destructive mb-4">{error}</p>
        <Link href="/" passHref>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back to Home
          </Button>
        </Link>
      </main>
    );
  }

  const noDataMessage = selectedYear !== "all" || selectedMonth !== "all"
    ? "No sales data found for the selected filters."
    : "No sales data found to generate the report.";

  const mainContent = () => {
    if (!reportData || (Object.keys(reportData.userData).length === 0 && filteredEntries.length === 0 && !isLoading) ) {
         return <p className="text-muted-foreground text-center py-10">{noDataMessage}</p>;
    }

    const sortedUserNames = Object.keys(reportData.userData).sort();

    return (
      <div className="space-y-8">
        {sortedUserNames.map(userName => {
          const userMonths = Object.entries(reportData.userData[userName])
            .sort(([monthYearA], [monthYearB]) => {
                const parseMonthYearToDate = (my: string) => parse(my, 'MMMM yyyy', new Date());
                return parseMonthYearToDate(monthYearA).getTime() - parseMonthYearToDate(monthYearB).getTime();
            });

          if (userMonths.length === 0) return null;

          return (
            <Card key={userName} className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-6 w-6 text-primary" />
                  Collector: {userName}
                </CardTitle>
                <CardDescription>Monthly cash collection report for {userName} (Admin/Team Leader who recorded entries).</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead><CalendarDays className="inline-block mr-1 h-4 w-4"/>Month-Year</TableHead>
                      <TableHead className="text-right"><IndianRupee className="inline-block mr-1 h-4 w-4"/>Total Cash Received</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userMonths.map(([monthYear, stats]) => (
                      <TableRow key={monthYear}>
                        <TableCell className="font-medium">{monthYear}</TableCell>
                        <TableCell className="text-right font-semibold">₹{stats.totalCashReceived.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <main className="min-h-screen container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary flex items-center">
          <Users className="mr-3 h-8 w-8" />
          Collector's Monthly Cash Report
        </h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={exportCurrentReportData}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Download as Excel
          </Button>
          <Link href="/" passHref>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
      <CardDescription className="mb-6">Report Generated: {reportGeneratedTimestamp}</CardDescription>


      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="year-filter">Filter by Year</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger id="year-filter">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label htmlFor="month-filter">Filter by Month</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger id="month-filter">
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {monthNames.map((month, index) => (
                  <SelectItem key={index} value={String(index)}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {mainContent()}

       <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Drop Aqua Track. Collector's Monthly Cash Report.</p>
        <p className="text-xs mt-1">Note: 'Collector' in this report refers to the User ID (Admin/Team Leader) who recorded the sales entries.</p>
      </footer>
    </main>
  );
}

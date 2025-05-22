
"use client";

import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import type { SalesReportData } from '@/lib/types'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, AlertCircle, PieChart, CalendarDays, User, Droplets, IndianRupee, FileSpreadsheet, Wallet } from 'lucide-react';
import { format as formatDateFns, getYear, getMonth } from 'date-fns';

const RIDER_SALARIES_KEY = 'riderSalariesAquaTrackApp'; 

interface MonthlyRiderStats {
  totalLitersSold: number;
  totalMoneyCollected: number; 
  totalTokenMoney: number;
  daysActive: number;
  calculatedSalary: number; 
}

interface RiderMonthlyData {
  [riderName: string]: {
    [monthYear: string]: MonthlyRiderStats;
  };
}

interface AggregatedReportData {
  riderData: RiderMonthlyData;
  overallDailyAverageCollection: number;
}

const formatDisplayDateToMonthYear = (dateInput: any): string => {
  if (!dateInput) return 'Invalid Date';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  return formatDateFns(date, 'MMMM yyyy');
};

const formatDisplayDateToDayKey = (dateInput: any): string => {
    if (!dateInput) return 'Invalid Date Key';
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(date.getTime())) {
      return 'Invalid Date Key';
    }
    return formatDateFns(date, 'yyyy-MM-dd');
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
    firestoreDate: new Date(entry.firestoreDate) 
  }));
}

const monthNames = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

export default function RiderMonthlyReportPage() {
  const [allSalesEntries, setAllSalesEntries] = useState<SalesReportData[]>([]);
  const [reportData, setReportData] = useState<AggregatedReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riderSalaries, setRiderSalaries] = useState<Record<string, number>>({});

  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [availableYears, setAvailableYears] = useState<number[]>([]);


  useEffect(() => {
    try {
      const storedSalaries = localStorage.getItem(RIDER_SALARIES_KEY);
      if (storedSalaries) {
        const parsedSalaries = JSON.parse(storedSalaries);
        if (typeof parsedSalaries === 'object' && parsedSalaries !== null) {
           if (JSON.stringify(riderSalaries) !== JSON.stringify(parsedSalaries)) { 
            setRiderSalaries(parsedSalaries);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load rider salaries from localStorage", e);
    }
  }, []); 


  useEffect(() => {
    setIsLoading(true);
    fetchSalesDataForReport()
      .then(fetchedEntries => {
        setAllSalesEntries(fetchedEntries);
        if (fetchedEntries.length > 0) {
           const years = Array.from(new Set(fetchedEntries.map(entry => getYear(new Date(entry.firestoreDate))))).sort((a,b) => b-a);
           setAvailableYears(years);
        }
        setError(null); // Clear previous errors
      })
      .catch(err => {
        console.error("Error fetching sales data for monthly report:", err);
        setError(err.message || 'Failed to load sales entries from MongoDB.');
        setReportData(null); // Clear previous report data on error
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []); // Fetch all sales data once on mount


  useEffect(() => {
    if (allSalesEntries.length === 0 && !isLoading) { // If no entries or still loading, don't process
      setReportData({ riderData: {}, overallDailyAverageCollection: 0 });
      return;
    }
    if (isLoading) return; // Wait for initial data fetch

    const entriesToProcess = allSalesEntries.filter(entry => {
        const entryDate = new Date(entry.firestoreDate);
        const yearMatch = selectedYear === "all" || getYear(entryDate) === parseInt(selectedYear);
        const monthMatch = selectedMonth === "all" || getMonth(entryDate) === parseInt(selectedMonth);
        return yearMatch && monthMatch;
    });


    if (entriesToProcess.length === 0) {
      setReportData({ riderData: {}, overallDailyAverageCollection: 0 });
      return;
    }

    const riderMonthlyData: RiderMonthlyData = {};
    let totalCollectionAcrossAllDays = 0;
    const uniqueDaysWithEntries = new Set<string>();

    entriesToProcess.forEach(entry => {
      const rider = entry.riderName;
      const monthYear = formatDisplayDateToMonthYear(entry.firestoreDate);
      const dayKey = formatDisplayDateToDayKey(entry.firestoreDate);

      if (!riderMonthlyData[rider]) {
        riderMonthlyData[rider] = {};
      }
      if (!riderMonthlyData[rider][monthYear]) {
        riderMonthlyData[rider][monthYear] = {
          totalLitersSold: 0,
          totalMoneyCollected: 0,
          totalTokenMoney: 0,
          daysActive: 0,
          calculatedSalary: 0,
        };
      }

      riderMonthlyData[rider][monthYear].totalLitersSold += entry.litersSold;
      const actualReceived = typeof entry.actualReceived === 'number' ? entry.actualReceived : 0;
      riderMonthlyData[rider][monthYear].totalMoneyCollected += actualReceived; 
      riderMonthlyData[rider][monthYear].totalTokenMoney += entry.tokenMoney || 0;
      
      totalCollectionAcrossAllDays += actualReceived;
      uniqueDaysWithEntries.add(dayKey);
    });
    
    Object.keys(riderMonthlyData).forEach(rider => {
        Object.keys(riderMonthlyData[rider]).forEach(monthYear => {
            const monthlyEntriesForRider = entriesToProcess.filter(
                entry => entry.riderName === rider && formatDisplayDateToMonthYear(entry.firestoreDate) === monthYear
            );
            const uniqueDaysForRiderInMonth = new Set(monthlyEntriesForRider.map(e => formatDisplayDateToDayKey(e.firestoreDate)));
            const daysActive = uniqueDaysForRiderInMonth.size;
            riderMonthlyData[rider][monthYear].daysActive = daysActive;

            const perDaySalary = riderSalaries[rider] || 0;
            riderMonthlyData[rider][monthYear].calculatedSalary = perDaySalary * daysActive;
        });
    });

    const overallDailyAverageCollection = uniqueDaysWithEntries.size > 0
      ? totalCollectionAcrossAllDays / uniqueDaysWithEntries.size
      : 0;

    setReportData({ riderData: riderMonthlyData, overallDailyAverageCollection });
    setError(null);

  }, [allSalesEntries, riderSalaries, selectedYear, selectedMonth, isLoading]);


  if (isLoading && !reportData) { // Show loading only if reportData is not yet available
    return (
      <main className="min-h-screen container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Generating report from MongoDB...</p>
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
    : "No sales data found in MongoDB to generate the report.";

  if (!reportData || Object.keys(reportData.riderData).length === 0) {
    return (
      <main className="min-h-screen container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-primary">Rider Monthly Performance (MongoDB)</h1>
           <div className="flex space-x-2">
            <Button variant="outline" onClick={() => alert("Google Sheets export functionality to be implemented.")}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Export to Google Sheets
            </Button>
            <Link href="/" passHref>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
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
        <p className="text-muted-foreground text-center py-10">{noDataMessage}</p>
      </main>
    );
  }

  const sortedRiderNames = Object.keys(reportData.riderData).sort();

  return (
    <main className="min-h-screen container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary flex items-center">
          <PieChart className="mr-3 h-8 w-8" />
          Rider Monthly Performance (MongoDB)
        </h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => alert("Google Sheets export functionality to be implemented.")}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export to Google Sheets
          </Button>
          <Link href="/" passHref>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>

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

      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <CardTitle>Overall Daily Average Collection</CardTitle>
          <CardDescription>
            Average amount collected per day across all riders and entries based on current filters:
            {selectedMonth === "all" ? " all months" : ` ${monthNames[parseInt(selectedMonth)]}`}
            {selectedYear === "all" ? "" : ` in ${selectedYear}`}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-primary">
            ₹{reportData.overallDailyAverageCollection.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      <div className="space-y-8">
        {sortedRiderNames.map(riderName => {
          const riderMonths = Object.entries(reportData.riderData[riderName])
            .sort(([monthYearA], [monthYearB]) => {
                // Robust date parsing for sorting
                const parseMonthYear = (my: string) => {
                    const parts = my.split(" ");
                    if (parts.length === 2) {
                        const monthIndex = monthNames.indexOf(parts[0]);
                        if (monthIndex !== -1) {
                            return new Date(parseInt(parts[1]), monthIndex, 1);
                        }
                    }
                    return new Date(0); // Fallback for invalid format
                };
                const dateA = parseMonthYear(monthYearA);
                const dateB = parseMonthYear(monthYearB);
                return dateA.getTime() - dateB.getTime();
            });

          if (riderMonths.length === 0) return null; // Don't render card if no data for rider with current filters

          return (
            <Card key={riderName} className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-6 w-6 text-primary" />
                  {riderName}
                </CardTitle>
                <CardDescription>Monthly sales performance for {riderName}. Per-day salary: ₹{(riderSalaries[riderName] || 0).toFixed(2) || 'Not Set'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead><CalendarDays className="inline-block mr-1 h-4 w-4"/>Month</TableHead>
                        <TableHead className="text-right"><Droplets className="inline-block mr-1 h-4 w-4"/>Total Liters Sold</TableHead>
                        <TableHead className="text-right"><IndianRupee className="inline-block mr-1 h-4 w-4"/>Total Money Collected</TableHead>
                        <TableHead className="text-right"><IndianRupee className="inline-block mr-1 h-4 w-4"/>Total Token Money</TableHead>
                        <TableHead className="text-right"><CalendarDays className="inline-block mr-1 h-4 w-4"/>Days Active</TableHead>
                        <TableHead className="text-right"><IndianRupee className="inline-block mr-1 h-4 w-4"/>Avg. Daily Collection</TableHead>
                        <TableHead className="text-right"><Wallet className="inline-block mr-1 h-4 w-4"/>Calculated Salary</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {riderMonths.map(([monthYear, stats]) => {
                        const riderDailyAverage = stats.daysActive > 0 ? stats.totalMoneyCollected / stats.daysActive : 0;
                        return (
                          <TableRow key={monthYear}>
                            <TableCell className="font-medium">{monthYear}</TableCell>
                            <TableCell className="text-right">{stats.totalLitersSold.toFixed(2)} L</TableCell>
                            <TableCell className="text-right">₹{stats.totalMoneyCollected.toFixed(2)}</TableCell>
                            <TableCell className="text-right">₹{stats.totalTokenMoney.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{stats.daysActive}</TableCell>
                            <TableCell className="text-right">₹{riderDailyAverage.toFixed(2)}</TableCell>
                            <TableCell className="text-right">₹{stats.calculatedSalary.toFixed(2)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
       <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} AquaTrack. Rider Performance Report (MongoDB).</p>
      </footer>
    </main>
  );
}

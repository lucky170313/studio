
"use client";

import * as React from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { SalesReportData } from '@/lib/types'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowLeft, AlertCircle, PieChart, CalendarDays, User, Droplets, IndianRupee, FileSpreadsheet, Wallet } from 'lucide-react';
import { format as formatDateFns } from 'date-fns';

const RIDER_SALARIES_KEY = 'riderSalariesAquaTrackApp'; // Same key as in page.tsx

interface MonthlyRiderStats {
  totalLitersSold: number;
  totalMoneyCollected: number; 
  totalTokenMoney: number;
  daysActive: number;
  calculatedSalary: number; // New field for salary
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
  if (dateInput instanceof Date) {
    return formatDateFns(dateInput, 'MMMM yyyy');
  }
  if (typeof dateInput === 'string') {
    const parsedDate = new Date(dateInput);
    if (!isNaN(parsedDate.getTime())) {
      return formatDateFns(parsedDate, 'MMMM yyyy');
    }
  }
  return 'Invalid Date';
};

const formatDisplayDateToDayKey = (dateInput: any): string => {
    if (dateInput instanceof Date) {
      return formatDateFns(dateInput, 'yyyy-MM-dd');
    }
    if (typeof dateInput === 'string') {
      const parsedDate = new Date(dateInput);
      if (!isNaN(parsedDate.getTime())) {
        return formatDateFns(parsedDate, 'yyyy-MM-dd');
      }
    }
    return 'Invalid Date Key';
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
    firestoreDate: new Date(entry.firestoreDate) // Ensure this is a Date object
  }));
}


export default function RiderMonthlyReportPage() {
  const [reportData, setReportData] = useState<AggregatedReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riderSalaries, setRiderSalaries] = useState<Record<string, number>>({});

  // Effect 1: Load salaries from localStorage on initial mount
  useEffect(() => {
    try {
      const storedSalaries = localStorage.getItem(RIDER_SALARIES_KEY);
      if (storedSalaries) {
        const parsedSalaries = JSON.parse(storedSalaries);
        if (typeof parsedSalaries === 'object' && parsedSalaries !== null) {
          // Only set if different to avoid potential re-renders if not strictly necessary,
          // though with an empty dependency array this effect itself only runs once.
           if (JSON.stringify(riderSalaries) !== JSON.stringify(parsedSalaries)) { // Check to prevent unnecessary set if values are same
            setRiderSalaries(parsedSalaries);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load rider salaries from localStorage", e);
    }
  }, []); // Empty dependency array: runs only once on mount.

  // Effect 2: Fetch and process sales data when riderSalaries is available/updated
  useEffect(() => {
    // If riderSalaries is still the initial empty object, we might wait or handle.
    // For now, calculations in .then() will use `riderSalaries[rider] || 0` which gracefully handles missing salaries.
    if (Object.keys(riderSalaries).length === 0 && localStorage.getItem(RIDER_SALARIES_KEY)) {
      // Salaries might still be loading from the first effect if it hasn't completed yet.
      // We could add a small delay or a loading state for salaries if this becomes an issue.
      // For simplicity now, we let it run.
    }

    setIsLoading(true);
    fetchSalesDataForReport()
      .then(allEntries => {
        if (allEntries.length === 0) {
          setReportData({ riderData: {}, overallDailyAverageCollection: 0 });
          setError(null);
          return;
        }

        const riderMonthlyData: RiderMonthlyData = {};
        let totalCollectionAcrossAllDays = 0;
        const uniqueDaysWithEntries = new Set<string>();

        allEntries.forEach(entry => {
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
          // Ensure actualReceived is a number, default to 0 if not
          const actualReceived = typeof entry.actualReceived === 'number' ? entry.actualReceived : 0;
          riderMonthlyData[rider][monthYear].totalMoneyCollected += actualReceived; 
          riderMonthlyData[rider][monthYear].totalTokenMoney += entry.tokenMoney || 0;
          
          totalCollectionAcrossAllDays += actualReceived;
          uniqueDaysWithEntries.add(dayKey);
        });
        
        Object.keys(riderMonthlyData).forEach(rider => {
            Object.keys(riderMonthlyData[rider]).forEach(monthYear => {
                const monthlyEntriesForRider = allEntries.filter(
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
      })
      .catch(err => {
        console.error("Error processing sales data for monthly report:", err);
        setError(err.message || 'Failed to generate monthly report from MongoDB data.');
        setReportData(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [riderSalaries]); // This effect runs when riderSalaries changes.

  if (isLoading) {
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
        <p className="text-muted-foreground text-center py-10">No sales data found in MongoDB to generate the report.</p>
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
          <CardTitle>Overall Daily Average Collection</CardTitle>
          <CardDescription>Average amount collected per day across all riders and entries with sales data.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-primary">
            ₹{reportData.overallDailyAverageCollection.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      <div className="space-y-8">
        {sortedRiderNames.map(riderName => (
          <Card key={riderName} className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-6 w-6 text-primary" />
                {riderName}
              </CardTitle>
              <CardDescription>Monthly sales performance for {riderName}. Per-day salary: ₹{(riderSalaries[riderName] || 0).toFixed(2) || 'Not Set'}</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(reportData.riderData[riderName]).length === 0 ? (
                <p className="text-muted-foreground">No data for this rider.</p>
              ) : (
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
                      {Object.entries(reportData.riderData[riderName])
                        .sort(([monthYearA], [monthYearB]) => {
                            const dateA = new Date(monthYearA.replace(/(\w+) (\d+)/, '$1 1, $2'));
                            const dateB = new Date(monthYearB.replace(/(\w+) (\d+)/, '$1 1, $2'));
                            return dateA.getTime() - dateB.getTime();
                        })
                        .map(([monthYear, stats]) => {
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
              )}
            </CardContent>
          </Card>
        ))}
      </div>
       <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} AquaTrack. Rider Performance Report (MongoDB).</p>
      </footer>
    </main>
  );
}


    
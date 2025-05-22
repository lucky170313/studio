
"use client";

import * as React from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { SalesReportData } from '@/lib/types'; // Ensure this matches MongoDB structure
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowLeft, AlertCircle, PieChart, CalendarDays, User, Droplets, IndianRupee, FileSpreadsheet } from 'lucide-react';
import { format as formatDateFns } from 'date-fns';

interface MonthlyRiderStats {
  totalLitersSold: number;
  totalMoneyCollected: number; // This will be actualReceived
  totalTokenMoney: number;
  daysActive: number; // For daily average calculation
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
  // Ensure firestoreDate is a Date object
  return data.map((entry: any) => ({
    ...entry,
    firestoreDate: new Date(entry.firestoreDate)
  }));
}


export default function RiderMonthlyReportPage() {
  const [reportData, setReportData] = useState<AggregatedReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
            };
          }

          riderMonthlyData[rider][monthYear].totalLitersSold += entry.litersSold;
          riderMonthlyData[rider][monthYear].totalMoneyCollected += entry.actualReceived; // Cash + Online
          riderMonthlyData[rider][monthYear].totalTokenMoney += entry.tokenMoney;
          
          // Count unique days active for this rider in this month (for potential rider-specific averages)
          // This part is not directly used in the current display but is good for future enhancements
          // For overall average, we use a global set of unique days below.

          // For overall daily average calculation
          totalCollectionAcrossAllDays += entry.actualReceived;
          uniqueDaysWithEntries.add(dayKey);
        });
        
        // Refine daysActive per rider per month
        Object.keys(riderMonthlyData).forEach(rider => {
            Object.keys(riderMonthlyData[rider]).forEach(monthYear => {
                const monthlyEntriesForRider = allEntries.filter(
                    entry => entry.riderName === rider && formatDisplayDateToMonthYear(entry.firestoreDate) === monthYear
                );
                const uniqueDaysForRiderInMonth = new Set(monthlyEntriesForRider.map(e => formatDisplayDateToDayKey(e.firestoreDate)));
                riderMonthlyData[rider][monthYear].daysActive = uniqueDaysForRiderInMonth.size;
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
  }, []);

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
              <CardDescription>Monthly sales performance for {riderName}.</CardDescription>
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
                         <TableHead className="text-right"><IndianRupee className="inline-block mr-1 h-4 w-4"/>Avg. Daily Collection (Rider)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(reportData.riderData[riderName])
                        .sort(([monthYearA], [monthYearB]) => {
                            // Ensure consistent date parsing for sorting
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


"use client";

import * as React from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import type { SalesReportData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowLeft, AlertCircle, PieChart, CalendarDays, User, Droplets, IndianRupee, FileSpreadsheet } from 'lucide-react'; // Added FileSpreadsheet
import { format as formatDateFns, getMonth, getYear } from 'date-fns';

interface MonthlyRiderStats {
  totalLitersSold: number;
  totalMoneyCollected: number;
  totalTokenMoney: number;
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

const formatFirestoreTimestampToMonthYear = (timestamp: any): string => {
  if (timestamp instanceof Timestamp) {
    return formatDateFns(timestamp.toDate(), 'MMMM yyyy');
  }
  if (timestamp && typeof timestamp.seconds === 'number' && typeof timestamp.nanoseconds === 'number') {
    const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    return formatDateFns(date, 'MMMM yyyy');
  }
  return 'Invalid Date';
};

const formatFirestoreTimestampToDayKey = (timestamp: any): string => {
    if (timestamp instanceof Timestamp) {
      return formatDateFns(timestamp.toDate(), 'yyyy-MM-dd');
    }
    if (timestamp && typeof timestamp.seconds === 'number' && typeof timestamp.nanoseconds === 'number') {
      const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
      return formatDateFns(date, 'yyyy-MM-dd');
    }
    return 'Invalid Date Key';
  };


export default function RiderMonthlyReportPage() {
  const [reportData, setReportData] = useState<AggregatedReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAndAggregateData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const q = query(collection(db, "salesEntries"), orderBy('firestoreDate', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const entries: SalesReportData[] = querySnapshot.docs.map(doc => doc.data() as SalesReportData);

        const riderData: RiderMonthlyData = {};
        let overallTotalCollected = 0;
        const uniqueSalesDays = new Set<string>();

        entries.forEach(entry => {
          const riderName = entry.riderName;
          const monthYear = formatFirestoreTimestampToMonthYear(entry.firestoreDate);
          const dayKey = formatFirestoreTimestampToDayKey(entry.firestoreDate);

          if (!riderName || monthYear === 'Invalid Date' || dayKey === 'Invalid Date Key') return;

          // Overall stats
          overallTotalCollected += entry.actualReceived;
          uniqueSalesDays.add(dayKey);

          // Rider-specific monthly stats
          if (!riderData[riderName]) {
            riderData[riderName] = {};
          }
          if (!riderData[riderName][monthYear]) {
            riderData[riderName][monthYear] = {
              totalLitersSold: 0,
              totalMoneyCollected: 0,
              totalTokenMoney: 0,
            };
          }

          riderData[riderName][monthYear].totalLitersSold += entry.litersSold;
          riderData[riderName][monthYear].totalMoneyCollected += entry.actualReceived;
          riderData[riderName][monthYear].totalTokenMoney += entry.tokenMoney;
        });
        
        const overallDailyAverageCollection = uniqueSalesDays.size > 0 ? overallTotalCollected / uniqueSalesDays.size : 0;

        setReportData({ riderData, overallDailyAverageCollection });

      } catch (err) {
        console.error("Error fetching or aggregating sales data: ", err);
        setError("Failed to generate rider monthly report. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndAggregateData();
  }, []);

  if (isLoading) {
    return (
      <main className="min-h-screen container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Generating report...</p>
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
          <h1 className="text-3xl font-bold text-primary">Rider Monthly Performance</h1>
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
        <p className="text-muted-foreground text-center py-10">No sales data found to generate the report.</p>
      </main>
    );
  }
  
  const sortedRiderNames = Object.keys(reportData.riderData).sort();

  return (
    <main className="min-h-screen container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary flex items-center">
          <PieChart className="mr-3 h-8 w-8" />
          Rider Monthly Performance
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
          <CardDescription>Average amount collected per day across all riders and entries.</CardDescription>
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(reportData.riderData[riderName])
                        // Sort months chronologically if needed, e.g. "January 2024" before "February 2024"
                        // For simplicity, default object key order is used here, which might not be strictly chronological for all JS engines
                        // A more robust sort would parse monthYear back to a Date object.
                        .sort(([monthYearA], [monthYearB]) => {
                            const dateA = new Date(monthYearA);
                            const dateB = new Date(monthYearB);
                            return dateA.getTime() - dateB.getTime();
                        })
                        .map(([monthYear, stats]) => (
                        <TableRow key={monthYear}>
                          <TableCell className="font-medium">{monthYear}</TableCell>
                          <TableCell className="text-right">{stats.totalLitersSold.toFixed(2)} L</TableCell>
                          <TableCell className="text-right">₹{stats.totalMoneyCollected.toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{stats.totalTokenMoney.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
       <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} AquaTrack. Rider Performance Report.</p>
      </footer>
    </main>
  );
}

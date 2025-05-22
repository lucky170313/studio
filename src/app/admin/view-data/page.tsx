
"use client";

import * as React from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
// import { db } from '@/lib/firebase'; // Firestore import removed
// import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore'; // Firestore imports removed
import type { SalesReportData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowLeft, AlertCircle, Edit3, FileSpreadsheet } from 'lucide-react';
import { format as formatDateFns } from 'date-fns';

// Helper function to safely format Firestore Timestamp (now general Date)
const formatDisplayDate = (dateInput: any): string => {
  if (dateInput instanceof Date) {
    return formatDateFns(dateInput, 'PPP p'); 
  }
  if (typeof dateInput === 'string') { 
    // Attempt to parse if it's a string that might be a date
    const parsedDate = new Date(dateInput);
    if (!isNaN(parsedDate.getTime())) {
      return formatDateFns(parsedDate, 'PPP p');
    }
    return dateInput; // Return as is if it's already a formatted string or unparseable
  }
  // Handling for Firestore Timestamp-like objects if they sneak in, though they shouldn't with Firestore removed
  if (dateInput && typeof dateInput.seconds === 'number' && typeof dateInput.nanoseconds === 'number') {
    const date = new Date(dateInput.seconds * 1000 + dateInput.nanoseconds / 1000000);
    return formatDateFns(date, 'PPP p');
  }
  return 'Invalid Date';
};


interface SalesReportDataWithId extends SalesReportData {
  id: string; // id might come from a local source if data is not from DB
}

export default function AdminViewDataPage() {
  const [salesEntries, setSalesEntries] = useState<SalesReportDataWithId[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Set to false as no data is fetched initially
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof SalesReportDataWithId | null; direction: 'ascending' | 'descending' }>({ key: 'firestoreDate', direction: 'descending' });


  useEffect(() => {
    // Data fetching logic from Firestore is removed.
    // This page will now show "No sales entries found" or you can implement
    // fetching from a new data source (e.g., localStorage or an API connected to MongoDB).
    setIsLoading(false); 
    // You could set an error or informational message here if desired
    // setError("Data fetching from Firebase is disabled. Implement new data source.");
  }, []);

  const sortedEntries = React.useMemo(() => {
    let sortableItems = [...salesEntries];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let valA = a[sortConfig.key!];
        let valB = b[sortConfig.key!];

        if (sortConfig.key === 'firestoreDate') {
          valA = (valA instanceof Date) ? valA : new Date(valA as string || 0);
          valB = (valB instanceof Date) ? valB : new Date(valB as string || 0);
        }

        if (valA < valB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [salesEntries, sortConfig]);

  const requestSort = (key: keyof SalesReportDataWithId) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: keyof SalesReportDataWithId) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    }
    return '';
  };


  if (isLoading) {
    return (
      <main className="min-h-screen container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading sales data...</p>
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

  const tableHeaders: { key: keyof SalesReportDataWithId; label: string; sortable?: boolean }[] = [
    { key: 'firestoreDate', label: 'Date & Time', sortable: true },
    { key: 'riderName', label: 'Rider', sortable: true },
    { key: 'vehicleName', label: 'Vehicle', sortable: true },
    { key: 'litersSold', label: 'Liters Sold', sortable: true },
    { key: 'totalSale', label: 'Total Sale (₹)', sortable: true },
    { key: 'actualReceived', label: 'Actual Rcvd (₹)', sortable: true },
    { key: 'aiAdjustedExpectedAmount', label: 'Adj. Expected (₹)', sortable: true },
    { key: 'discrepancy', label: 'Discrepancy (₹)', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'comment', label: 'Comment' },
  ];


  return (
    <main className="min-h-screen container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">All Sales Entries</h1>
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

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Sales Data Overview</CardTitle>
          <CardDescription>Browse all recorded sales entries. Click column headers to sort. (Database connection removed, data will not be displayed from persistent storage)</CardDescription>
        </CardHeader>
        <CardContent>
          {salesEntries.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No sales entries found. (Database connection removed)</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {tableHeaders.map((header) => (
                      <TableHead 
                        key={header.key} 
                        onClick={header.sortable ? () => requestSort(header.key as keyof SalesReportDataWithId) : undefined}
                        className={header.sortable ? "cursor-pointer hover:bg-muted/50" : ""}
                      >
                        {header.label}
                        {header.sortable ? getSortIndicator(header.key as keyof SalesReportDataWithId) : ''}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      {tableHeaders.map((header) => {
                        let cellValue = entry[header.key as keyof SalesReportDataWithId];
                        if (header.key === 'firestoreDate') {
                           cellValue = formatDisplayDate(entry.firestoreDate);
                        } else if (typeof cellValue === 'number' && (header.label.includes('(₹)') || header.key === 'litersSold')) {
                           cellValue = cellValue.toFixed(2);
                        } else if (cellValue === undefined || cellValue === null) {
                          cellValue = '-';
                        }
                        return (
                          <TableCell key={`${entry.id}-${header.key}`}>
                            {String(cellValue)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
       <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} AquaTrack. Admin Data View.</p>
      </footer>
    </main>
  );
}

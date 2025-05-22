
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
import { Loader2, ArrowLeft, AlertCircle, Edit3, FileSpreadsheet } from 'lucide-react'; // Added FileSpreadsheet
import { format as formatDateFns } from 'date-fns';

// Helper function to safely format Firestore Timestamp
const formatFirestoreTimestamp = (timestamp: any): string => {
  if (timestamp instanceof Timestamp) {
    return formatDateFns(timestamp.toDate(), 'PPP p'); // Format as "Jan 1, 2023 12:00 PM"
  }
  if (timestamp && typeof timestamp.seconds === 'number' && typeof timestamp.nanoseconds === 'number') {
    const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    return formatDateFns(date, 'PPP p');
  }
  if (typeof timestamp === 'string') { // If it's already a formatted string (from local reportData)
    return timestamp;
  }
  return 'Invalid Date';
};


interface SalesReportDataWithId extends SalesReportData {
  id: string;
}

export default function AdminViewDataPage() {
  const [salesEntries, setSalesEntries] = useState<SalesReportDataWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof SalesReportDataWithId | null; direction: 'ascending' | 'descending' }>({ key: 'firestoreDate', direction: 'descending' });


  useEffect(() => {
    const fetchSalesData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Default sort by firestoreDate descending
        const q = query(collection(db, "salesEntries"), orderBy('firestoreDate', 'desc'));
        const querySnapshot = await getDocs(q);
        const entries = querySnapshot.docs.map(doc => {
          const data = doc.data() as SalesReportData;
          // Ensure firestoreDate is correctly handled
          const firestoreDate = data.firestoreDate; // This should be a Timestamp object from Firestore
          return { 
            ...data, 
            id: doc.id,
            // Keep 'date' as the pre-formatted string for consistency if it exists, otherwise format firestoreDate
            date: data.date || formatFirestoreTimestamp(firestoreDate),
            // Ensure firestoreDate is passed along correctly if needed for sorting or other operations
            firestoreDate: firestoreDate 
          };
        });
        setSalesEntries(entries);
      } catch (err) {
        console.error("Error fetching sales data: ", err);
        setError("Failed to fetch sales data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSalesData();
  }, []);

  const sortedEntries = React.useMemo(() => {
    let sortableItems = [...salesEntries];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let valA = a[sortConfig.key!];
        let valB = b[sortConfig.key!];

        // Handle Firestore Timestamps for date sorting
        if (sortConfig.key === 'firestoreDate') {
          valA = (valA as Timestamp)?.toDate() || new Date(0);
          valB = (valB as Timestamp)?.toDate() || new Date(0);
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
          <CardDescription>Browse all recorded sales entries. Click column headers to sort.</CardDescription>
        </CardHeader>
        <CardContent>
          {salesEntries.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No sales entries found.</p>
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
                           cellValue = formatFirestoreTimestamp(entry.firestoreDate);
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

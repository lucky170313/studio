
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
import { Loader2, ArrowLeft, AlertCircle, FileSpreadsheet, CalendarDays, BarChart3, User, Droplets, IndianRupee, Clock, Briefcase, Gift } from 'lucide-react';
import { format as formatDateFns, getYear, getMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import type { ChartConfig } from "@/components/ui/chart";
import { cn } from '@/lib/utils';


const formatDisplayDate = (dateInput: any): string => {
  if (!dateInput) return 'Invalid Date';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  return formatDateFns(date, 'PPP p'); 
};

interface SalesReportDataWithId extends SalesReportData {
  _id: string;
}

async function fetchSalesData(): Promise<SalesReportDataWithId[]> {
  const response = await fetch('/api/sales-reports');
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to fetch sales data from MongoDB');
  }
  const data = await response.json();
  return data.map((entry: any) => ({
    ...entry,
    firestoreDate: new Date(entry.firestoreDate), 
    _id: entry._id 
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

export default function AdminViewDataPage() {
  const [allSalesEntries, setAllSalesEntries] = useState<SalesReportDataWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof SalesReportDataWithId | null; direction: 'ascending' | 'descending' }>({ key: 'firestoreDate', direction: 'descending' });

  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [chartData, setChartData] = useState<{ name: string; totalSales: number }[]>([]);

  useEffect(() => {
    setIsLoading(true);
    fetchSalesData()
      .then(data => {
        setAllSalesEntries(data);
        if (data.length > 0) {
          const years = Array.from(new Set(data.map(entry => getYear(new Date(entry.firestoreDate))))).sort((a,b) => b-a);
          setAvailableYears(years);
        }
        setError(null);
      })
      .catch(err => {
        console.error("Error fetching sales data for view page:", err);
        setError(err.message || 'Failed to load sales entries from MongoDB.');
        setAllSalesEntries([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const filteredEntries = useMemo(() => {
    return allSalesEntries.filter(entry => {
      const entryDate = new Date(entry.firestoreDate);
      const yearMatch = selectedYear === "all" || getYear(entryDate) === parseInt(selectedYear);
      const monthMatch = selectedMonth === "all" || getMonth(entryDate) === parseInt(selectedMonth);
      return yearMatch && monthMatch;
    });
  }, [allSalesEntries, selectedYear, selectedMonth]);

  useEffect(() => {
    if (filteredEntries.length > 0) {
      const salesByRider: { [key: string]: number } = {};
      filteredEntries.forEach(entry => {
        salesByRider[entry.riderName] = (salesByRider[entry.riderName] || 0) + entry.totalSale;
      });
      setChartData(
        Object.entries(salesByRider)
          .map(([name, totalSales]) => ({ name, totalSales: parseFloat(totalSales.toFixed(2)) }))
          .sort((a, b) => b.totalSales - a.totalSales)
      );
    } else {
      setChartData([]);
    }
  }, [filteredEntries]);

  const sortedEntries = useMemo(() => {
    let sortableItems = [...filteredEntries];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let valA = a[sortConfig.key!];
        let valB = b[sortConfig.key!];

        if (sortConfig.key === 'firestoreDate') {
          valA = (valA instanceof Date) ? valA : new Date(valA as string || 0);
          valB = (valB instanceof Date) ? valB : new Date(valB as string || 0);
        }
        
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortConfig.direction === 'ascending' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        // @ts-ignore
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        // @ts-ignore
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredEntries, sortConfig]);

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

  const chartConfig = {
    totalSales: {
      label: "Total Sales (₹)",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;

  if (isLoading) {
    return (
      <main className="min-h-screen container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading sales data from MongoDB...</p>
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

  const tableHeaders: { key: keyof SalesReportDataWithId; label: string; sortable?: boolean; icon?: React.ElementType }[] = [
    { key: 'firestoreDate', label: 'Date & Time', sortable: true, icon: CalendarDays },
    { key: 'riderName', label: 'Rider', sortable: true, icon: User },
    { key: 'vehicleName', label: 'Vehicle', sortable: true },
    { key: 'hoursWorked', label: 'Hours', sortable: true, icon: Clock },
    { key: 'litersSold', label: 'Liters Sold', sortable: true, icon: Droplets },
    { key: 'totalSale', label: 'Total Sale (₹)', sortable: true, icon: IndianRupee },
    { key: 'actualReceived', label: 'Actual Rcvd (₹)', sortable: true, icon: IndianRupee },
    { key: 'dailySalaryCalculated', label: 'Daily Salary (₹)', sortable: true, icon: Briefcase },
    { key: 'commissionEarned', label: 'Commission (₹)', sortable: true, icon: Gift },
    { key: 'newDueAmount', label: 'New Due (₹)', sortable: true, icon: IndianRupee },
    { key: 'discrepancy', label: 'Discrepancy (₹)', sortable: true, icon: IndianRupee },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'comment', label: 'Comment' },
  ];

  return (
    <main className="min-h-screen container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary flex items-center">
          <CalendarDays className="mr-3 h-8 w-8" />
          All Sales Entries (MongoDB)
        </h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => handleExcelExport([{ data: sortedEntries, sheetName: "All Sales Data" }], "AllSalesData_AquaTrack")}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Download as Excel
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
      
      {chartData.length > 0 && (
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5 text-primary" />
              Total Sales per Rider (Filtered)
            </CardTitle>
            <CardDescription>
              Showing total sales contribution by each rider based on the current filters.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2 pr-6">
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                  <BarChart accessibilityLayer data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                    />
                    <YAxis tickFormatter={(value) => `₹${value}`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="totalSales" fill="var(--color-totalSales)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}


      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Sales Data Overview</CardTitle>
          <CardDescription>Browse recorded sales entries from MongoDB. Click column headers to sort.
            Displaying {sortedEntries.length} of {allSalesEntries.length} total entries based on filters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedEntries.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No sales entries found for the selected filters in MongoDB.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {tableHeaders.map((header) => (
                      <TableHead
                        key={header.key}
                        onClick={header.sortable ? () => requestSort(header.key as keyof SalesReportDataWithId) : undefined}
                        className={cn("whitespace-nowrap", header.sortable ? "cursor-pointer hover:bg-muted/50" : "")}
                      >
                        {header.icon && <header.icon className="inline-block mr-1 h-4 w-4" />}
                        {header.label}
                        {header.sortable ? getSortIndicator(header.key as keyof SalesReportDataWithId) : ''}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEntries.map((entry) => (
                    <TableRow key={entry._id}>
                      {tableHeaders.map((header) => {
                        let cellValue = entry[header.key as keyof SalesReportDataWithId];
                        if (header.key === 'firestoreDate') {
                           cellValue = formatDisplayDate(entry.firestoreDate);
                        } else if (typeof cellValue === 'number' && (header.label.includes('(₹)') || header.key === 'litersSold' || header.key === 'discrepancy' || header.key === 'hoursWorked' || header.key === 'dailySalaryCalculated' || header.key === 'commissionEarned')) {
                           cellValue = cellValue.toFixed(2);
                        } else if (cellValue === undefined || cellValue === null) {
                          cellValue = '-';
                        }
                        return (
                          <TableCell key={`${entry._id}-${header.key}`} className="whitespace-nowrap">
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
        <p>&copy; {new Date().getFullYear()} AquaTrack. Admin Data View (MongoDB).</p>
      </footer>
    </main>
  );
}

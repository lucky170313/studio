
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
import { Loader2, ArrowLeft, AlertCircle, CalendarDays, Droplets, IndianRupee, FileSpreadsheet, Truck, AlertTriangle, Edit } from 'lucide-react';
import { format as formatDateFns, getYear, getMonth, parse } from 'date-fns';
import * as XLSX from 'xlsx';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const vehicleOptions = ['Alpha', 'Beta', 'Croma', 'Delta', 'Eta'];

interface DailyEntryDetail {
  id: string;
  date: string;
  firestoreDate: Date;
  riderName: string;
  initialReading: number;
  finalReading: number;
  litersSold: number;
  isAdminOverride: boolean;
  ratePerLiter: number;
  isRateLow: boolean;
  expectedAmount: number;
  actualAmount: number;
  difference: number;
}

interface MonthlyVehicleStats {
  dailyEntries: DailyEntryDetail[];
  totalLitersSold: number;
  totalExpectedAmount: number;
  totalActualAmount: number;
  totalDifference: number;
}

interface VehicleMonthlyData {
  [vehicleName: string]: {
    [monthYear: string]: MonthlyVehicleStats;
  };
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
    firestoreDate: new Date(entry.firestoreDate)
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

export default function VehicleMonthlyReportPage() {
  const [allSalesEntries, setAllSalesEntries] = useState<SalesReportData[]>([]);
  const [reportData, setReportData] = useState<VehicleMonthlyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    setIsLoading(true);
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
        console.error("Error fetching sales data for vehicle report:", err);
        setError(err.message || 'Failed to load sales entries.');
        setReportData(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const filteredEntries = useMemo(() => {
    return allSalesEntries.filter(entry => {
        const entryDate = new Date(entry.firestoreDate);
        const vehicleMatch = selectedVehicle === "all" || entry.vehicleName === selectedVehicle;
        const yearMatch = selectedYear === "all" || getYear(entryDate) === parseInt(selectedYear);
        const monthMatch = selectedMonth === "all" || getMonth(entryDate) === parseInt(selectedMonth);
        return vehicleMatch && yearMatch && monthMatch;
    });
  }, [allSalesEntries, selectedVehicle, selectedYear, selectedMonth]);

  useEffect(() => {
    if (isLoading) return;

    const vehicleData: VehicleMonthlyData = {};

    filteredEntries.forEach(entry => {
      const vehicleName = entry.vehicleName;
      const entryDate = new Date(entry.firestoreDate);
      const monthYear = formatDisplayDateToMonthYear(entryDate);

      if (!vehicleData[vehicleName]) {
        vehicleData[vehicleName] = {};
      }
      if (!vehicleData[vehicleName][monthYear]) {
        vehicleData[vehicleName][monthYear] = {
          dailyEntries: [],
          totalLitersSold: 0,
          totalExpectedAmount: 0,
          totalActualAmount: 0,
          totalDifference: 0,
        };
      }
      
      const expectedAmount = entry.totalSale;
      const actualAmount = entry.actualReceived;
      const difference = actualAmount - expectedAmount;

      const dailyEntry: DailyEntryDetail = {
        id: entry._id || `entry-${Math.random()}`,
        date: entry.date,
        firestoreDate: entry.firestoreDate,
        riderName: entry.riderName,
        initialReading: entry.previousMeterReading,
        finalReading: entry.currentMeterReading,
        litersSold: entry.litersSold,
        isAdminOverride: !!entry.adminOverrideLitersSold,
        ratePerLiter: entry.ratePerLiter,
        isRateLow: entry.ratePerLiter < 0.75,
        expectedAmount: expectedAmount,
        actualAmount: actualAmount,
        difference: difference,
      };

      vehicleData[vehicleName][monthYear].dailyEntries.push(dailyEntry);
    });

    Object.keys(vehicleData).forEach(vehicle => {
      Object.keys(vehicleData[vehicle]).forEach(month => {
        const monthStats = vehicleData[vehicle][month];
        monthStats.dailyEntries.sort((a,b) => a.firestoreDate.getTime() - b.firestoreDate.getTime());
        monthStats.totalLitersSold = monthStats.dailyEntries.reduce((sum, e) => sum + e.litersSold, 0);
        monthStats.totalExpectedAmount = monthStats.dailyEntries.reduce((sum, e) => sum + e.expectedAmount, 0);
        monthStats.totalActualAmount = monthStats.dailyEntries.reduce((sum, e) => sum + e.actualAmount, 0);
        monthStats.totalDifference = monthStats.dailyEntries.reduce((sum, e) => sum + e.difference, 0);
      });
    });

    setReportData(vehicleData);
    setError(null);

  }, [filteredEntries, isLoading]);

  const exportCurrentReportData = () => {
    const sheetsToExport = [];
    if (reportData) {
        Object.entries(reportData).forEach(([vehicleName, monthlyData]) => {
            Object.entries(monthlyData).forEach(([monthYear, stats]) => {
                const sheetName = `${vehicleName.substring(0,10)}_${monthYear.replace(' ', '')}`.substring(0,31);
                const data = stats.dailyEntries.map(e => ({
                    Date: formatDateFns(e.firestoreDate, 'yyyy-MM-dd'),
                    Rider: e.riderName,
                    'Initial Reading': e.initialReading,
                    'Final Reading': e.finalReading,
                    'Liters Sold': e.litersSold.toFixed(2),
                    'Admin Override': e.isAdminOverride ? 'Yes' : 'No',
                    'Rate/L (₹)': e.ratePerLiter.toFixed(2),
                    'Low Rate (<0.75)': e.isRateLow ? 'Yes' : 'No',
                    'Expected (₹)': e.expectedAmount.toFixed(2),
                    'Actual (₹)': e.actualAmount.toFixed(2),
                    'Difference (₹)': e.difference.toFixed(2),
                }));
                 sheetsToExport.push({ data, sheetName });
            });
        });
    }
    
    handleExcelExport(sheetsToExport, "VehicleMonthlyReport_DropAquaTrack");
  };

  if (isLoading && !reportData) {
    return (
      <main className="min-h-screen container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Generating vehicle report...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg text-destructive mb-4">{error}</p>
        <Link href="/" passHref>
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Go Back to Dashboard</Button>
        </Link>
      </main>
    );
  }

  const noDataMessage = "No sales data found for the selected filters.";

  const mainContent = () => {
    if (!reportData || Object.keys(reportData).length === 0) {
         return <p className="text-muted-foreground text-center py-10">{noDataMessage}</p>;
    }

    const sortedVehicleNames = Object.keys(reportData).sort();

    return (
        <div className="space-y-8">
          {sortedVehicleNames.map(vehicleName => {
            const vehicleMonths = Object.entries(reportData[vehicleName])
              .sort(([monthYearA], [monthYearB]) => {
                  const parseMonthYearToDate = (my: string) => parse(my, 'MMMM yyyy', new Date());
                  return parseMonthYearToDate(monthYearB).getTime() - parseMonthYearToDate(monthYearA).getTime();
              });

            if (vehicleMonths.length === 0) return null;

            return (
              <Card key={vehicleName} className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center"><Truck className="mr-2 h-6 w-6 text-primary" />{vehicleName}</CardTitle>
                  <CardDescription>Monthly performance for vehicle: {vehicleName}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {vehicleMonths.map(([monthYear, stats]) => (
                    <div key={monthYear}>
                      <h4 className="text-lg font-semibold mb-2">{monthYear}</h4>
                      <div className="overflow-x-auto border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead><CalendarDays className="inline-block mr-1 h-4 w-4"/>Date</TableHead>
                              <TableHead>Rider</TableHead>
                              <TableHead className="text-right">Initial</TableHead>
                              <TableHead className="text-right">Final</TableHead>
                              <TableHead className="text-right"><Droplets className="inline-block mr-1 h-4 w-4"/>Liters Sold</TableHead>
                              <TableHead className="text-right"><IndianRupee className="inline-block mr-1 h-4 w-4"/>Rate/L</TableHead>
                              <TableHead className="text-right">Expected (₹)</TableHead>
                              <TableHead className="text-right">Actual (₹)</TableHead>
                              <TableHead className="text-right">Difference (₹)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {stats.dailyEntries.map(day => (
                              <TableRow key={day.id}>
                                <TableCell className="font-medium">{formatDateFns(day.firestoreDate, "dd-MMM")}</TableCell>
                                <TableCell>{day.riderName}</TableCell>
                                <TableCell className="text-right">{day.initialReading}</TableCell>
                                <TableCell className="text-right">{day.finalReading}</TableCell>
                                <TableCell className="text-right">
                                  {day.litersSold.toFixed(2)}
                                  {day.isAdminOverride && <Badge variant="outline" className="ml-2 p-1 leading-none"><Edit className="h-3 w-3"/></Badge>}
                                </TableCell>
                                <TableCell className={cn("text-right", day.isRateLow && "text-destructive font-semibold")}>
                                  {day.ratePerLiter.toFixed(2)}
                                  {day.isRateLow && <AlertTriangle className="inline-block ml-1 h-3 w-3" />}
                                </TableCell>
                                <TableCell className="text-right">{day.expectedAmount.toFixed(2)}</TableCell>
                                <TableCell className="text-right">{day.actualAmount.toFixed(2)}</TableCell>
                                <TableCell className={`text-right font-semibold ${day.difference < 0 ? 'text-destructive' : 'text-green-600'}`}>
                                  {day.difference.toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                          <TableFooter>
                            <TableRow className="bg-muted/50 font-bold">
                              <TableCell colSpan={4}>Month Totals for {vehicleName}:</TableCell>
                              <TableCell className="text-right">{stats.totalLitersSold.toFixed(2)}</TableCell>
                              <TableCell></TableCell>
                              <TableCell className="text-right">{stats.totalExpectedAmount.toFixed(2)}</TableCell>
                              <TableCell className="text-right">{stats.totalActualAmount.toFixed(2)}</TableCell>
                              <TableCell className={`text-right ${stats.totalDifference < 0 ? 'text-destructive' : 'text-green-600'}`}>{stats.totalDifference.toFixed(2)}</TableCell>
                            </TableRow>
                          </TableFooter>
                        </Table>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
    );
  }

  return (
    <main className="min-h-screen container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center">
          <Truck className="mr-3 h-8 w-8" />
          Vehicle Monthly Report
        </h1>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
          <Button variant="outline" onClick={exportCurrentReportData} className="w-full sm:w-auto">
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Download as Excel
          </Button>
          <Link href="/" passHref>
            <Button variant="outline" className="w-full sm:w-auto"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Button>
          </Link>
        </div>
      </div>

      <Card className="mb-8 shadow-lg">
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex-1">
            <Label htmlFor="vehicle-filter">Filter by Vehicle</Label>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger id="vehicle-filter"><SelectValue placeholder="Select Vehicle" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vehicles</SelectItem>
                {vehicleOptions.map(v => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label htmlFor="year-filter">Filter by Year</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger id="year-filter"><SelectValue placeholder="Select Year" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map(year => (<SelectItem key={year} value={String(year)}>{year}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label htmlFor="month-filter">Filter by Month</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger id="month-filter"><SelectValue placeholder="Select Month" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {monthNames.map((month, index) => (<SelectItem key={index} value={String(index)}>{month}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {mainContent()}

       <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Drop Aqua Track. Vehicle Performance Report.</p>
      </footer>
    </main>
  );
}

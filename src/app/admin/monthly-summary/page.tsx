
"use client";

import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import type { SalesReportData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, AlertCircle, PieChart, CalendarDays, TrendingUp, Banknote, IndianRupee, Coins, BarChart3, FileSpreadsheet } from 'lucide-react';
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

interface MonthlySummaryStats {
  totalMonthlySales: number;
  averageDailySales: number;
  totalCashReceived: number;
  averageDailyCashReceived: number;
  totalOnlineReceived: number;
  averageDailyOnlineReceived: number;
  totalTokenMoneyReceived: number;
  dailyAverageTokenMoneyReceived: number;
  uniqueDaysInPeriod: number;
}

interface AggregatedReportData {
  monthlyChartData: { month: string; totalSales: number }[];
  summaryStats: MonthlySummaryStats | null;
}

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

export default function MonthlySummaryPage() {
  const [allSalesEntries, setAllSalesEntries] = useState<SalesReportData[]>([]);
  const [reportData, setReportData] = useState<AggregatedReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
           if (years.length > 0 && selectedYear === "all") {
             // setSelectedYear(String(years[0])); // Default to most recent year
           }
        }
        setError(null);
      })
      .catch(err => {
        console.error("Error fetching sales data for monthly summary:", err);
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
        setReportData({ monthlyChartData: [], summaryStats: null });
        return;
    }

    let currentPeriodTotalSales = 0;
    let currentPeriodCashReceived = 0;
    let currentPeriodOnlineReceived = 0;
    let currentPeriodTokenMoney = 0;
    const uniqueDaysInCurrentPeriod = new Set<string>();
    const monthlySalesForChart: { [monthIndex: number]: number } = {};

    filteredEntries.forEach(entry => {
      const entryDate = new Date(entry.firestoreDate);
      const dayKey = formatDisplayDateToDayKey(entryDate);
      const monthIndex = getMonth(entryDate);

      currentPeriodTotalSales += entry.totalSale || 0;
      currentPeriodCashReceived += entry.cashReceived || 0;
      currentPeriodOnlineReceived += entry.onlineReceived || 0;
      currentPeriodTokenMoney += entry.tokenMoney || 0;
      uniqueDaysInCurrentPeriod.add(dayKey);

      if (selectedYear !== "all") {
        monthlySalesForChart[monthIndex] = (monthlySalesForChart[monthIndex] || 0) + (entry.totalSale || 0);
      }
    });

    const chartDataForSelectedYear = selectedYear !== "all"
      ? monthNames.map((month, index) => ({
          month: month.substring(0,3),
          totalSales: parseFloat((monthlySalesForChart[index] || 0).toFixed(2)),
        }))
      : [];

    let summaryStatsResult: MonthlySummaryStats | null = null;
    if (filteredEntries.length > 0 && (selectedMonth !== "all" || selectedYear !== "all") ) {
        const numDays = uniqueDaysInCurrentPeriod.size;
        summaryStatsResult = {
            totalMonthlySales: currentPeriodTotalSales,
            averageDailySales: numDays > 0 ? currentPeriodTotalSales / numDays : 0,
            totalCashReceived: currentPeriodCashReceived,
            averageDailyCashReceived: numDays > 0 ? currentPeriodCashReceived / numDays : 0,
            totalOnlineReceived: currentPeriodOnlineReceived,
            averageDailyOnlineReceived: numDays > 0 ? currentPeriodOnlineReceived / numDays : 0,
            totalTokenMoneyReceived: currentPeriodTokenMoney,
            dailyAverageTokenMoneyReceived: numDays > 0 ? currentPeriodTokenMoney / numDays : 0,
            uniqueDaysInPeriod: numDays,
        };
    }

    setReportData({ monthlyChartData: chartDataForSelectedYear, summaryStats: summaryStatsResult });
    setError(null);

  }, [filteredEntries, isLoading, allSalesEntries, selectedYear, selectedMonth]);

  const monthlyChartConfig = {
    totalSales: {
      label: "Total Sales (₹)",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;

  const exportCurrentReportData = () => {
    const sheetsToExport = [];
    if (reportData?.summaryStats) {
        const summaryArray = Object.entries(reportData.summaryStats).map(([key, value]) => ({
            Statistic: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), 
            Value: typeof value === 'number' ? value.toFixed(2) : value
        }));
        sheetsToExport.push({ data: summaryArray, sheetName: "Summary Statistics" });
    }
    if (reportData?.monthlyChartData && reportData.monthlyChartData.length > 0) {
        sheetsToExport.push({ data: reportData.monthlyChartData, sheetName: "Monthly Sales Chart Data" });
    }
    if (filteredEntries.length > 0 && sheetsToExport.length === 0) { 
         sheetsToExport.push({data: filteredEntries, sheetName: "Filtered Raw Data"});
    }
    
    handleExcelExport(sheetsToExport, "MonthlySummary_DropAquaTrack");
  };


  if (isLoading && !reportData) {
    return (
      <main className="min-h-screen container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Generating summary report...</p>
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
    : "No sales data found to generate the summary.";

  const mainContent = () => {
    if (!reportData || (reportData.monthlyChartData.length === 0 && !reportData.summaryStats && filteredEntries.length === 0 && !isLoading) ) {
         return <p className="text-muted-foreground text-center py-10">{noDataMessage}</p>;
    }

    return (
      <>
        {selectedYear !== "all" && reportData.monthlyChartData.length > 0 && (
          <Card className="mb-8 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5 text-primary" />
                Monthly Sales Comparison for {selectedYear}
              </CardTitle>
              <CardDescription>
                Total sales for each month in {selectedYear}.
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2 pr-6">
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ChartContainer config={monthlyChartConfig} className="min-h-[200px] w-full">
                    <BarChart accessibilityLayer data={reportData.monthlyChartData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                      />
                      <YAxis
                        tickFormatter={(value) => `₹${value}`}
                      />
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
        {(selectedYear === "all" && reportData.monthlyChartData.length === 0) && (
            <Card className="mb-8 shadow-lg bg-muted/30">
                <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">Select a specific year to view the monthly sales comparison graph.</p>
                </CardContent>
            </Card>
        )}

        {reportData.summaryStats && (
          <Card className="mb-8 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarDays className="mr-2 h-6 w-6 text-primary"/>
                Summary for {selectedMonth === "all" ? "Full Year" : monthNames[parseInt(selectedMonth)]} {selectedYear === "all" ? "(All Years)" : selectedYear}
              </CardTitle>
              <CardDescription>Aggregated statistics for the selected period ({reportData.summaryStats.uniqueDaysInPeriod} active days).</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              <div className="p-3 bg-background rounded-md border">
                <Label className="text-sm text-muted-foreground flex items-center"><TrendingUp className="mr-1 h-4 w-4"/>Total Sales</Label>
                <p className="text-xl font-semibold">₹{reportData.summaryStats.totalMonthlySales.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-background rounded-md border">
                <Label className="text-sm text-muted-foreground flex items-center"><TrendingUp className="mr-1 h-4 w-4"/>Avg. Daily Sales</Label>
                <p className="text-xl font-semibold">₹{reportData.summaryStats.averageDailySales.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-background rounded-md border">
                <Label className="text-sm text-muted-foreground flex items-center"><Banknote className="mr-1 h-4 w-4"/>Total Cash Received</Label>
                <p className="text-xl font-semibold">₹{reportData.summaryStats.totalCashReceived.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-background rounded-md border">
                <Label className="text-sm text-muted-foreground flex items-center"><Banknote className="mr-1 h-4 w-4"/>Avg. Daily Cash Rcvd</Label>
                <p className="text-xl font-semibold">₹{reportData.summaryStats.averageDailyCashReceived.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-background rounded-md border">
                <Label className="text-sm text-muted-foreground flex items-center"><IndianRupee className="mr-1 h-4 w-4"/>Total Online Received</Label>
                <p className="text-xl font-semibold">₹{reportData.summaryStats.totalOnlineReceived.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-background rounded-md border">
                <Label className="text-sm text-muted-foreground flex items-center"><IndianRupee className="mr-1 h-4 w-4"/>Avg. Daily Online Rcvd</Label>
                <p className="text-xl font-semibold">₹{reportData.summaryStats.averageDailyOnlineReceived.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-background rounded-md border">
                <Label className="text-sm text-muted-foreground flex items-center"><Coins className="mr-1 h-4 w-4"/>Total Token Money</Label>
                <p className="text-xl font-semibold">₹{reportData.summaryStats.totalTokenMoneyReceived.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-background rounded-md border">
                <Label className="text-sm text-muted-foreground flex items-center"><Coins className="mr-1 h-4 w-4"/>Avg. Daily Token Money</Label>
                <p className="text-xl font-semibold">₹{reportData.summaryStats.dailyAverageTokenMoneyReceived.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        )}
        {filteredEntries.length > 0 && !reportData.summaryStats && (
             <Card className="mb-8 shadow-lg bg-muted/30">
                <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">Select a specific month and/or year to view the detailed summary.</p>
                </CardContent>
            </Card>
        )}
      </>
    );
  }

  return (
    <main className="min-h-screen container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center">
          <PieChart className="mr-3 h-8 w-8" />
          Monthly Sales Summary
        </h1>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
          <Button variant="outline" onClick={exportCurrentReportData} className="w-full sm:w-auto">
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Download as Excel
          </Button>
          <Link href="/" passHref>
            <Button variant="outline" className="w-full sm:w-auto">
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

      {mainContent()}

       <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Drop Aqua Track. Monthly Sales Summary.</p>
      </footer>
    </main>
  );
}

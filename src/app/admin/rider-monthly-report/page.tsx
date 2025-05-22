
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
import { Loader2, ArrowLeft, AlertCircle, PieChart, CalendarDays, User, Droplets, IndianRupee, FileSpreadsheet, Wallet, TrendingUp, BarChart3, Clock, Briefcase, Gift, MinusCircle, PlusCircle } from 'lucide-react';
import { format as formatDateFns, getYear, getMonth, parse, format } from 'date-fns';
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

const RIDER_SALARIES_KEY = 'riderSalariesAquaTrackApp'; // Per-day salary for 9 hours

interface DailyEntryDetail {
  id: string;
  date: string;
  firestoreDate: Date;
  litersSold: number;
  hoursWorked: number;
  baseDailySalary: number;
  commissionEarned: number;
  discrepancy: number;
  netEarning: number; // baseDailySalary + commissionEarned - discrepancy
  totalSale: number;
  actualReceived: number; // cash + online
}

interface MonthlyRiderDetailedStats {
  dailyEntries: DailyEntryDetail[];
  totalLitersSold: number;
  totalMoneyCollected: number; // sum of daily actualReceived
  totalTokenMoney: number; // sum from sales entries for this rider in this month
  totalSalesGenerated: number; // sum of daily totalSale
  totalBaseSalary: number;
  totalCommissionEarned: number;
  totalDiscrepancy: number;
  netMonthlyEarning: number; // totalBaseSalary + totalCommissionEarned - totalDiscrepancy
  daysActive: number;
}

interface RiderMonthlyData {
  [riderName: string]: {
    [monthYear: string]: MonthlyRiderDetailedStats;
  };
}

interface AggregatedReportData {
  riderData: RiderMonthlyData;
  overallDailyAverageCollection: number;
  riderSalesChartData: { name: string; total: number }[];
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
    firestoreDate: new Date(entry.firestoreDate), 
    dailySalaryCalculated: entry.dailySalaryCalculated || 0,
    commissionEarned: entry.commissionEarned || 0,
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
           setRiderSalaries(parsedSalaries);
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
        setError(null);
      })
      .catch(err => {
        console.error("Error fetching sales data for monthly report:", err);
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
    if (isLoading && allSalesEntries.length > 0 && Object.keys(riderSalaries).length === 0) return; 
    if (allSalesEntries.length === 0 && !isLoading) {
        setReportData({ riderData: {}, overallDailyAverageCollection: 0, riderSalesChartData: [] });
        return;
    }

    const riderMonthlyData: RiderMonthlyData = {};
    let totalCollectionAcrossAllDays = 0;
    const uniqueDaysWithEntriesGlobal = new Set<string>();
    const salesByRiderForChart: { [key: string]: number } = {};

    filteredEntries.forEach(entry => {
      const rider = entry.riderName;
      const entryDate = new Date(entry.firestoreDate);
      const monthYear = formatDisplayDateToMonthYear(entryDate);
      const dayKey = formatDisplayDateToDayKey(entryDate);

      if (!riderMonthlyData[rider]) {
        riderMonthlyData[rider] = {};
      }
      if (!riderMonthlyData[rider][monthYear]) {
        riderMonthlyData[rider][monthYear] = {
          dailyEntries: [],
          totalLitersSold: 0,
          totalMoneyCollected: 0,
          totalTokenMoney: 0,
          totalSalesGenerated: 0,
          totalBaseSalary: 0,
          totalCommissionEarned: 0,
          totalDiscrepancy: 0,
          netMonthlyEarning: 0,
          daysActive: 0,
        };
      }
      
      const baseDailySalary = entry.dailySalaryCalculated || 0;
      const commissionEarned = entry.commissionEarned || 0;
      
      const netEarning = baseDailySalary + commissionEarned - entry.discrepancy;

      riderMonthlyData[rider][monthYear].dailyEntries.push({
        id: entry._id || `entry-${Math.random()}`,
        date: entry.date,
        firestoreDate: entry.firestoreDate,
        litersSold: entry.litersSold,
        hoursWorked: entry.hoursWorked,
        baseDailySalary: baseDailySalary,
        commissionEarned: commissionEarned,
        discrepancy: entry.discrepancy,
        netEarning: netEarning,
        totalSale: entry.totalSale,
        actualReceived: entry.actualReceived,
      });

      riderMonthlyData[rider][monthYear].totalLitersSold += entry.litersSold;
      const actualReceived = typeof entry.actualReceived === 'number' ? entry.actualReceived : 0;
      riderMonthlyData[rider][monthYear].totalMoneyCollected += actualReceived;
      riderMonthlyData[rider][monthYear].totalTokenMoney += entry.tokenMoney || 0;
      riderMonthlyData[rider][monthYear].totalSalesGenerated += entry.totalSale || 0;
      riderMonthlyData[rider][monthYear].totalBaseSalary += baseDailySalary;
      riderMonthlyData[rider][monthYear].totalCommissionEarned += commissionEarned;
      riderMonthlyData[rider][monthYear].totalDiscrepancy += entry.discrepancy;
      riderMonthlyData[rider][monthYear].netMonthlyEarning += netEarning;


      salesByRiderForChart[rider] = (salesByRiderForChart[rider] || 0) + (entry.totalSale || 0);

      totalCollectionAcrossAllDays += actualReceived;
      uniqueDaysWithEntriesGlobal.add(dayKey);
    });

    Object.keys(riderMonthlyData).forEach(rider => {
      Object.keys(riderMonthlyData[rider]).forEach(monthYear => {
        const uniqueDaysForRiderInMonth = new Set(riderMonthlyData[rider][monthYear].dailyEntries.map(e => formatDisplayDateToDayKey(e.firestoreDate)));
        riderMonthlyData[rider][monthYear].daysActive = uniqueDaysForRiderInMonth.size;
        riderMonthlyData[rider][monthYear].dailyEntries.sort((a,b) => a.firestoreDate.getTime() - b.firestoreDate.getTime());
      });
    });
    

    const overallDailyAverageCollection = uniqueDaysWithEntriesGlobal.size > 0
      ? totalCollectionAcrossAllDays / uniqueDaysWithEntriesGlobal.size
      : 0;

    const riderSalesChartData = Object.entries(salesByRiderForChart)
      .map(([name, total]) => ({ name, total: parseFloat(total.toFixed(2)) }))
      .sort((a,b) => b.total - a.total);

    setReportData({ riderData: riderMonthlyData, overallDailyAverageCollection, riderSalesChartData });
    setError(null);

  }, [filteredEntries, riderSalaries, isLoading, allSalesEntries, selectedYear, selectedMonth]);

  const exportCurrentReportData = () => {
    const sheetsToExport = [];
    if (filteredEntries.length > 0) {
         sheetsToExport.push({data: filteredEntries, sheetName: "Filtered Raw Data"});
    }
    if (reportData?.riderSalesChartData && reportData.riderSalesChartData.length > 0) {
        sheetsToExport.push({ data: reportData.riderSalesChartData, sheetName: "Rider Sales Chart Data" });
    }
    // Add more sheets for detailed rider breakdown if needed
    
    handleExcelExport(sheetsToExport, "RiderMonthlyReport_AquaTrack");
  };

  const riderSalesChartConfig = {
    total: {
      label: "Total Sales (₹)",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;

  if (isLoading && !reportData) {
    return (
      <main className="min-h-screen container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Generating rider report...</p>
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
    if (!reportData || (Object.keys(reportData.riderData).length === 0 && filteredEntries.length === 0 && !isLoading) ) {
         return <p className="text-muted-foreground text-center py-10">{noDataMessage}</p>;
    }

    const sortedRiderNames = Object.keys(reportData.riderData).sort();

    return (
      <>
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><TrendingUp className="mr-2 h-6 w-6 text-primary"/>Overall Daily Average Collection</CardTitle>
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

        {reportData.riderSalesChartData.length > 0 && (
         <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5 text-primary" />
              Total Sales per Rider
            </CardTitle>
            <CardDescription>
              Showing total sales generated by each rider for {selectedMonth === "all" ? "all months" : monthNames[parseInt(selectedMonth)]}
              {selectedYear === "all" ? "" : ` in ${selectedYear}`}.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2 pr-6">
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ChartContainer config={riderSalesChartConfig} className="min-h-[200px] w-full">
                  <BarChart accessibilityLayer data={reportData.riderSalesChartData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                    />
                    <YAxis 
                      tickFormatter={(value) => `₹${value}`}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

        <div className="space-y-8">
          {sortedRiderNames.map(riderName => {
            const riderMonths = Object.entries(reportData.riderData[riderName])
              .sort(([monthYearA], [monthYearB]) => {
                  const parseMonthYearToDate = (my: string) => parse(my, 'MMMM yyyy', new Date());
                  return parseMonthYearToDate(monthYearA).getTime() - parseMonthYearToDate(monthYearB).getTime();
              });

            if (riderMonths.length === 0) return null;

            return (
              <Card key={riderName} className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="mr-2 h-6 w-6 text-primary" />
                    {riderName}
                  </CardTitle>
                  <CardDescription>Monthly performance for {riderName}. Full Day Salary (9hr): ₹{(riderSalaries[riderName] || 0).toFixed(2) || 'Not Set'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {riderMonths.map(([monthYear, stats]) => (
                    <div key={monthYear}>
                      <h4 className="text-lg font-semibold mb-2">{monthYear} (Active Days: {stats.daysActive})</h4>
                      <div className="overflow-x-auto border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead><CalendarDays className="inline-block mr-1 h-4 w-4"/>Date</TableHead>
                              <TableHead className="text-right"><Droplets className="inline-block mr-1 h-4 w-4"/>Liters</TableHead>
                              <TableHead className="text-right"><Clock className="inline-block mr-1 h-4 w-4"/>Hours</TableHead>
                              <TableHead className="text-right"><TrendingUp className="inline-block mr-1 h-4 w-4"/>Total Sale (₹)</TableHead>
                              <TableHead className="text-right"><IndianRupee className="inline-block mr-1 h-4 w-4"/>Actual Rcvd (₹)</TableHead>
                              <TableHead className="text-right"><Briefcase className="inline-block mr-1 h-4 w-4"/>Base Salary (₹)</TableHead>
                              <TableHead className="text-right"><Gift className="inline-block mr-1 h-4 w-4"/>Commission (₹)</TableHead>
                              <TableHead className="text-right">Discrepancy (₹)</TableHead>
                              <TableHead className="text-right"><Wallet className="inline-block mr-1 h-4 w-4"/>Net Earning (₹)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {stats.dailyEntries.map(day => (
                              <TableRow key={day.id}>
                                <TableCell className="font-medium">{format(day.firestoreDate, "dd-MMM")}</TableCell>
                                <TableCell className="text-right">{day.litersSold.toFixed(2)} L</TableCell>
                                <TableCell className="text-right">{day.hoursWorked} hr</TableCell>
                                <TableCell className="text-right">₹{day.totalSale.toFixed(2)}</TableCell>
                                <TableCell className="text-right">₹{day.actualReceived.toFixed(2)}</TableCell>
                                <TableCell className="text-right">₹{day.baseDailySalary.toFixed(2)}</TableCell>
                                <TableCell className="text-right">₹{day.commissionEarned.toFixed(2)}</TableCell>
                                <TableCell className={`text-right ${day.discrepancy > 0 ? 'text-red-600' : day.discrepancy < 0 ? 'text-green-600' : ''}`}>
                                  {day.discrepancy > 0 && <MinusCircle className="inline-block mr-1 h-3 w-3"/>}
                                  {day.discrepancy < 0 && <PlusCircle className="inline-block mr-1 h-3 w-3"/>}
                                  ₹{Math.abs(day.discrepancy).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right font-semibold">₹{day.netEarning.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                          <TableFooter>
                            <TableRow className="bg-muted/50 font-semibold">
                              <TableCell colSpan={1}>Month Totals:</TableCell><TableCell className="text-right">{stats.totalLitersSold.toFixed(2)} L</TableCell><TableCell className="text-right">-</TableCell><TableCell className="text-right">₹{stats.totalSalesGenerated.toFixed(2)}</TableCell><TableCell className="text-right">₹{stats.totalMoneyCollected.toFixed(2)}</TableCell><TableCell className="text-right">₹{stats.totalBaseSalary.toFixed(2)}</TableCell><TableCell className="text-right">₹{stats.totalCommissionEarned.toFixed(2)}</TableCell><TableCell className={`text-right ${stats.totalDiscrepancy > 0 ? 'text-red-600' : stats.totalDiscrepancy < 0 ? 'text-green-600' : ''}`}>{stats.totalDiscrepancy > 0 && <MinusCircle className="inline-block mr-1 h-3 w-3"/>}{stats.totalDiscrepancy < 0 && <PlusCircle className="inline-block mr-1 h-3 w-3"/>}₹{Math.abs(stats.totalDiscrepancy).toFixed(2)}</TableCell><TableCell className="text-right text-lg">₹{stats.netMonthlyEarning.toFixed(2)}</TableCell>
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
      </>
    );
  }

  return (
    <main className="min-h-screen container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary flex items-center">
          <PieChart className="mr-3 h-8 w-8" />
          Rider Monthly Performance
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
        <p>&copy; {new Date().getFullYear()} AquaTrack. Rider Performance Report.</p>
      </footer>
    </main>
  );
}

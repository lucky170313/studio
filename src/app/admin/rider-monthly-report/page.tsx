
"use client";

import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import type { SalesReportData, Rider } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, AlertCircle, PieChart, CalendarDays, User, Droplets, IndianRupee, FileSpreadsheet, Wallet, TrendingUp, BarChart3, Clock, Briefcase, Gift, MinusCircle, PlusCircle, Printer, RefreshCw } from 'lucide-react';
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
import { getRidersAction } from '@/app/actions'; 
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// LOGIN_SESSION_KEY constant removed as AdminLayout handles authorization

interface DailyEntryDetail {
  id: string;
  date: string;
  firestoreDate: Date;
  litersSold: number;
  hoursWorked: number;
  baseDailySalary: number;
  commissionEarned: number;
  discrepancy: number;
  netEarning: number;
  totalSale: number;
  actualReceived: number;
}

interface MonthlyRiderDetailedStats {
  dailyEntries: DailyEntryDetail[];
  totalLitersSold: number;
  totalMoneyCollected: number;
  totalTokenMoney: number;
  totalSalesGenerated: number;
  totalBaseSalary: number;
  totalCommissionEarned: number;
  totalDiscrepancy: number;
  netMonthlyEarning: number;
  daysActive: number;
  riderBaseSalaryPerDay: number; 
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
  const [isLoadingRiders, setIsLoadingRiders] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbRiders, setDbRiders] = useState<Rider[]>([]);
  const { toast } = useToast();
  // isLoggedIn state removed, AdminLayout handles authorization

  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const fetchRiderDataFromDB = async () => {
    setIsLoadingRiders(true);
    try {
      const result = await getRidersAction();
      if (result.success && result.riders) {
        setDbRiders(result.riders);
      } else {
        toast({ title: "Error", description: result.message || "Failed to fetch riders.", variant: "destructive" });
        setDbRiders([]);
      }
    } catch (e: any) {
      toast({ title: "Error", description: `Failed to load riders: ${e.message}`, variant: "destructive" });
      setDbRiders([]);
    } finally {
      setIsLoadingRiders(false);
    }
  };

 useEffect(() => {
    // AdminLayout handles authorization. We can directly fetch data.
    fetchRiderDataFromDB();
  }, []); // Removed toast dependency, run once on mount or if needed based on other logic


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
    if (isLoading || isLoadingRiders || (allSalesEntries.length > 0 && dbRiders.length === 0 && !isLoadingRiders) ) return; // ensure dbRiders is loaded if allSalesEntries exist
    if (allSalesEntries.length === 0 && !isLoading) {
        setReportData({ riderData: {}, overallDailyAverageCollection: 0, riderSalesChartData: [] });
        return;
    }

    const riderMonthlyData: RiderMonthlyData = {};
    let totalCollectionAcrossAllDays = 0;
    const uniqueDaysWithEntriesGlobal = new Set<string>();
    const salesByRiderForChart: { [key: string]: number } = {};

    filteredEntries.forEach(entry => {
      const riderName = entry.riderName;
      const entryDate = new Date(entry.firestoreDate);
      const monthYear = formatDisplayDateToMonthYear(entryDate);
      const dayKey = formatDisplayDateToDayKey(entryDate);
      
      const riderInfo = dbRiders.find(r => r.name === riderName);
      const riderBaseSalaryPerDay = riderInfo ? riderInfo.perDaySalary : 0;


      if (!riderMonthlyData[riderName]) {
        riderMonthlyData[riderName] = {};
      }
      if (!riderMonthlyData[riderName][monthYear]) {
        riderMonthlyData[riderName][monthYear] = {
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
          riderBaseSalaryPerDay: riderBaseSalaryPerDay,
        };
      } else {
          riderMonthlyData[riderName][monthYear].riderBaseSalaryPerDay = riderBaseSalaryPerDay;
      }
      
      const baseDailySalary = entry.hoursWorked >= 9 ? riderBaseSalaryPerDay : (riderBaseSalaryPerDay / 9) * entry.hoursWorked;
      const commissionEarned = entry.commissionEarned || 0; 

      const netEarning = baseDailySalary + commissionEarned - (entry.discrepancy || 0);

      riderMonthlyData[riderName][monthYear].dailyEntries.push({
        id: entry._id || `entry-${Math.random()}`,
        date: entry.date,
        firestoreDate: entry.firestoreDate,
        litersSold: entry.litersSold,
        hoursWorked: entry.hoursWorked,
        baseDailySalary: baseDailySalary,
        commissionEarned: commissionEarned,
        discrepancy: entry.discrepancy || 0,
        netEarning: netEarning,
        totalSale: entry.totalSale || 0,
        actualReceived: entry.actualReceived || 0,
      });

      riderMonthlyData[riderName][monthYear].totalLitersSold += entry.litersSold || 0;
      const actualReceived = typeof entry.actualReceived === 'number' ? entry.actualReceived : 0;
      riderMonthlyData[riderName][monthYear].totalMoneyCollected += actualReceived;
      riderMonthlyData[riderName][monthYear].totalTokenMoney += entry.tokenMoney || 0;
      riderMonthlyData[riderName][monthYear].totalSalesGenerated += entry.totalSale || 0;
      riderMonthlyData[riderName][monthYear].totalBaseSalary += baseDailySalary;
      riderMonthlyData[riderName][monthYear].totalCommissionEarned += commissionEarned;
      riderMonthlyData[riderName][monthYear].totalDiscrepancy += entry.discrepancy || 0;
      riderMonthlyData[riderName][monthYear].netMonthlyEarning += netEarning;


      salesByRiderForChart[riderName] = (salesByRiderForChart[riderName] || 0) + (entry.totalSale || 0);

      totalCollectionAcrossAllDays += actualReceived;
      uniqueDaysWithEntriesGlobal.add(dayKey);
    });

    Object.keys(riderMonthlyData).forEach(rider => {
      Object.keys(riderMonthlyData[rider]).forEach(currentMonthYear => {
        const uniqueDaysForRiderInMonth = new Set(riderMonthlyData[rider][currentMonthYear].dailyEntries.map(e => formatDisplayDateToDayKey(e.firestoreDate)));
        riderMonthlyData[rider][currentMonthYear].daysActive = uniqueDaysForRiderInMonth.size;
        riderMonthlyData[rider][currentMonthYear].dailyEntries.sort((a,b) => a.firestoreDate.getTime() - b.firestoreDate.getTime());
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

  }, [filteredEntries, dbRiders, isLoading, isLoadingRiders, allSalesEntries, selectedYear, selectedMonth]);

  const exportCurrentReportData = () => {
    const sheetsToExport = [];
    if (filteredEntries.length > 0) {
         sheetsToExport.push({data: filteredEntries.map(e => ({...e, firestoreDate: formatDateFns(new Date(e.firestoreDate), 'yyyy-MM-dd HH:mm:ss')})), sheetName: "Filtered Raw Data"});
    }
    if (reportData?.riderSalesChartData && reportData.riderSalesChartData.length > 0) {
        sheetsToExport.push({ data: reportData.riderSalesChartData, sheetName: "Rider Sales Chart Data" });
    }

    handleExcelExport(sheetsToExport, "RiderMonthlyReport_DropAquaTrack");
  };

  const handleDownloadSalarySlip = (riderName: string, monthYear: string, stats: MonthlyRiderDetailedStats) => {
    const riderBaseSalaryPerDay = stats.riderBaseSalaryPerDay;

    let dailyEntriesHtml = '';
    stats.dailyEntries.forEach(day => {
      dailyEntriesHtml += `
        <tr>
          <td>${format(day.firestoreDate, "dd-MMM")}</td>
          <td style="text-align: right;">${day.litersSold.toFixed(2)} L</td>
          <td style="text-align: right;">${day.hoursWorked} hr</td>
          <td style="text-align: right;">${day.totalSale.toFixed(2)}</td>
          <td style="text-align: right;">${day.actualReceived.toFixed(2)}</td>
          <td style="text-align: right;">${day.baseDailySalary.toFixed(2)}</td>
          <td style="text-align: right;">${day.commissionEarned.toFixed(2)}</td>
          <td style="text-align: right;">${day.discrepancy > 0 ? '-' : day.discrepancy < 0 ? '+' : ''}${Math.abs(day.discrepancy).toFixed(2)}</td>
          <td style="text-align: right; font-weight: bold;">${day.netEarning.toFixed(2)}</td>
        </tr>
      `;
    });

    const slipContent = `
      <html>
        <head>
          <title>Salary Slip - ${riderName} - ${monthYear}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 10pt; }
            .slip-container { border: 1px solid #ccc; padding: 15px; max-width: 800px; margin: auto; }
            h2, h3 { text-align: center; color: #333; }
            h3 { margin-top: 15px; margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            th { background-color: #f2f2f2; }
            .summary-table td { font-weight: bold; }
            .text-right { text-align: right; }
            .footer { margin-top: 20px; text-align: center; font-size: 0.8em; color: #777; }
            .header-info { margin-bottom: 15px; }
            .header-info div { margin-bottom: 3px; }
            .header-info span { display: inline-block; min-width: 150px; }
          </style>
        </head>
        <body>
          <div class="slip-container">
            <h2>Drop Aqua Track - Salary Slip</h2>
            <div class="header-info">
              <div><span>Rider Name:</span> <strong>${riderName}</strong></div>
              <div><span>Month/Year:</span> <strong>${monthYear}</strong></div>
              <div><span>Per Day Salary (9hr):</span> <strong>₹${riderBaseSalaryPerDay.toFixed(2)}</strong></div>
              <div><span>Days Active:</span> <strong>${stats.daysActive}</strong></div>
            </div>

            <h3>Daily Performance & Earnings</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th class="text-right">Liters Sold</th>
                  <th class="text-right">Hours</th>
                  <th class="text-right">Total Sale (₹)</th>
                  <th class="text-right">Actual Rcvd (₹)</th>
                  <th class="text-right">Base Salary (₹)</th>
                  <th class="text-right">Commission (₹)</th>
                  <th class="text-right">Discrepancy (₹)</th>
                  <th class="text-right">Net Earning (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${dailyEntriesHtml}
              </tbody>
            </table>

            <h3>Monthly Summary</h3>
            <table class="summary-table">
              <tr><td>Total Base Salary:</td><td class="text-right">₹${stats.totalBaseSalary.toFixed(2)}</td></tr>
              <tr><td>Total Commission Earned:</td><td class="text-right">₹${stats.totalCommissionEarned.toFixed(2)}</td></tr>
              <tr><td>Total Discrepancy:</td><td class="text-right">${stats.totalDiscrepancy > 0 ? '-' : stats.totalDiscrepancy < 0 ? '+' : ''}₹${Math.abs(stats.totalDiscrepancy).toFixed(2)}</td></tr>
              <tr><td><strong>Net Monthly Earning:</strong></td><td class="text-right"><strong>₹${stats.netMonthlyEarning.toFixed(2)}</strong></td></tr>
            </table>

             <div class="footer">Generated on: ${formatDateFns(new Date(), 'PPP p')}</div>
          </div>
        </body>
      </html>
    `;
    const slipWindow = window.open('', '_blank');
    slipWindow?.document.write(slipContent);
    slipWindow?.document.close();
  };


  const riderSalesChartConfig = {
    total: {
      label: "Total Sales (₹)",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;

  // Conditional rendering for "You must be logged in" removed
  // AdminLayout.tsx handles authorization for this page.

  if ((isLoading || isLoadingRiders) && !reportData) {
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
    if (!reportData || (Object.keys(reportData.riderData).length === 0 && filteredEntries.length === 0 && !isLoading && !isLoadingRiders) ) { // Adjusted condition
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
            <div className="h-[300px] w-full">
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
                  <CardDescription>Monthly performance for {riderName}. Full Day Salary (9hr): ₹{(riderMonths[0]?.[1]?.riderBaseSalaryPerDay || 0).toFixed(2)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {riderMonths.map(([monthYear, stats]) => (
                    <div key={monthYear}>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-lg font-semibold">
                            {monthYear} (Active Days: {stats.daysActive})
                        </h4>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadSalarySlip(riderName, monthYear, stats)}
                            disabled={stats.dailyEntries.length === 0}
                        >
                           <Printer className="mr-2 h-4 w-4" /> Download Full Salary Slip
                        </Button>
                      </div>
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
                              <TableCell colSpan={5}>Month Totals:</TableCell>
                              <TableCell className="text-right">₹{stats.totalBaseSalary.toFixed(2)}</TableCell>
                              <TableCell className="text-right">₹{stats.totalCommissionEarned.toFixed(2)}</TableCell>
                              <TableCell className={`text-right ${stats.totalDiscrepancy > 0 ? 'text-red-600' : stats.totalDiscrepancy < 0 ? 'text-green-600' : ''}`}>
                                {stats.totalDiscrepancy > 0 && <MinusCircle className="inline-block mr-1 h-3 w-3"/>}
                                {stats.totalDiscrepancy < 0 && <PlusCircle className="inline-block mr-1 h-3 w-3"/>}
                                ₹{Math.abs(stats.totalDiscrepancy).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right text-lg">₹{stats.netMonthlyEarning.toFixed(2)}</TableCell>
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
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center">
          <PieChart className="mr-3 h-8 w-8" />
          Rider Monthly Performance
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
          <div className="flex justify-between items-center">
              <CardTitle>Filters</CardTitle>
              <Button variant="ghost" size="sm" onClick={fetchRiderDataFromDB} disabled={isLoadingRiders || isLoading}>
                  <RefreshCw className={cn("h-4 w-4", (isLoadingRiders || isLoading) && "animate-spin")} />
              </Button>
          </div>
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
        <p>&copy; {new Date().getFullYear()} Drop Aqua Track. Rider Performance Report.</p>
      </footer>
    </main>
  );
}



"use client";

import type { SalesReportData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Truck, CalendarDays, Droplets, DollarSign, MessageSquare, AlertTriangle, CheckCircle, Info, Edit3, BarChartBig, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AquaTrackReportProps {
  reportData: SalesReportData;
}

const ReportItem: React.FC<{ icon: React.ElementType; label: string; value: string | number; unit?: string; className?: string }> = ({ icon: Icon, label, value, unit, className }) => (
  <div className={cn("flex items-start justify-between py-2", className)}>
    <div className="flex items-center text-sm text-muted-foreground">
      <Icon className="mr-2 h-4 w-4 flex-shrink-0" />
      <span>{label}</span>
    </div>
    <span className="text-sm font-medium text-foreground text-right">
      {typeof value === 'number' && (label.toLowerCase().includes('rate') || label.toLowerCase().includes('sale') || label.toLowerCase().includes('received') || label.toLowerCase().includes('expected') || label.toLowerCase().includes('discrepancy') || label.toLowerCase().includes('money') || label.toLowerCase().includes('expense') || label.toLowerCase().includes('amount') || label.toLowerCase().includes('new due')) ? `₹${value.toFixed(2)}` : value}
      {unit && <span className="text-xs text-muted-foreground ml-1">{unit}</span>}
    </span>
  </div>
);


export function AquaTrackReport({ reportData }: AquaTrackReportProps) {
  const getStatusBadge = (status: SalesReportData['status'], discrepancy: number) => {
    // Discrepancy = Expected - Actual
    // Positive discrepancy = Shortage
    // Negative discrepancy = Overage
    if (status === 'Match') {
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white"><CheckCircle className="mr-1 h-4 w-4" />Match</Badge>;
    } else if (status === 'Shortage') { // Corresponds to discrepancy > 0
      return <Badge variant="destructive"><AlertTriangle className="mr-1 h-4 w-4" />Shortage</Badge>;
    } else if (status === 'Overage') { // Corresponds to discrepancy < 0
      return <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 text-black"><Info className="mr-1 h-4 w-4" />Overage</Badge>;
    }
    return <Badge>{status}</Badge>; // Fallback
  };

  const litersSoldLabel = (reportData.adminOverrideLitersSold && reportData.adminOverrideLitersSold > 0)
    ? "Liters Sold (Admin Override)"
    : "Liters Sold (Calculated)";

  return (
    <Card className="w-full shadow-xl">
      <CardHeader className="bg-primary/10 rounded-t-lg">
        <CardTitle className="text-2xl font-bold text-primary flex items-center">
          <BarChartBig className="mr-2 h-6 w-6" />
          Sales Report
        </CardTitle>
        <CardDescription>Summary of daily sales and reconciliation for {reportData.date}.</CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <ReportItem icon={User} label="Rider Name" value={reportData.riderName} />
          <ReportItem icon={Truck} label="Vehicle Name" value={reportData.vehicleName} />
          <ReportItem icon={CalendarDays} label="Date" value={reportData.date} />
          <ReportItem icon={Gauge} label="Previous Meter Reading" value={reportData.previousMeterReading} />
          <ReportItem icon={Gauge} label="Current Meter Reading" value={reportData.currentMeterReading} />
          {reportData.adminOverrideLitersSold && reportData.adminOverrideLitersSold > 0 && (
            <ReportItem icon={Droplets} label="Liters Sold (Calculated from Meters)" value={(reportData.currentMeterReading - reportData.previousMeterReading).toFixed(2)} unit="L" className="text-xs text-muted-foreground" />
          )}
          <ReportItem icon={Droplets} label={litersSoldLabel} value={reportData.litersSold} unit="L" />
          <ReportItem icon={DollarSign} label="Rate Per Liter" value={reportData.ratePerLiter} unit="/L" />
          <ReportItem icon={DollarSign} label="Total Sale" value={reportData.totalSale} className="font-semibold text-primary" />
        </div>

        <Separator />

        <h3 className="text-lg font-semibold text-primary flex items-center"><DollarSign className="mr-2 h-5 w-5" />Amount Received</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 pl-2">
          <ReportItem icon={DollarSign} label="Cash Received" value={reportData.cashReceived} />
          <ReportItem icon={DollarSign} label="Online Received" value={reportData.onlineReceived} />
          <ReportItem icon={DollarSign} label="Actual Amount Received" value={reportData.actualReceived} className="font-semibold" />
        </div>
        
        <Separator />

        <h3 className="text-lg font-semibold text-primary flex items-center"><Edit3 className="mr-2 h-5 w-5" />Adjustments & Expenses</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 pl-2">
          <ReportItem icon={DollarSign} label="Due Collected (Past Dues)" value={reportData.dueCollected} />
          <ReportItem icon={DollarSign} label="New Due Amount (Today's Sale)" value={reportData.newDueAmount} />
          <ReportItem icon={DollarSign} label="Token Money" value={reportData.tokenMoney} />
          <ReportItem icon={DollarSign} label="Staff Expense" value={reportData.staffExpense} />
          <ReportItem icon={DollarSign} label="Extra Amount (Entered)" value={reportData.extraAmount} />
        </div>
        
        <Separator />

        <h3 className="text-lg font-semibold text-primary flex items-center"><BarChartBig className="mr-2 h-5 w-5" />Expected vs. Actual</h3>
        <div className="pl-2 space-y-2">
          <ReportItem icon={DollarSign} label="Initial Adjusted Expected (Pre-AI)" value={reportData.initialAdjustedExpected} />
          <Card className="bg-accent/10 border-accent">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-md text-accent-foreground flex items-center"><Info className="mr-2 h-4 w-4" />AI Suggested Adjustment</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1 pb-4">
              <p><strong className="text-accent-foreground">Adjusted Expected Amount:</strong> ₹{reportData.aiAdjustedExpectedAmount.toFixed(2)}</p>
              <p><strong className="text-accent-foreground">Reasoning:</strong> {reportData.aiReasoning}</p>
            </CardContent>
          </Card>
          <ReportItem icon={DollarSign} label="Final Adjusted Expected Amount" value={reportData.aiAdjustedExpectedAmount} className="font-semibold text-lg pt-3" />
        </div>

        <Separator />
        
        <div className="space-y-3 pt-2">
          {/* Discrepancy is Expected - Actual. Positive means shortage, Negative means overage. */}
          <ReportItem 
            icon={DollarSign} 
            label="Discrepancy" 
            value={reportData.discrepancy} // Show actual signed discrepancy
            className="text-lg font-bold" 
          />
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <Info className="mr-2 h-4 w-4" />
              <span>Status</span>
            </div>
            {getStatusBadge(reportData.status, reportData.discrepancy)}
          </div>
        </div>

        {reportData.comment && (
          <>
            <Separator />
            <h3 className="text-lg font-semibold text-primary flex items-center"><MessageSquare className="mr-2 h-5 w-5" />Comment</h3>
            <p className="text-sm text-foreground bg-muted/50 p-3 rounded-md whitespace-pre-wrap">{reportData.comment}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

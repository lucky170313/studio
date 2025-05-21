
"use client";

import type * as React from 'react';
import { useState } from 'react';
import { format as formatDateFns } from 'date-fns';
import { Water } from 'lucide-react';

import { AquaTrackForm } from '@/components/aqua-track-form';
import { AquaTrackReport } from '@/components/aqua-track-report';
import type { SalesDataFormValues, SalesReportData } from '@/lib/types';
import { adjustExpectedAmount, type AdjustExpectedAmountInput } from '@/ai/flows/adjust-expected-amount';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AquaTrackPage() {
  const [reportData, setReportData] = useState<SalesReportData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFormSubmit = async (values: SalesDataFormValues) => {
    setIsProcessing(true);
    setReportData(null);

    try {
      const totalSale = values.litersSold * values.ratePerLiter;
      const actualReceived = values.cashReceived + values.onlineReceived;
      const initialAdjustedExpected =
        totalSale -
        values.dueCollected -
        values.tokenMoney -
        values.staffExpense -
        values.extraAmount;

      const aiInput: AdjustExpectedAmountInput = {
        ...values,
        date: formatDateFns(values.date, 'yyyy-MM-dd'),
        totalSale,
        actualReceived,
        adjustedExpected: initialAdjustedExpected,
      };
      
      const aiOutput = await adjustExpectedAmount(aiInput);

      const discrepancy = actualReceived - aiOutput.adjustedExpectedAmount;
      let status: SalesReportData['status'];
      if (Math.abs(discrepancy) < 0.01) { // Tolerance for floating point
        status = 'Match';
      } else if (discrepancy < 0) {
        status = 'Shortage';
      } else {
        status = 'Overage';
      }

      setReportData({
        ...values,
        date: formatDateFns(values.date, 'PPP'), // Format date for display
        totalSale,
        actualReceived,
        initialAdjustedExpected,
        aiAdjustedExpectedAmount: aiOutput.adjustedExpectedAmount,
        aiReasoning: aiOutput.reasoning,
        discrepancy,
        status,
      });

      toast({
        title: 'Report Generated',
        description: 'Sales report has been successfully generated and analyzed.',
        variant: 'default',
      });

    } catch (error) {
      console.error('Error processing sales data:', error);
      toast({
        title: 'Error',
        description: 'Failed to process sales data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen container mx-auto px-4 py-8">
      <header className="mb-10 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-primary flex items-center justify-center">
          <Water className="mr-3 h-12 w-12" />
          AquaTrack
        </h1>
        <p className="mt-2 text-xl text-muted-foreground">
          Daily Sales & Reconciliation Reporter
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <Card className="lg:col-span-3 shadow-xl">
          <CardHeader className="bg-primary/10 rounded-t-lg">
            <CardTitle className="text-2xl text-primary">Enter Sales Data</CardTitle>
            <CardDescription>Fill in the details below to generate a sales report.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <AquaTrackForm onSubmit={handleFormSubmit} isProcessing={isProcessing} />
          </CardContent>
        </Card>
        
        <div className="lg:col-span-2">
          {isProcessing && !reportData && (
            <Card className="flex flex-col items-center justify-center h-96 shadow-xl">
              <CardContent className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg text-muted-foreground">Generating report...</p>
                <p className="text-sm text-muted-foreground">AI analysis in progress.</p>
              </CardContent>
            </Card>
          )}
          {reportData && (
            <AquaTrackReport reportData={reportData} />
          )}
          {!isProcessing && !reportData && (
             <Card className="flex flex-col items-center justify-center h-96 shadow-xl border-2 border-dashed">
              <CardContent className="text-center p-6">
                <BarChartBig className="h-16 w-16 text-muted-foreground/50 mb-4 mx-auto" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">Report Appears Here</h3>
                <p className="text-muted-foreground">Submit the form to view the generated sales report and AI analysis.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} AquaTrack. Streamlining your water delivery business.</p>
      </footer>
    </main>
  );
}

// Placeholder for Loader2 if not already defined in a shared components file.
// For this task, assuming Loader2 is imported from lucide-react.
const Loader2: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);

// Placeholder for BarChartBig, Water
const BarChartBig: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 3v18h18"/><path d="M7 12h3v-4H7Z"/><path d="M12 12h3v-7h-3Z"/><path d="M17 12h3V5h-3Z"/></svg>
);
// Water icon from lucide-react already imported.


"use client";

import * as React from 'react';
import { useState, useEffect } from 'react';
import { format as formatDateFns } from 'date-fns';
import { Droplets, Loader2, BarChartBig, UserCog, Shield } from 'lucide-react';

import { AquaTrackForm } from '@/components/aqua-track-form';
import { AquaTrackReport } from '@/components/aqua-track-report';
import type { SalesDataFormValues, SalesReportData, UserRole } from '@/lib/types';
import type { AdjustExpectedAmountInput, AdjustExpectedAmountOutput } from '@/ai/flows/adjust-expected-amount'; // Keep type import
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function AquaTrackPage() {
  const [reportData, setReportData] = useState<SalesReportData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('Team Leader');
  const [lastMeterReadingsByVehicle, setLastMeterReadingsByVehicle] = useState<Record<string, number>>({});
  const { toast } = useToast();

  const handleFormSubmit = async (values: SalesDataFormValues) => {
    setIsProcessing(true);
    setReportData(null);

    try {
      let finalLitersSold: number;
      const calculatedLitersFromMeter = values.currentMeterReading - values.previousMeterReading;

      if (currentUserRole === 'Admin' && typeof values.overrideLitersSold === 'number' && values.overrideLitersSold > 0) {
        finalLitersSold = values.overrideLitersSold;
      } else {
        finalLitersSold = calculatedLitersFromMeter;
      }
      
      if (finalLitersSold < 0) {
        toast({
          title: 'Validation Error',
          description: 'Liters sold cannot be negative. Please check meter readings or override value.',
          variant: 'destructive',
        });
        setIsProcessing(false);
        return;
      }

      const totalSale = finalLitersSold * values.ratePerLiter;
      const actualReceived = values.cashReceived + values.onlineReceived;
      const submissionDate = values.date instanceof Date ? values.date : new Date();
      
      const initialAdjustedExpected =
        totalSale -
        values.dueCollected -
        values.tokenMoney -
        values.staffExpense -
        values.extraAmount;

      // Bypassing AI call as per user request to avoid API/billing errors
      const aiOutput: AdjustExpectedAmountOutput = {
        adjustedExpectedAmount: initialAdjustedExpected,
        reasoning: "AI analysis bypassed. Using initial system calculation for adjusted expected amount.",
      };
      
      const discrepancy = actualReceived - aiOutput.adjustedExpectedAmount;
      let status: SalesReportData['status'];
      if (Math.abs(discrepancy) < 0.01) {
        status = 'Match';
      } else if (discrepancy < 0) {
        status = 'Shortage';
      } else {
        status = 'Overage';
      }

      const newReportData: SalesReportData = {
        ...values, 
        date: formatDateFns(submissionDate, 'PPP'),
        previousMeterReading: values.previousMeterReading,
        currentMeterReading: values.currentMeterReading,
        litersSold: finalLitersSold,
        adminOverrideLitersSold: (currentUserRole === 'Admin' && typeof values.overrideLitersSold === 'number' && values.overrideLitersSold > 0) ? values.overrideLitersSold : undefined,
        totalSale,
        actualReceived,
        initialAdjustedExpected,
        aiAdjustedExpectedAmount: aiOutput.adjustedExpectedAmount,
        aiReasoning: aiOutput.reasoning,
        discrepancy,
        status,
      };
      setReportData(newReportData);

      if (values.vehicleName && typeof values.currentMeterReading === 'number') {
        setLastMeterReadingsByVehicle(prevReadings => ({
          ...prevReadings,
          [values.vehicleName as string]: values.currentMeterReading // Ensure vehicleName is string
        }));
      }

      toast({
        title: 'Report Generated',
        description: 'Sales report has been successfully generated.',
        variant: 'default',
      });

    } catch (error) {
      console.error('Error processing sales data:', error);
      let errorMessage = 'Failed to process sales data. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);


  return (
    <main className="min-h-screen container mx-auto px-4 py-8">
      <header className="mb-10 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-primary flex items-center justify-center">
          <Droplets className="mr-3 h-12 w-12" />
          AquaTrack
        </h1>
        <p className="mt-2 text-xl text-muted-foreground">
          Daily Sales & Reconciliation Reporter
        </p>
      </header>

      <Card className="mb-8 shadow-md">
        <CardHeader>
          <CardTitle className="text-xl text-primary flex items-center"><UserCog className="mr-2 h-5 w-5"/>Select User Role</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            defaultValue="Team Leader"
            onValueChange={(value: UserRole) => {
              setCurrentUserRole(value);
              setReportData(null); 
            }}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Team Leader" id="role-tl" />
              <Label htmlFor="role-tl" className="flex items-center"><Shield className="mr-1 h-4 w-4 text-blue-500"/>Team Leader</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Admin" id="role-admin" />
              <Label htmlFor="role-admin" className="flex items-center"><UserCog className="mr-1 h-4 w-4 text-red-500"/>Admin</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <Card className="lg:col-span-3 shadow-xl">
          <CardHeader className="bg-primary/10 rounded-t-lg">
            <CardTitle className="text-2xl text-primary">Enter Sales Data ({currentUserRole})</CardTitle>
            <CardDescription>Fill in the details below to generate a sales report. Previous meter readings are session-based.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <AquaTrackForm 
              onSubmit={handleFormSubmit} 
              isProcessing={isProcessing} 
              currentUserRole={currentUserRole}
              lastMeterReadingsByVehicle={lastMeterReadingsByVehicle}
            />
          </CardContent>
        </Card>
        
        <div className="lg:col-span-2">
          {isProcessing && !reportData && (
            <Card className="flex flex-col items-center justify-center h-96 shadow-xl">
              <CardContent className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg text-muted-foreground">Generating report...</p>
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
                <p className="text-muted-foreground">Submit the form to view the generated sales report.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <footer className="mt-12 text-center text-sm text-muted-foreground">
         {currentYear !== null ? <p>&copy; {currentYear} AquaTrack. Streamlining your water delivery business.</p> : <p>Loading year...</p>}
      </footer>
    </main>
  );
}

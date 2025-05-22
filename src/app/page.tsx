
"use client";

import * as React from 'react';
import { useState, useEffect } from 'react';
import { format as formatDateFns } from 'date-fns';
import { Droplets, Loader2, BarChartBig, UserCog, Shield, UserPlus, Edit3, Trash2, XCircle, Eye, PieChart } from 'lucide-react';
import Link from 'next/link';

import { AquaTrackForm } from '@/components/aqua-track-form';
import { AquaTrackReport } from '@/components/aqua-track-report';
import type { SalesDataFormValues, SalesReportData, UserRole } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// MongoDB specific imports
import dbConnect from '@/lib/dbConnect';
import SalesReportModel from '@/models/SalesReport.js'; // Using .js extension as per the model file

const LAST_METER_READINGS_KEY = 'lastMeterReadingsByVehicle';
const RIDER_NAMES_KEY = 'riderNames';
const DEFAULT_RIDER_NAMES = ['Rider John', 'Rider Jane', 'Rider Alex'];

interface AdjustExpectedAmountOutput {
  adjustedExpectedAmount: number;
  reasoning: string;
}


export default function AquaTrackPage() {
  const [reportData, setReportData] = useState<SalesReportData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('Team Leader');
  const [lastMeterReadingsByVehicle, setLastMeterReadingsByVehicle] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  const [riderNames, setRiderNames] = useState<string[]>([]);
  const [riderNameInput, setRiderNameInput] = useState('');
  const [editingRiderOriginalName, setEditingRiderOriginalName] = useState<string | null>(null);


  useEffect(() => {
    try {
      const storedReadings = localStorage.getItem(LAST_METER_READINGS_KEY);
      if (storedReadings) {
        const parsedReadings = JSON.parse(storedReadings);
        if (typeof parsedReadings === 'object' && parsedReadings !== null) {
          setLastMeterReadingsByVehicle(parsedReadings);
        }
      }
    } catch (error) {
      console.error("Failed to parse lastMeterReadingsByVehicle from localStorage", error);
      setLastMeterReadingsByVehicle({});
    }

    try {
      const storedRiderNames = localStorage.getItem(RIDER_NAMES_KEY);
      if (storedRiderNames) {
        const parsedRiderNames = JSON.parse(storedRiderNames);
        if (Array.isArray(parsedRiderNames) && parsedRiderNames.every(name => typeof name === 'string')) {
          setRiderNames(parsedRiderNames.length > 0 ? parsedRiderNames : DEFAULT_RIDER_NAMES);
        } else {
          setRiderNames(DEFAULT_RIDER_NAMES);
        }
      } else {
        setRiderNames(DEFAULT_RIDER_NAMES);
      }
    } catch (error) {
      console.error("Failed to parse riderNames from localStorage", error);
      setRiderNames(DEFAULT_RIDER_NAMES);
    }
    
    setCurrentYear(new Date().getFullYear());
  }, []);


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
      const submissionDateObject = values.date instanceof Date ? values.date : new Date();
      
      const initialAdjustedExpected =
        totalSale -
        values.dueCollected -
        values.tokenMoney -
        values.staffExpense -
        values.extraAmount;
      
      const aiOutput: AdjustExpectedAmountOutput = {
        adjustedExpectedAmount: initialAdjustedExpected,
        reasoning: "AI analysis bypassed. Using initial system calculation.",
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
        date: formatDateFns(submissionDateObject, 'PPP'), 
        firestoreDate: submissionDateObject, 
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
      
      // Save to MongoDB
      try {
        await dbConnect();
        const reportToSave = { ...newReportData };
        // Remove optional fields if they are undefined, as Mongoose might handle them, but explicit is safer
        if (reportToSave.adminOverrideLitersSold === undefined) delete reportToSave.adminOverrideLitersSold;
        if (reportToSave.comment === undefined) delete reportToSave.comment;

        const salesReportEntry = new SalesReportModel(reportToSave);
        await salesReportEntry.save();
        
        toast({
          title: 'Report Generated & Saved to MongoDB',
          description: 'Sales report has been successfully generated and saved to MongoDB.',
          variant: 'default',
        });
      } catch (e) {
        console.error("Error saving document to MongoDB: ", e);
        let dbErrorMessage = 'Failed to save sales report to MongoDB. Report is generated locally.';
        if (e instanceof Error) {
            dbErrorMessage = `MongoDB Error: ${e.message}. Report generated locally.`;
        }
        toast({
          title: 'Database Error',
          description: dbErrorMessage,
          variant: 'destructive',
        });
      }

      setReportData(newReportData); 

      if (values.vehicleName && typeof values.currentMeterReading === 'number') {
        const updatedReadings = {
          ...lastMeterReadingsByVehicle,
          [values.vehicleName as string]: values.currentMeterReading
        };
        setLastMeterReadingsByVehicle(updatedReadings);
        localStorage.setItem(LAST_METER_READINGS_KEY, JSON.stringify(updatedReadings));
      }

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

  const handleRiderNameInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRiderNameInput(e.target.value);
  };

  const handleAddOrUpdateRider = () => {
    if (!riderNameInput.trim()) {
      toast({ title: "Error", description: "Rider name cannot be empty.", variant: "destructive" });
      return;
    }
    let updatedRiderNames;
    if (editingRiderOriginalName) {
      if (riderNames.includes(riderNameInput.trim()) && riderNameInput.trim() !== editingRiderOriginalName) {
        toast({ title: "Error", description: "This rider name already exists.", variant: "destructive" });
        return;
      }
      updatedRiderNames = riderNames.map(name =>
        name === editingRiderOriginalName ? riderNameInput.trim() : name
      );
      setEditingRiderOriginalName(null);
      toast({ title: "Success", description: `Rider "${editingRiderOriginalName}" updated to "${riderNameInput.trim()}".` });
    } else {
      if (riderNames.includes(riderNameInput.trim())) {
        toast({ title: "Error", description: "This rider name already exists.", variant: "destructive" });
        return;
      }
      updatedRiderNames = [...riderNames, riderNameInput.trim()];
      toast({ title: "Success", description: `Rider "${riderNameInput.trim()}" added.` });
    }
    setRiderNames(updatedRiderNames);
    localStorage.setItem(RIDER_NAMES_KEY, JSON.stringify(updatedRiderNames));
    setRiderNameInput('');
  };

  const handleEditRiderSetup = (nameToEdit: string) => {
    setRiderNameInput(nameToEdit);
    setEditingRiderOriginalName(nameToEdit);
  };

  const handleCancelEditRider = () => {
    setRiderNameInput('');
    setEditingRiderOriginalName(null);
  };

  const handleDeleteRider = (nameToDelete: string) => {
    if (window.confirm(`Are you sure you want to delete rider "${nameToDelete}"?`)) {
      const updatedRiderNames = riderNames.filter(name => name !== nameToDelete);
      setRiderNames(updatedRiderNames);
      localStorage.setItem(RIDER_NAMES_KEY, JSON.stringify(updatedRiderNames));
      toast({ title: "Success", description: `Rider "${nameToDelete}" deleted.` });
      if (editingRiderOriginalName === nameToDelete) {
        handleCancelEditRider();
      }
    }
  };
  

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
        <CardContent className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
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
          {currentUserRole === 'Admin' && (
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <Link href="/admin/view-data" passHref>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Eye className="mr-2 h-4 w-4" /> View All Sales Data
                </Button>
              </Link>
              <Link href="/admin/rider-monthly-report" passHref>
                <Button variant="outline" className="w-full sm:w-auto">
                  <PieChart className="mr-2 h-4 w-4" /> Rider Monthly Report
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {currentUserRole === 'Admin' && (
        <Card className="mb-8 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl text-primary flex items-center">
              <UserCog className="mr-2 h-5 w-5" />Manage Riders
            </CardTitle>
            <CardDescription>Add, edit, or delete rider names. Changes are saved in your browser.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2 items-end">
              <div className="flex-grow">
                <Label htmlFor="riderNameInput">Rider Name</Label>
                <Input
                  id="riderNameInput"
                  type="text"
                  value={riderNameInput}
                  onChange={handleRiderNameInputChange}
                  placeholder={editingRiderOriginalName ? "Enter new name" : "Enter new rider name"}
                  className="text-base"
                />
              </div>
              <Button onClick={handleAddOrUpdateRider} className="h-10">
                {editingRiderOriginalName ? <Edit3 className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                {editingRiderOriginalName ? 'Update Rider' : 'Add Rider'}
              </Button>
              {editingRiderOriginalName && (
                <Button onClick={handleCancelEditRider} variant="outline" className="h-10">
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Edit
                </Button>
              )}
            </div>
            {riderNames.length > 0 ? (
              <div>
                <h4 className="text-md font-medium mb-2">Current Riders:</h4>
                <ul className="space-y-2 max-h-48 overflow-y-auto border p-3 rounded-md">
                  {riderNames.map(name => (
                    <li key={name} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <span className="text-sm">{name}</span>
                      <div className="space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleEditRiderSetup(name)} aria-label={`Edit ${name}`}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteRider(name)} aria-label={`Delete ${name}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No riders added yet.</p>
            )}
          </CardContent>
        </Card>
      )}


      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <Card className="lg:col-span-3 shadow-xl">
          <CardHeader className="bg-primary/10 rounded-t-lg">
            <CardTitle className="text-2xl text-primary">Enter Sales Data ({currentUserRole})</CardTitle>
            <CardDescription>Fill in the details below to generate a sales report. Previous meter readings and rider list are persisted in browser. Data is saved to MongoDB.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <AquaTrackForm 
              onSubmit={handleFormSubmit} 
              isProcessing={isProcessing} 
              currentUserRole={currentUserRole}
              lastMeterReadingsByVehicle={lastMeterReadingsByVehicle}
              riderNames={riderNames}
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
                <p className="text-muted-foreground">Submit the form to view the generated sales report. Data is saved to MongoDB.</p>
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

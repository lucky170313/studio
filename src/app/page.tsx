
"use client";

import * as React from 'react';
import { useState, useEffect } from 'react';
import { format as formatDateFns } from 'date-fns';
import { Droplets, Loader2, BarChartBig, UserCog, Shield, UserPlus, Edit3, Trash2, XCircle, Eye, PieChart, DollarSign, BarChartHorizontal, IndianRupee, Clock, Users, LogIn, AlertCircleIcon } from 'lucide-react';
import Link from 'next/link';

import { AquaTrackForm } from '@/components/aqua-track-form';
import { AquaTrackReport } from '@/components/aqua-track-report';
import type { SalesDataFormValues, SalesReportData, UserRole } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { saveSalesReportAction } from './actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const LAST_METER_READINGS_KEY = 'lastMeterReadingsByVehicleAquaTrackApp';
const RIDER_NAMES_KEY = 'riderNamesAquaTrackApp';
const DEFAULT_RIDER_NAMES = ['Rider Alpha', 'Rider Bravo', 'Rider Charlie'];
const RIDER_SALARIES_KEY = 'riderSalariesAquaTrackApp';
const GLOBAL_RATE_PER_LITER_KEY = 'globalRatePerLiterAquaTrackApp';
const DEFAULT_GLOBAL_RATE = 0.0;

// --- Simulated Credentials ---
const ADMIN_USER_ID = "lucky170313";
const ADMIN_PASSWORD = "northpole";
const TEAM_LEADER_USER_ID = "leader01";
const TEAM_LEADER_PASSWORD = "leaderpass";
// --- End Simulated Credentials ---

export default function AquaTrackPage() {
  const [reportData, setReportData] = useState<SalesReportData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastMeterReadingsByVehicle, setLastMeterReadingsByVehicle] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  const [riderNames, setRiderNames] = useState<string[]>([]);
  const [riderNameInput, setRiderNameInput] = useState('');
  const [editingRiderOriginalName, setEditingRiderOriginalName] = useState<string | null>(null);

  const [riderSalaries, setRiderSalaries] = useState<Record<string, number>>({});
  const [selectedRiderForSalary, setSelectedRiderForSalary] = useState<string>('');
  const [salaryInput, setSalaryInput] = useState<string>('');

  const [globalRatePerLiter, setGlobalRatePerLiter] = useState<number>(DEFAULT_GLOBAL_RATE);
  const [rateInput, setRateInput] = useState<string>(String(DEFAULT_GLOBAL_RATE));

  const [pendingFormValues, setPendingFormValues] = useState<SalesDataFormValues | null>(null);
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(false);

  // --- Login State ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [loggedInUsername, setLoggedInUsername] = useState<string | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  // --- End Login State ---


  useEffect(() => {
    setCurrentYear(new Date().getFullYear());

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
    }

    try {
      const storedRiderNames = localStorage.getItem(RIDER_NAMES_KEY);
      if (storedRiderNames) {
        const parsedRiderNames = JSON.parse(storedRiderNames);
        if (Array.isArray(parsedRiderNames) && parsedRiderNames.every(name => typeof name === 'string')) {
          setRiderNames(parsedRiderNames.length > 0 ? parsedRiderNames : [...DEFAULT_RIDER_NAMES]);
        } else {
          setRiderNames([...DEFAULT_RIDER_NAMES]);
        }
      } else {
        setRiderNames([...DEFAULT_RIDER_NAMES]);
        localStorage.setItem(RIDER_NAMES_KEY, JSON.stringify(DEFAULT_RIDER_NAMES));
      }
    } catch (error) {
      console.error("Failed to parse riderNames from localStorage", error);
      setRiderNames([...DEFAULT_RIDER_NAMES]);
    }

    try {
      const storedSalaries = localStorage.getItem(RIDER_SALARIES_KEY);
      if (storedSalaries) {
        const parsedSalaries = JSON.parse(storedSalaries);
        if (typeof parsedSalaries === 'object' && parsedSalaries !== null) {
          setRiderSalaries(parsedSalaries);
        }
      }
    } catch (error) {
      console.error("Failed to parse riderSalaries from localStorage", error);
    }

    try {
      const storedRate = localStorage.getItem(GLOBAL_RATE_PER_LITER_KEY);
      if (storedRate) {
        const parsedRate = parseFloat(storedRate);
        if (!isNaN(parsedRate)) {
          setGlobalRatePerLiter(parsedRate);
          setRateInput(String(parsedRate));
        } else {
          setRateInput(String(DEFAULT_GLOBAL_RATE));
        }
      } else {
         setRateInput(String(DEFAULT_GLOBAL_RATE));
      }
    } catch (error) {
      console.error("Failed to parse globalRatePerLiter from localStorage", error);
       setRateInput(String(DEFAULT_GLOBAL_RATE));
    }
  }, []);

  const handleLogin = () => {
    if (usernameInput === ADMIN_USER_ID && passwordInput === ADMIN_PASSWORD) {
      setIsLoggedIn(true);
      setCurrentUserRole('Admin');
      setLoggedInUsername(ADMIN_USER_ID);
      setLoginError(null);
      setUsernameInput('');
      setPasswordInput('');
    } else if (usernameInput === TEAM_LEADER_USER_ID && passwordInput === TEAM_LEADER_PASSWORD) {
      setIsLoggedIn(true);
      setCurrentUserRole('Team Leader');
      setLoggedInUsername(TEAM_LEADER_USER_ID);
      setLoginError(null);
      setUsernameInput('');
      setPasswordInput('');
    } else {
      setLoginError("Invalid User ID or Password.");
      setIsLoggedIn(false);
      setCurrentUserRole(null);
      setLoggedInUsername(null);
    }
  };

  const handleFormSubmit = async (values: SalesDataFormValues) => {
    setPendingFormValues(values);
    setIsConfirmationDialogOpen(true);
    setReportData(null);
  };

  const executeReportGeneration = async () => {
    if (!pendingFormValues || !loggedInUsername) return;

    setIsProcessing(true);
    const values = pendingFormValues;

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
        setPendingFormValues(null);
        setIsConfirmationDialogOpen(false);
        return;
      }

      const totalSale = finalLitersSold * values.ratePerLiter;
      const actualReceived = values.cashReceived + values.onlineReceived;
      const submissionDateObject = values.date instanceof Date ? values.date : new Date();

      // Updated formula for initialAdjustedExpected & discrepancy
      const initialAdjustedExpected =
        totalSale +
        values.dueCollected -
        values.newDueAmount - // Added newDueAmount
        values.tokenMoney -
        values.staffExpense -
        values.extraAmount;
      
      const discrepancy = 
        (totalSale + values.dueCollected) - 
        (values.cashReceived + values.onlineReceived + values.newDueAmount + values.tokenMoney + values.extraAmount + values.staffExpense);

      // AI is bypassed, use initial values
      const aiAdjustedExpectedAmount = initialAdjustedExpected;
      const aiReasoning = "AI analysis currently bypassed. Using initial system calculation.";
      
      let status: SalesReportData['status'];
      if (Math.abs(discrepancy) < 0.01) {
        status = 'Match';
      } else if (discrepancy > 0) { // Expected more than received -> Shortage
        status = 'Shortage';
      } else { // Received more than expected -> Overage
        status = 'Overage';
      }

      const riderPerDaySalary = riderSalaries[values.riderName] || 0;
      const hoursWorked = values.hoursWorked || 9; 
      const dailySalaryCalculated = (riderPerDaySalary / 9) * hoursWorked;

      let commissionEarned = 0;
      if (finalLitersSold > 2000) {
        commissionEarned = (finalLitersSold - 2000) * 0.10;
      }

      const newReportData: Omit<SalesReportData, 'id' | '_id'> = {
        date: formatDateFns(submissionDateObject, 'PPP'),
        firestoreDate: submissionDateObject, 
        riderName: values.riderName,
        vehicleName: values.vehicleName,
        previousMeterReading: values.previousMeterReading,
        currentMeterReading: values.currentMeterReading,
        litersSold: finalLitersSold,
        adminOverrideLitersSold: (currentUserRole === 'Admin' && typeof values.overrideLitersSold === 'number' && values.overrideLitersSold > 0) ? values.overrideLitersSold : undefined,
        ratePerLiter: values.ratePerLiter,
        cashReceived: values.cashReceived,
        onlineReceived: values.onlineReceived,
        dueCollected: values.dueCollected,
        newDueAmount: values.newDueAmount,
        tokenMoney: values.tokenMoney,
        staffExpense: values.staffExpense,
        extraAmount: values.extraAmount,
        hoursWorked: hoursWorked,
        dailySalaryCalculated: dailySalaryCalculated,
        commissionEarned: commissionEarned,
        comment: values.comment || "",
        recordedBy: loggedInUsername, // Use logged-in user's username
        totalSale,
        actualReceived,
        initialAdjustedExpected,
        aiAdjustedExpectedAmount,
        aiReasoning,
        discrepancy,
        status,
      };

      const reportToSaveForMongoDB = { ...newReportData };
      if (reportToSaveForMongoDB.adminOverrideLitersSold === undefined) {
        delete reportToSaveForMongoDB.adminOverrideLitersSold;
      }
      if (reportToSaveForMongoDB.comment === undefined || reportToSaveForMongoDB.comment === "") {
         delete reportToSaveForMongoDB.comment;
      }
       if (reportToSaveForMongoDB.dailySalaryCalculated === undefined) {
        reportToSaveForMongoDB.dailySalaryCalculated = 0;
      }
      if (reportToSaveForMongoDB.commissionEarned === undefined) {
        reportToSaveForMongoDB.commissionEarned = 0;
      }

      const result = await saveSalesReportAction(reportToSaveForMongoDB);

      if (result.success && result.id) {
        toast({
          title: 'Report Generated & Saved to MongoDB',
          description: result.message,
          variant: 'default',
        });
        setReportData({ ...newReportData, id: result.id });
      } else {
        toast({
          title: 'Database Error (MongoDB)',
          description: result.message || "Failed to save to MongoDB.",
          variant: 'destructive',
        });
        setReportData({ ...newReportData, id: `local-preview-${Date.now()}` });
      }

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
      setPendingFormValues(null);
      setIsConfirmationDialogOpen(false);
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
    const trimmedRiderName = riderNameInput.trim();
    if (editingRiderOriginalName) {
      if (riderNames.includes(trimmedRiderName) && trimmedRiderName !== editingRiderOriginalName) {
        toast({ title: "Error", description: "This rider name already exists.", variant: "destructive" });
        return;
      }
      updatedRiderNames = riderNames.map(name =>
        name === editingRiderOriginalName ? trimmedRiderName : name
      );
      if (editingRiderOriginalName !== trimmedRiderName && riderSalaries[editingRiderOriginalName] !== undefined) {
        const updatedSalaries = { ...riderSalaries };
        updatedSalaries[trimmedRiderName] = updatedSalaries[editingRiderOriginalName];
        delete updatedSalaries[editingRiderOriginalName];
        setRiderSalaries(updatedSalaries);
        localStorage.setItem(RIDER_SALARIES_KEY, JSON.stringify(updatedSalaries));
      }
      setEditingRiderOriginalName(null);
      toast({ title: "Success", description: `Rider "${editingRiderOriginalName}" updated to "${trimmedRiderName}".` });
    } else {
      if (riderNames.includes(trimmedRiderName)) {
        toast({ title: "Error", description: "This rider name already exists.", variant: "destructive" });
        return;
      }
      updatedRiderNames = [...riderNames, trimmedRiderName];
      toast({ title: "Success", description: `Rider "${trimmedRiderName}" added.` });
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
    if (window.confirm(`Are you sure you want to delete rider "${nameToDelete}"? This will also remove their salary information.`)) {
      const updatedRiderNames = riderNames.filter(name => name !== nameToDelete);
      setRiderNames(updatedRiderNames);
      localStorage.setItem(RIDER_NAMES_KEY, JSON.stringify(updatedRiderNames));

      const updatedSalaries = { ...riderSalaries };
      delete updatedSalaries[nameToDelete];
      setRiderSalaries(updatedSalaries);
      localStorage.setItem(RIDER_SALARIES_KEY, JSON.stringify(updatedSalaries));
      if (selectedRiderForSalary === nameToDelete) {
        setSelectedRiderForSalary('');
        setSalaryInput('');
      }

      toast({ title: "Success", description: `Rider "${nameToDelete}" deleted.` });
      if (editingRiderOriginalName === nameToDelete) {
        handleCancelEditRider();
      }
    }
  };

  const handleSetRiderSalary = () => {
    if (!selectedRiderForSalary) {
      toast({ title: "Error", description: "Please select a rider.", variant: "destructive" });
      return;
    }
    const salaryValue = parseFloat(salaryInput);
    if (isNaN(salaryValue) || salaryValue < 0) {
      toast({ title: "Error", description: "Please enter a valid positive salary.", variant: "destructive" });
      return;
    }
    const updatedSalaries = { ...riderSalaries, [selectedRiderForSalary]: salaryValue };
    setRiderSalaries(updatedSalaries);
    localStorage.setItem(RIDER_SALARIES_KEY, JSON.stringify(updatedSalaries));
    toast({ title: "Success", description: `Salary for ${selectedRiderForSalary} set to ₹${salaryValue}/day.` });
  };

  const handleSetGlobalRate = () => {
    const newRate = parseFloat(rateInput);
    if (isNaN(newRate) || newRate < 0) {
      toast({ title: "Error", description: "Please enter a valid positive rate.", variant: "destructive" });
      return;
    }
    setGlobalRatePerLiter(newRate);
    localStorage.setItem(GLOBAL_RATE_PER_LITER_KEY, String(newRate));
    toast({ title: "Success", description: `Global rate per liter set to ₹${newRate.toFixed(2)}.` });
  };

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
                <Droplets className="h-10 w-10 text-primary" />
                <h1 className="text-3xl font-bold text-primary ml-2">AquaTrack Login</h1>
            </div>
            <CardDescription>Please login to access the application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loginError && (
              <Alert variant="destructive">
                <AlertCircleIcon className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>{loginError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">User ID</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your User ID"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="text-base"
              />
            </div>
            <Button onClick={handleLogin} className="w-full text-lg py-3">
              <LogIn className="mr-2 h-5 w-5" /> Login
            </Button>
            <CardDescription className="text-xs text-center pt-2">
              Prototype Login: Admin (lucky170313/northpole) or Team Leader (leader01/leaderpass).
            </CardDescription>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen container mx-auto px-4 py-8">
      <header className="mb-10 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-primary flex items-center justify-center">
          <Droplets className="mr-3 h-12 w-12" />
          AquaTrack
        </h1>
        <p className="mt-2 text-xl text-muted-foreground">
          Daily Sales & Reconciliation Reporter (MongoDB Version)
        </p>
         <p className="mt-1 text-sm text-green-600">Logged in as: {loggedInUsername} (Role: {currentUserRole})</p>
      </header>

      <AlertDialog open={isConfirmationDialogOpen} onOpenChange={setIsConfirmationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Report Generation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to generate and save this sales report? Please review the details before confirming.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setPendingFormValues(null);
              setIsConfirmationDialogOpen(false);
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeReportGeneration}>Confirm & Generate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {currentUserRole === 'Admin' && (
        <>
          <Card className="mb-8 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl text-primary flex items-center"><Shield className="mr-2 h-5 w-5"/>Admin Dashboard</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row flex-wrap gap-2 mt-4 sm:mt-0">
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
                <Link href="/admin/monthly-summary" passHref>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <BarChartHorizontal className="mr-2 h-4 w-4" /> Monthly Sales Summary
                  </Button>
                </Link>
                 <Link href="/admin/user-monthly-cash-report" passHref>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Users className="mr-2 h-4 w-4" /> User Cash Report
                  </Button>
                </Link>
              </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <Card className="shadow-md">
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
                    <h4 className="text-md font-medium mb-2 mt-4">Current Riders:</h4>
                    <ul className="space-y-2 max-h-48 overflow-y-auto border p-3 rounded-md">
                      {riderNames.map(name => (
                        <li key={name} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                          <span className="text-sm">{name}</span>
                          <div className="space-x-1">
                            <Button size="sm" variant="outline" onClick={() => handleEditRiderSetup(name)} aria-label={`Edit ${name}`}>
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteRider(name)} aria-label={`Delete ${name}`}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No riders added yet. Add some riders to see them here and in the form dropdown.</p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-xl text-primary flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />Manage Rider Salaries (Per Day)
                </CardTitle>
                <CardDescription>Set the per-day salary for each rider (for a full 9-hour day). Used for monthly report calculations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2 sm:items-end">
                  <div className="flex-1">
                    <Label htmlFor="selectRiderForSalary">Select Rider</Label>
                    <Select value={selectedRiderForSalary} onValueChange={(value) => {
                      setSelectedRiderForSalary(value);
                      setSalaryInput(riderSalaries[value]?.toString() || '');
                    }}>
                      <SelectTrigger id="selectRiderForSalary">
                        <SelectValue placeholder="Select a rider" />
                      </SelectTrigger>
                      <SelectContent>
                        {riderNames.length > 0 ? riderNames.map(name => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        )) : <SelectItem value="" disabled>No riders available</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:w-40">
                    <Label htmlFor="salaryInput">Full Day Salary (₹)</Label>
                    <Input
                      id="salaryInput"
                      type="number"
                      value={salaryInput}
                      onChange={(e) => setSalaryInput(e.target.value)}
                      placeholder="e.g., 500"
                      disabled={!selectedRiderForSalary}
                      className="text-base"
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <Button onClick={handleSetRiderSalary} disabled={!selectedRiderForSalary} className="w-full sm:w-auto">
                    Set Full Day Salary
                  </Button>
                </div>
                {Object.keys(riderSalaries).length > 0 && (
                   <div className="mt-4">
                    <h4 className="text-md font-medium mb-2">Current Full Day Salaries:</h4>
                      <ul className="space-y-2 max-h-48 overflow-y-auto border p-3 rounded-md">
                        {riderNames.filter(name => riderSalaries[name] !== undefined).map(name => (
                          <li key={name} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                            <span className="text-sm">{name}</span>
                            <span className="text-sm font-medium">₹{riderSalaries[name]}/day</span>
                          </li>
                        ))}
                      </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-xl text-primary flex items-center">
                  <IndianRupee className="mr-2 h-5 w-5" />Manage Global Rate Per Liter
                </CardTitle>
                <CardDescription>Set the default rate per liter used in new entries. Saved in your browser.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="globalRateInput">Global Rate (₹/Liter)</Label>
                  <div className="flex space-x-2 items-center">
                    <Input
                      id="globalRateInput"
                      type="number"
                      value={rateInput}
                      onChange={(e) => setRateInput(e.target.value)}
                      placeholder="e.g., 2.5"
                      className="text-base"
                    />
                    <Button onClick={handleSetGlobalRate}>Set Rate</Button>
                  </div>
                   <p className="text-sm text-muted-foreground mt-2">Current global rate: ₹{globalRatePerLiter.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}


      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <Card className="lg:col-span-3 shadow-xl">
          <CardHeader className="bg-primary/10 rounded-t-lg">
            <CardTitle className="text-2xl text-primary">Enter Sales Data ({currentUserRole})</CardTitle>
            <CardDescription>Fill in the details below to generate a sales report. Previous meter readings, rider list, and global rate are persisted in browser. Data is saved to MongoDB.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <AquaTrackForm
              onSubmit={handleFormSubmit}
              isProcessing={isProcessing}
              currentUserRole={currentUserRole || 'Team Leader'} 
              lastMeterReadingsByVehicle={lastMeterReadingsByVehicle}
              riderNames={riderNames}
              persistentRatePerLiter={globalRatePerLiter}
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
                <p className="text-muted-foreground">Submit the form and confirm to view the generated sales report. Data is saved to MongoDB.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <footer className="mt-12 text-center text-sm text-muted-foreground">
         {currentYear !== null ? <p>&copy; {currentYear} AquaTrack. Streamlining your water delivery business. (MongoDB Version)</p> : <p>Loading year...</p>}
      </footer>
    </main>
  );
}

    
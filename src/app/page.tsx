
"use client";

import * as React from 'react';
import { useState, useEffect } from 'react';
import { format as formatDateFns } from 'date-fns';
import { Droplets, Loader2, BarChartBig, UserCog, Shield, UserPlus, Edit3, Trash2, XCircle, Eye, PieChart, DollarSign, BarChartHorizontal, IndianRupee, Clock, Users, LogIn, LogOut, AlertCircleIcon, FileSpreadsheet, KeyRound, UsersRound, ListChecks, Landmark, History, RefreshCw } from 'lucide-react';
import Link from 'next/link';

import { AquaTrackForm } from '@/components/aqua-track-form';
import { AquaTrackReport } from '@/components/aqua-track-report';
import type { SalesDataFormValues, SalesReportData, UserRole, UserCredentials, SalesReportServerData, Rider } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  saveSalesReportAction,
  verifyUserAction,
  initializeDefaultAdminAction,
  changeAdminPasswordAction,
  addTeamLeaderAction,
  updateTeamLeaderPasswordAction,
  deleteTeamLeaderAction,
  getTeamLeadersAction,
  addRiderAction,
  getRidersAction,
  updateRiderAction,
  deleteRiderAction
} from './actions';
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

const GLOBAL_RATE_PER_LITER_KEY = 'globalRatePerLiterDropAquaTrackApp';
const DEFAULT_GLOBAL_RATE = 0.0;
const LOGIN_SESSION_KEY = 'loginSessionDropAquaTrackApp';


export default function AquaTrackPage() {
  const [reportData, setReportData] = useState<SalesReportData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  const [riders, setRiders] = useState<Rider[]>([]);
  const [isLoadingRiders, setIsLoadingRiders] = useState(false);
  const [riderNameInput, setRiderNameInput] = useState('');
  const [editingRider, setEditingRider] = useState<Rider | null>(null);

  const [selectedRiderIdForSalary, setSelectedRiderIdForSalary] = useState<string>('');
  const [salaryInput, setSalaryInput] = useState<string>('');

  const [globalRatePerLiter, setGlobalRatePerLiter] = useState<number>(DEFAULT_GLOBAL_RATE);
  const [rateInput, setRateInput] = useState<string>(String(DEFAULT_GLOBAL_RATE));

  const [pendingFormValues, setPendingFormValues] = useState<SalesDataFormValues | null>(null);
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [loggedInUsername, setLoggedInUsername] = useState<string | null>(null);

  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [teamLeaders, setTeamLeaders] = useState<UserCredentials[]>([]);
  const [tlUserIdInput, setTlUserIdInput] = useState('');
  const [tlPasswordInput, setTlPasswordInput] = useState('');
  const [editingTlOriginalUserId, setEditingTlOriginalUserId] = useState<string | null>(null);


  const fetchTeamLeaders = async () => {
    if (isLoggedIn && currentUserRole === 'Admin') {
      const result = await getTeamLeadersAction();
      if (result.success && result.teamLeaders) {
        setTeamLeaders(result.teamLeaders);
      } else {
        toast({ title: "Error", description: result.message || "Failed to fetch team leaders.", variant: "destructive" });
        setTeamLeaders([]);
      }
    }
  };

  const fetchRiders = async () => {
    if (!isLoggedIn) return; // Only fetch if logged in
    setIsLoadingRiders(true);
    try {
      const result = await getRidersAction();
      if (result.success && result.riders) {
        setRiders(result.riders);
      } else {
        toast({ title: "Error", description: result.message || "Failed to fetch riders.", variant: "destructive" });
        setRiders([]);
      }
    } catch (error: any) {
      toast({ title: "Error", description: `Failed to fetch riders: ${error.message}`, variant: "destructive" });
      setRiders([]);
    } finally {
      setIsLoadingRiders(false);
    }
  };

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());

    initializeDefaultAdminAction().then(res => {
      console.log(res.message);
    });

    try {
      const storedSession = localStorage.getItem(LOGIN_SESSION_KEY);
      if (storedSession) {
        const session = JSON.parse(storedSession);
        if (session.isLoggedIn && session.loggedInUsername && session.currentUserRole) {
          setIsLoggedIn(true);
          setCurrentUserRole(session.currentUserRole);
          setLoggedInUsername(session.loggedInUsername);
        }
      }
    } catch (error) { console.error("Failed to parse login session from localStorage", error); }

    try {
      const storedRate = localStorage.getItem(GLOBAL_RATE_PER_LITER_KEY);
      if (storedRate) {
        const parsedRate = parseFloat(storedRate);
        if (!isNaN(parsedRate)) {
          setGlobalRatePerLiter(parsedRate);
          setRateInput(String(parsedRate));
        } else {
          setGlobalRatePerLiter(DEFAULT_GLOBAL_RATE);
          setRateInput(String(DEFAULT_GLOBAL_RATE));
        }
      } else {
        setGlobalRatePerLiter(DEFAULT_GLOBAL_RATE);
        setRateInput(String(DEFAULT_GLOBAL_RATE));
        localStorage.setItem(GLOBAL_RATE_PER_LITER_KEY, String(DEFAULT_GLOBAL_RATE));
      }
    } catch (error) {
      console.error("Failed to parse globalRatePerLiter from localStorage", error);
      setGlobalRatePerLiter(DEFAULT_GLOBAL_RATE);
      setRateInput(String(DEFAULT_GLOBAL_RATE));
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      if (currentUserRole === 'Admin') {
        fetchTeamLeaders();
      }
      fetchRiders(); // Fetch riders whenever login status changes to logged in
    } else {
      setRiders([]); // Clear riders if not logged in
      setTeamLeaders([]);
    }
  }, [isLoggedIn, currentUserRole]);

  const saveLoginSession = (loggedIn: boolean, role: UserRole | null, username: string | null) => {
    if (loggedIn && role && username) {
      localStorage.setItem(LOGIN_SESSION_KEY, JSON.stringify({ isLoggedIn: true, currentUserRole: role, loggedInUsername: username }));
    } else {
      localStorage.removeItem(LOGIN_SESSION_KEY);
    }
  };

  const handleLogin = async () => {
    setLoginError(null);
    if (!usernameInput.trim() || !passwordInput.trim()) {
      setLoginError("User ID and Password are required.");
      return;
    }
    const result = await verifyUserAction(usernameInput, passwordInput);
    if (result.success && result.user) {
      setIsLoggedIn(true);
      setCurrentUserRole(result.user.role);
      setLoggedInUsername(result.user.userId);
      setLoginError(null);
      saveLoginSession(true, result.user.role, result.user.userId);
      setUsernameInput('');
      setPasswordInput('');
      // Fetching riders and team leaders is now handled by the useEffect hook based on isLoggedIn
    } else {
      setLoginError(result.message || "Invalid User ID or Password.");
      setIsLoggedIn(false);
      setCurrentUserRole(null);
      setLoggedInUsername(null);
      saveLoginSession(false, null, null);
      setPasswordInput('');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUserRole(null);
    setLoggedInUsername(null);
    saveLoginSession(false, null, null);
    // Clearing riders and teamLeaders is handled by useEffect based on isLoggedIn
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
  };

  const executeReportGeneration = async () => {
    if (!pendingFormValues || !loggedInUsername) return;

    setIsProcessing(true);
    const values = pendingFormValues;

    try {
      let finalLitersSold: number;
      const calculatedLitersFromMeter = values.currentMeterReading - values.previousMeterReading;

      if (currentUserRole === 'Admin' && typeof values.overrideLitersSold === 'number' && values.overrideLitersSold >= 0) {
        finalLitersSold = values.overrideLitersSold;
      } else {
        finalLitersSold = calculatedLitersFromMeter;
      }

      if (finalLitersSold < 0) {
        toast({ title: 'Validation Error', description: 'Liters sold cannot be negative. Check meter readings or override value.', variant: 'destructive'});
        setIsProcessing(false); setIsConfirmationDialogOpen(false); setPendingFormValues(null);
        return;
      }

      const totalSale = finalLitersSold * values.ratePerLiter;
      const actualReceived = values.cashReceived + values.onlineReceived;
      const submissionDateObject = values.date instanceof Date ? values.date : new Date(values.date);

      const initialAdjustedExpected = totalSale + values.dueCollected - values.newDueAmount - values.tokenMoney - values.staffExpense - values.extraAmount;
      const discrepancy = initialAdjustedExpected - actualReceived;

      const aiAdjustedExpectedAmount = initialAdjustedExpected;
      const aiReasoning = "AI analysis currently bypassed. Using initial system calculation.";

      let status: SalesReportData['status'];
      if (Math.abs(discrepancy) < 0.01) status = 'Match';
      else if (discrepancy > 0) status = 'Shortage';
      else status = 'Overage';

      const selectedRiderForSalaryCalc = riders.find(r => r.name === values.riderName);
      const riderPerDaySalary = selectedRiderForSalaryCalc ? selectedRiderForSalaryCalc.perDaySalary : 0;

      const hoursWorked = values.hoursWorked || 9;
      const dailySalaryCalculated = (riderPerDaySalary / 9) * hoursWorked;
      let commissionEarned = 0;
      if (finalLitersSold > 2000) commissionEarned = (finalLitersSold - 2000) * 0.10;

      const reportToSave: SalesReportServerData = {
        date: formatDateFns(submissionDateObject, 'PPP'),
        firestoreDate: submissionDateObject,
        riderName: values.riderName,
        vehicleName: values.vehicleName,
        previousMeterReading: values.previousMeterReading,
        currentMeterReading: values.currentMeterReading,
        litersSold: finalLitersSold,
        adminOverrideLitersSold: (currentUserRole === 'Admin' && typeof values.overrideLitersSold === 'number' && values.overrideLitersSold >= 0) ? values.overrideLitersSold : undefined,
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
        recordedBy: loggedInUsername,
        totalSale, actualReceived, initialAdjustedExpected,
        aiAdjustedExpectedAmount, aiReasoning, discrepancy, status,
      };

      const dbResult = await saveSalesReportAction(reportToSave);

      if (dbResult.success && dbResult.id) {
        toast({ title: 'Report Generated & Saved', description: 'Data saved successfully to database.', variant: 'default' });
        const fullReportDataForDisplay: SalesReportData = {
          ...reportToSave,
          _id: dbResult.id,
          id: dbResult.id,
        };
        setReportData(fullReportDataForDisplay);
      } else {
        toast({ title: 'Database Error', description: dbResult.message || "Failed to save sales report.", variant: 'destructive' });
         const localPreviewReportData: SalesReportData = {
            ...reportToSave,
            _id: `local-preview-${Date.now()}`,
            id: `local-preview-${Date.now()}`,
        };
        setReportData(localPreviewReportData);
      }
    } catch (error) {
      console.error('Error processing sales data:', error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to process sales data.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
      setPendingFormValues(null);
      setIsConfirmationDialogOpen(false);
    }
  };

  const handleFormSubmit = (values: SalesDataFormValues) => {
    setPendingFormValues(values);
    setIsConfirmationDialogOpen(true);
    setReportData(null);
  };

  const handleRiderNameInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setRiderNameInput(e.target.value);

  const handleAddOrUpdateRider = async () => {
    if (!riderNameInput.trim()) {
      toast({ title: "Error", description: "Rider name cannot be empty.", variant: "destructive" });
      return;
    }
    const trimmedRiderName = riderNameInput.trim();
    let result;

    if (editingRider) { // Editing existing rider's name
      if (trimmedRiderName === editingRider.name) { // No change in name
        toast({ title: "Info", description: "No changes made to rider name." });
        handleCancelEditRider();
        return;
      }
      result = await updateRiderAction(editingRider._id, { name: trimmedRiderName });
    } else { // Adding new rider
      result = await addRiderAction({ name: trimmedRiderName, perDaySalary: 0 }); // Default salary 0
    }

    if (result.success) {
      toast({ title: "Success", description: result.message });
      await fetchRiders();
      handleCancelEditRider();
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  };

  const handleEditRiderSetup = (riderToEdit: Rider) => {
    setEditingRider(riderToEdit);
    setRiderNameInput(riderToEdit.name);
  };

  const handleCancelEditRider = () => {
    setRiderNameInput('');
    setEditingRider(null);
  };

  const handleDeleteRider = async (riderToDelete: Rider) => {
    if (window.confirm(`Are you sure you want to delete rider "${riderToDelete.name}"? This action cannot be undone.`)) {
      const result = await deleteRiderAction(riderToDelete._id);
      if (result.success) {
        toast({ title: "Success", description: result.message });
        if (selectedRiderIdForSalary === riderToDelete._id) {
          setSelectedRiderIdForSalary('');
          setSalaryInput('');
        }
        if (editingRider && editingRider._id === riderToDelete._id) {
            handleCancelEditRider();
        }
        await fetchRiders();
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    }
  };

  const handleSetRiderSalary = async () => {
    if (!selectedRiderIdForSalary) {
      toast({ title: "Error", description: "Please select a rider.", variant: "destructive" });
      return;
    }
    const salaryValue = parseFloat(salaryInput);
    if (isNaN(salaryValue) || salaryValue < 0) {
      toast({ title: "Error", description: "Please enter a valid positive salary.", variant: "destructive" });
      return;
    }

    const result = await updateRiderAction(selectedRiderIdForSalary, { perDaySalary: salaryValue });
    if (result.success) {
      toast({ title: "Success", description: `Salary for ${result.rider?.name} updated to ₹${salaryValue}/day.` });
      await fetchRiders(); // Re-fetch to update the list and potentially the selected rider's display salary
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
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

  const handleChangeAdminPassword = async () => {
    if (!adminPasswordInput.trim()) {
      toast({ title: "Error", description: "New password cannot be empty.", variant: "destructive" });
      return;
    }
    if (!loggedInUsername) {
         toast({ title: "Error", description: "You must be logged in to change the password.", variant: "destructive" });
        return;
    }
    const result = await changeAdminPasswordAction(loggedInUsername, adminPasswordInput.trim());
    if (result.success) {
      setAdminPasswordInput('');
      toast({ title: "Success", description: result.message });
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  };

  const handleAddOrUpdateTeamLeader = async () => {
    if (!tlUserIdInput.trim() || !tlPasswordInput.trim()) {
      toast({ title: "Error", description: "Team Leader User ID and Password cannot be empty.", variant: "destructive" });
      return;
    }
    const userId = tlUserIdInput.trim();
    const password = tlPasswordInput.trim();

    let result;
    if (editingTlOriginalUserId) {
      result = await updateTeamLeaderPasswordAction(editingTlOriginalUserId, password);
      if (result.success) {
        setEditingTlOriginalUserId(null);
      }
    } else {
      result = await addTeamLeaderAction(userId, password);
    }

    if (result.success) {
      toast({ title: "Success", description: result.message });
      await fetchTeamLeaders();
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
    setTlUserIdInput('');
    setTlPasswordInput('');
  };

  const handleEditTlSetup = (tl: UserCredentials) => {
    setTlUserIdInput(tl.userId);
    setTlPasswordInput('');
    setEditingTlOriginalUserId(tl.userId);
  };

  const handleCancelEditTl = () => {
    setTlUserIdInput('');
    setTlPasswordInput('');
    setEditingTlOriginalUserId(null);
  };

  const handleDeleteTeamLeader = async (userIdToDelete: string) => {
    if (window.confirm(`Are you sure you want to delete Team Leader "${userIdToDelete}"?`)) {
      const result = await deleteTeamLeaderAction(userIdToDelete);
      if (result.success) {
        toast({ title: "Success", description: result.message });
        await fetchTeamLeaders();
        if (editingTlOriginalUserId === userIdToDelete) handleCancelEditTl();
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    }
  };


  if (!isLoggedIn) {
    return (
      <main className="min-h-screen container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
                <Droplets className="h-10 w-10 text-primary" />
                <h1 className="text-3xl font-bold text-primary ml-2">Drop Aqua Track Login</h1>
            </div>
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
              <Input id="username" type="text" placeholder="Enter your User ID" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} className="text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="Enter your password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="text-base" />
            </div>
            <Button onClick={handleLogin} className="w-full text-lg py-3">
              <LogIn className="mr-2 h-5 w-5" /> Login
            </Button>
          </CardContent>
        </Card>
         <footer className="mt-12 text-center text-sm text-muted-foreground">
            {currentYear !== null ? <p>&copy; {currentYear} Drop Aqua Track. Streamlining your water delivery business.</p> : <p>Loading year...</p>}
        </footer>
      </main>
    );
  }

  return (
    <main className="min-h-screen container mx-auto px-4 py-8">
      <header className="mb-6 text-center">
        <div className="flex justify-between items-center mb-2">
            <div className="flex-1"></div> {}
            <h1 className="text-5xl font-extrabold tracking-tight text-primary flex items-center justify-center flex-1">
              <Droplets className="mr-3 h-12 w-12" />
              Drop Aqua Track
            </h1>
            <div className="flex-1 flex justify-end">
                {isLoggedIn && (
                    <Button onClick={handleLogout} variant="outline">
                        <LogOut className="mr-2 h-4 w-4"/> Logout ({loggedInUsername})
                    </Button>
                )}
            </div>
        </div>
        <p className="mt-1 text-xl text-muted-foreground">
          Daily Sales & Reconciliation Reporter
        </p>
         {isLoggedIn && <p className="mt-1 text-sm text-green-600">Logged in as: {loggedInUsername} (Role: {currentUserRole})</p>}
      </header>

      <AlertDialog open={isConfirmationDialogOpen} onOpenChange={setIsConfirmationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirm Report Generation</AlertDialogTitle><AlertDialogDescription>Are you sure you want to generate and save this sales report? Please review the details before confirming.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => { setPendingFormValues(null); setIsConfirmationDialogOpen(false); }}>Cancel</AlertDialogCancel><AlertDialogAction onClick={executeReportGeneration}>Confirm & Generate</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="mb-8 shadow-md">
        <CardHeader>
          <CardTitle className="text-xl text-primary flex items-center"><Shield className="mr-2 h-5 w-5"/>Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row flex-wrap gap-2 mt-4 sm:mt-0">
            {(currentUserRole === 'Admin' || currentUserRole === 'TeamLeader') && (
                <>
                    <Link href="/admin/rider-monthly-report" passHref><Button variant="outline" className="w-full sm:w-auto"><PieChart className="mr-2 h-4 w-4" /> Rider Monthly Report</Button></Link>
                    <Link href="/admin/user-monthly-cash-report" passHref><Button variant="outline" className="w-full sm:w-auto"><Users className="mr-2 h-4 w-4" /> Collector's Monthly Cash Report</Button></Link>
                    <Link href="/salary-payment" passHref><Button variant="outline" className="w-full sm:w-auto"><Landmark className="mr-2 h-4 w-4" /> Salary Payment Entry</Button></Link>
                    <Link href="/salary-history" passHref><Button variant="outline" className="w-full sm:w-auto"><History className="mr-2 h-4 w-4" /> Salary Payment History</Button></Link>
                </>
            )}
            {currentUserRole === 'Admin' && (
                <>
                    <Link href="/admin/view-data" passHref><Button variant="outline" className="w-full sm:w-auto"><Eye className="mr-2 h-4 w-4" /> View All Sales Data</Button></Link>
                    <Link href="/admin/monthly-summary" passHref><Button variant="outline" className="w-full sm:w-auto"><BarChartHorizontal className="mr-2 h-4 w-4" /> Monthly Sales Summary</Button></Link>
                </>
            )}
          </CardContent>
      </Card>

      {currentUserRole === 'Admin' && (
        <>
          <Alert variant="destructive" className="mb-6">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertTitle>Security Warning!</AlertTitle>
            <AlertDescription>
              The user and password management below uses a **PROTOTYPE** system with credentials stored in **PLAINTEXT** in the database.
              This is **HIGHLY INSECURE** and for demonstration only. Real applications require secure password hashing.
            </AlertDescription>
          </Alert>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card className="shadow-md">
              <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="text-xl text-primary flex items-center"><UserCog className="mr-2 h-5 w-5" />Manage Riders</CardTitle>
                    <Button variant="ghost" size="sm" onClick={fetchRiders} disabled={isLoadingRiders}>
                        <RefreshCw className={cn("h-4 w-4", isLoadingRiders && "animate-spin")} />
                    </Button>
                </div>
                <CardDescription>Add, edit, or delete rider names. Changes are saved in database.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2 items-end">
                  <div className="flex-grow"><Label htmlFor="riderNameInput">Rider Name</Label><Input id="riderNameInput" type="text" value={riderNameInput} onChange={handleRiderNameInputChange} placeholder={editingRider ? "Enter new name" : "Enter new rider name"} className="text-base"/></div>
                  <Button onClick={handleAddOrUpdateRider} className="h-10">{editingRider ? <Edit3 className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}{editingRider ? 'Update Rider' : 'Add Rider'}</Button>
                  {editingRider && (<Button onClick={handleCancelEditRider} variant="outline" className="h-10"><XCircle className="mr-2 h-4 w-4" />Cancel</Button>)}
                </div>
                {isLoadingRiders ? <Loader2 className="h-6 w-6 animate-spin text-primary"/> : riders.length > 0 ? (<div><h4 className="text-md font-medium mb-2 mt-4">Current Riders:</h4><ul className="space-y-2 max-h-48 overflow-y-auto border p-3 rounded-md">{riders.map(r => (<li key={r._id} className="flex items-center justify-between p-2 bg-muted/30 rounded"><span className="text-sm">{r.name}</span><div className="space-x-1"><Button size="sm" variant="outline" onClick={() => handleEditRiderSetup(r)} aria-label={`Edit ${r.name}`}><Edit3 className="h-3 w-3" /></Button><Button size="sm" variant="destructive" onClick={() => handleDeleteRider(r)} aria-label={`Delete ${r.name}`}><Trash2 className="h-3 w-3" /></Button></div></li>))}</ul></div>) : (<p className="text-sm text-muted-foreground">No riders added yet. Click 'Add Rider' to start.</p>)}
              </CardContent>
            </Card>

            <Card className="shadow-md">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-xl text-primary flex items-center"><DollarSign className="mr-2 h-5 w-5" />Manage Rider Salaries (Per Day)</CardTitle>
                         <Button variant="ghost" size="sm" onClick={fetchRiders} disabled={isLoadingRiders}>
                            <RefreshCw className={cn("h-4 w-4", isLoadingRiders && "animate-spin")} />
                        </Button>
                    </div>
                    <CardDescription>Set per-day salary (for 9-hour day). Used for monthly report calculations. Stored in database.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:space-x-2 sm:items-end">
                        <div className="flex-1">
                            <Label htmlFor="selectRiderForSalary">Select Rider</Label>
                            <Select 
                                value={selectedRiderIdForSalary} 
                                onValueChange={(value) => { 
                                    setSelectedRiderIdForSalary(value); 
                                    const selected = riders.find(r => r._id === value);
                                    setSalaryInput(selected ? String(selected.perDaySalary) : '');
                                }}
                                disabled={isLoadingRiders || riders.length === 0}
                            >
                                <SelectTrigger id="selectRiderForSalary"><SelectValue placeholder="Select a rider" /></SelectTrigger>
                                <SelectContent>{riders.length > 0 ? riders.map(r => (<SelectItem key={r._id} value={r._id}>{r.name}</SelectItem>)) : <SelectItem value="" disabled>No riders available</SelectItem>}</SelectContent>
                            </Select>
                        </div>
                        <div className="sm:w-40">
                            <Label htmlFor="salaryInput">Full Day Salary (₹)</Label>
                            <Input id="salaryInput" type="number" value={salaryInput} onChange={(e) => setSalaryInput(e.target.value)} placeholder="e.g., 500" disabled={!selectedRiderIdForSalary || isLoadingRiders} className="text-base"/>
                        </div>
                    </div>
                    <div className="mt-2">
                        <Button onClick={handleSetRiderSalary} disabled={!selectedRiderIdForSalary || isLoadingRiders} className="w-full sm:w-auto">Set Full Day Salary</Button>
                    </div>
                    {isLoadingRiders ? <Loader2 className="h-6 w-6 animate-spin text-primary"/> : Object.keys(riders).length > 0 && (<div className="mt-4"><h4 className="text-md font-medium mb-2">Current Full Day Salaries:</h4><ul className="space-y-2 max-h-48 overflow-y-auto border p-3 rounded-md">{riders.map(r => (<li key={r._id} className="flex items-center justify-between p-2 bg-muted/30 rounded"><span className="text-sm">{r.name}</span><span className="text-sm font-medium">₹{r.perDaySalary}/day</span></li>))}</ul></div>)}
                </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader><CardTitle className="text-xl text-primary flex items-center"><IndianRupee className="mr-2 h-5 w-5" />Manage Global Rate Per Liter</CardTitle><CardDescription>Set default rate per liter for new entries. Data saved in browser.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div><Label htmlFor="globalRateInput">Global Rate (₹/Liter)</Label><div className="flex space-x-2 items-center"><Input id="globalRateInput" type="number" value={rateInput} onChange={(e) => setRateInput(e.target.value)} placeholder="e.g., 2.5" className="text-base"/><Button onClick={handleSetGlobalRate}>Set Rate</Button></div><p className="text-sm text-muted-foreground mt-2">Current global rate: ₹{globalRatePerLiter.toFixed(2)}</p></div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="shadow-md">
              <CardHeader><CardTitle className="text-xl text-primary flex items-center"><KeyRound className="mr-2 h-5 w-5" />Change Admin Password</CardTitle><CardDescription>Change password for currently logged in Admin: {loggedInUsername}</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div><Label htmlFor="newAdminPassword">New Admin Password</Label><Input id="newAdminPassword" type="password" value={adminPasswordInput} onChange={(e) => setAdminPasswordInput(e.target.value)} placeholder="Enter new password" className="text-base"/></div>
                <Button onClick={handleChangeAdminPassword}>Update Admin Password</Button>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader><CardTitle className="text-xl text-primary flex items-center"><UsersRound className="mr-2 h-5 w-5" />Manage Team Leaders</CardTitle><CardDescription>Add, edit passwords, or delete Team Leader accounts. Changes are saved in database.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <div><Label htmlFor="tlUserIdInput">Team Leader User ID</Label><Input id="tlUserIdInput" type="text" value={tlUserIdInput} onChange={(e) => setTlUserIdInput(e.target.value)} placeholder="Enter User ID" className="text-base" disabled={!!editingTlOriginalUserId}/></div>
                  <div><Label htmlFor="tlPasswordInput">Team Leader Password</Label><Input id="tlPasswordInput" type="password" value={tlPasswordInput} onChange={(e) => setTlPasswordInput(e.target.value)} placeholder="Enter Password" className="text-base"/></div>
                </div>
                <div className="flex space-x-2 items-center">
                    <Button onClick={handleAddOrUpdateTeamLeader} className="h-10">{editingTlOriginalUserId ? <Edit3 className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}{editingTlOriginalUserId ? 'Update TL Password' : 'Add Team Leader'}</Button>
                    {editingTlOriginalUserId && (<Button onClick={handleCancelEditTl} variant="outline" className="h-10"><XCircle className="mr-2 h-4 w-4" />Cancel Edit</Button>)}
                </div>

                {teamLeaders.length > 0 ? (<div><h4 className="text-md font-medium mb-2 mt-4">Current Team Leaders:</h4><ul className="space-y-2 max-h-48 overflow-y-auto border p-3 rounded-md">{teamLeaders.map(tl => (<li key={tl.userId} className="flex items-center justify-between p-2 bg-muted/30 rounded"><span className="text-sm">ID: {tl.userId}</span><div className="space-x-1"><Button size="sm" variant="outline" onClick={() => handleEditTlSetup(tl)} aria-label={`Edit ${tl.userId}`}><Edit3 className="h-3 w-3" /></Button><Button size="sm" variant="destructive" onClick={() => handleDeleteTeamLeader(tl.userId)} aria-label={`Delete ${tl.userId}`}><Trash2 className="h-3 w-3" /></Button></div></li>))}</ul></div>) : (<p className="text-sm text-muted-foreground">No Team Leaders added yet.</p>)}
              </CardContent>
            </Card>
          </div>
        </>
      )}


      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <Card className="lg:col-span-3 shadow-xl">
          <CardHeader className="bg-primary/10 rounded-t-lg"><CardTitle className="text-2xl text-primary flex items-center"><ListChecks className="mr-2 h-6 w-6"/>Enter Sales Data</CardTitle><CardDescription>Fill in the details below to generate a sales report. Previous meter readings are fetched from DB. Rider list sourced from DB. Global rate is persisted in browser. Data is saved to database.</CardDescription></CardHeader>
          <CardContent className="p-6">
            <AquaTrackForm
              onSubmit={handleFormSubmit}
              isProcessing={isProcessing || isLoadingRiders}
              currentUserRole={currentUserRole || 'TeamLeader'}
              ridersFromDB={riders.map(r => r.name)} // Pass only names to the form
              persistentRatePerLiter={globalRatePerLiter}
            />
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          {isProcessing && !reportData && (<Card className="flex flex-col items-center justify-center h-96 shadow-xl"><CardContent className="text-center"><Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /><p className="text-lg text-muted-foreground">Generating report...</p></CardContent></Card>)}
          {reportData && (<AquaTrackReport reportData={reportData} />)}
          {!isProcessing && !reportData && (<Card className="flex flex-col items-center justify-center h-96 shadow-xl border-2 border-dashed"><CardContent className="text-center p-6"><BarChartBig className="h-16 w-16 text-muted-foreground/50 mb-4 mx-auto" /><h3 className="text-xl font-semibold text-muted-foreground mb-2">Report Appears Here</h3><p className="text-muted-foreground">Submit the form and confirm to view the generated sales report. Data is saved to database.</p></CardContent></Card>)}
        </div>
      </div>
      <footer className="mt-12 text-center text-sm text-muted-foreground">
         {currentYear !== null ? <p>&copy; {currentYear} Drop Aqua Track. Streamlining your water delivery business.</p> : <p>Loading year...</p>}
      </footer>
    </main>
  );
}

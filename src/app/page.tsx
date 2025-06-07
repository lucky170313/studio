
"use client";

import * as React from 'react';
import { useState, useEffect } from 'react';
import { format as formatDateFns } from 'date-fns';
import { Droplets, Loader2, BarChartBig, UserCog, Shield, UserPlus, Edit3, Trash2, XCircle, Eye, PieChart, DollarSign, BarChartHorizontal, IndianRupee, Clock, Users, LogIn, LogOut, AlertCircleIcon, FileSpreadsheet, KeyRound, UsersRound, ListChecks, Landmark, History, RefreshCw, Info, CheckCircle, AlertTriangle, MessageSquare, Gauge, Truck, CalendarDays, Briefcase, Gift } from 'lucide-react';
import Link from 'next/link';

import { AquaTrackForm } from '@/components/aqua-track-form';
import { AquaTrackReport } from '@/components/aqua-track-report';
import type { SalesDataFormValues, SalesReportData, UserRole, UserCredentials, Rider } from '@/lib/types';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const GLOBAL_RATE_PER_LITER_KEY = 'globalRatePerLiterDropAquaTrackApp';
const DEFAULT_GLOBAL_RATE = 0.0;
const LOGIN_SESSION_KEY = 'loginSessionDropAquaTrackApp'; // For TeamLeaders
const ADMIN_LOGIN_SESSION_KEY = 'adminLoginSessionDropAquaTrackApp'; // For Admins (sessionStorage)

const ConfirmationDialogItem: React.FC<{ label: string; value: string | number; unit?: string; highlight?: boolean }> = ({ label, value, unit, highlight }) => (
  <div className="flex justify-between py-1">
    <span className={cn("text-sm text-muted-foreground", highlight && "font-semibold text-foreground")}>{label}:</span>
    <span className={cn("text-sm font-medium text-right", highlight && "font-semibold text-primary")}>
      {typeof value === 'number' && (label.toLowerCase().includes('rate') || label.toLowerCase().includes('sale') || label.toLowerCase().includes('received') || label.toLowerCase().includes('expected') || label.toLowerCase().includes('discrepancy') || label.toLowerCase().includes('money') || label.toLowerCase().includes('expense') || label.toLowerCase().includes('amount') || label.toLowerCase().includes('new due') || label.toLowerCase().includes('salary') || label.toLowerCase().includes('commission')) ? `₹${value.toFixed(2)}` : value}
      {unit && ` ${unit}`}
    </span>
  </div>
);


// Extracted LoginForm component
const LoginForm = ({ onLogin, username, onUsernameChange, password, onPasswordChange, loginError }: {
  onLogin: () => void;
  username: string;
  onUsernameChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  loginError: string | null;
}) => {
  return (
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
          <Input id="username" type="text" placeholder="Enter your User ID" value={username} onChange={(e) => onUsernameChange(e.target.value)} className="text-base" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => onPasswordChange(e.target.value)} className="text-base" />
        </div>
        <Button onClick={onLogin} className="w-full text-lg py-3">
          <LogIn className="mr-2 h-5 w-5" /> Login
        </Button>
      </CardContent>
    </Card>
  );
};


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

  const [pendingReportDetailsForConfirmation, setPendingReportDetailsForConfirmation] = useState<SalesReportData | null>(null);
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
      console.log("[Page Effect] Fetching team leaders as Admin.");
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
    if (!isLoggedIn) return;
    setIsLoadingRiders(true);
    console.log("[Page Effect] Fetching riders.");
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

  const saveLoginSession = (loggedIn: boolean, role: UserRole | null, username: string | null) => {
    console.log(`[saveLoginSession] Called with: loggedIn=${loggedIn}, role=${role}, username=${username}`);
    if (loggedIn && role && username) {
      const sessionData = JSON.stringify({ isLoggedIn: true, currentUserRole: role, loggedInUsername: username });
      if (role === 'Admin') {
        console.log(`[saveLoginSession] Saving Admin session to sessionStorage (${ADMIN_LOGIN_SESSION_KEY}):`, sessionData);
        sessionStorage.setItem(ADMIN_LOGIN_SESSION_KEY, sessionData);
        localStorage.removeItem(LOGIN_SESSION_KEY); 
      } else { 
        console.log(`[saveLoginSession] Saving TeamLeader session to localStorage (${LOGIN_SESSION_KEY}):`, sessionData);
        localStorage.setItem(LOGIN_SESSION_KEY, sessionData);
        sessionStorage.removeItem(ADMIN_LOGIN_SESSION_KEY); 
      }
    } else { 
      console.log(`[saveLoginSession] Clearing both Admin and TeamLeader sessions.`);
      localStorage.removeItem(LOGIN_SESSION_KEY);
      sessionStorage.removeItem(ADMIN_LOGIN_SESSION_KEY);
    }
  };

  useEffect(() => {
    console.log("[Page Initial Mount Effect] Running...");
    setCurrentYear(new Date().getFullYear());

    initializeDefaultAdminAction().then(res => {
      console.log("[Page Effect] initializeDefaultAdminAction result:", res.message, "(Success:", res.success, ")");
    });

    let sessionLoaded = false;
    let loadedRole: UserRole | null = null;
    let loadedUsername: string | null = null;

    try {
      const storedAdminSession = sessionStorage.getItem(ADMIN_LOGIN_SESSION_KEY);
      console.log("[Page Effect] Checking Admin session (sessionStorage). Found:", !!storedAdminSession);
      if (storedAdminSession) {
        const session = JSON.parse(storedAdminSession);
        if (session.isLoggedIn && session.loggedInUsername && session.currentUserRole === 'Admin') {
          loadedRole = session.currentUserRole;
          loadedUsername = session.loggedInUsername;
          sessionLoaded = true;
          console.log("[Page Effect] Admin session loaded from sessionStorage:", { role: loadedRole, username: loadedUsername });
        } else {
          console.log("[Page Effect] Malformed Admin session in sessionStorage, removing.");
          sessionStorage.removeItem(ADMIN_LOGIN_SESSION_KEY);
        }
      }
    } catch (error) {
      console.error("[Page Effect] Failed to parse admin login session from sessionStorage", error);
      sessionStorage.removeItem(ADMIN_LOGIN_SESSION_KEY);
    }

    if (!sessionLoaded) {
      try {
        const storedSession = localStorage.getItem(LOGIN_SESSION_KEY);
        console.log("[Page Effect] Checking TeamLeader session (localStorage). Found:", !!storedSession);
        if (storedSession) {
          const session = JSON.parse(storedSession);
          if (session.isLoggedIn && session.loggedInUsername && session.currentUserRole && session.currentUserRole !== 'Admin') {
            loadedRole = session.currentUserRole;
            loadedUsername = session.loggedInUsername;
            sessionLoaded = true;
            console.log("[Page Effect] TeamLeader session loaded from localStorage:", { role: loadedRole, username: loadedUsername });
          } else {
            console.log("[Page Effect] Malformed/Admin session in localStorage, removing.");
            localStorage.removeItem(LOGIN_SESSION_KEY);
          }
        }
      } catch (error) {
        console.error("[Page Effect] Failed to parse login session from localStorage", error);
        localStorage.removeItem(LOGIN_SESSION_KEY);
      }
    }
    
    if (sessionLoaded && loadedRole && loadedUsername) {
        setIsLoggedIn(true);
        setCurrentUserRole(loadedRole);
        setLoggedInUsername(loadedUsername);
        console.log("[Page Effect] Session successfully loaded and applied to state.");
    } else {
        setIsLoggedIn(false);
        setCurrentUserRole(null);
        setLoggedInUsername(null);
        console.log("[Page Effect] No valid session found. State set to logged out.");
    }


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
      console.error("[Page Effect] Failed to parse globalRatePerLiter from localStorage", error);
      setGlobalRatePerLiter(DEFAULT_GLOBAL_RATE);
      setRateInput(String(DEFAULT_GLOBAL_RATE));
    }
  }, []);

  useEffect(() => {
    console.log(`[Page Effect for LoggedIn Change] isLoggedIn: ${isLoggedIn}, currentUserRole: ${currentUserRole}`);
    if (isLoggedIn) {
      if (currentUserRole === 'Admin') {
        fetchTeamLeaders();
      }
      fetchRiders();
    } else {
      setRiders([]);
      setTeamLeaders([]);
    }
  }, [isLoggedIn, currentUserRole]);


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
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
  };

  const handleFormSubmit = (formValues: SalesDataFormValues) => {
    if (!loggedInUsername) {
        toast({ title: "Error", description: "Cannot proceed. Logged in user not found.", variant: "destructive"});
        return;
    }
    setReportData(null); // Clear previous report

    let finalLitersSold: number;
    const calculatedLitersFromMeter = formValues.currentMeterReading - formValues.previousMeterReading;

    if (currentUserRole === 'Admin' && typeof formValues.overrideLitersSold === 'number' && formValues.overrideLitersSold >= 0) {
      finalLitersSold = formValues.overrideLitersSold;
    } else {
      finalLitersSold = calculatedLitersFromMeter;
    }

    if (finalLitersSold < 0) {
      toast({ title: 'Validation Error', description: 'Liters sold cannot be negative. Check meter readings or override value.', variant: 'destructive'});
      return;
    }

    const totalSale = finalLitersSold * formValues.ratePerLiter;
    const actualReceived = formValues.cashReceived + formValues.onlineReceived;
    const submissionDateObject = formValues.date instanceof Date ? formValues.date : new Date(formValues.date);

    const initialAdjustedExpected = totalSale + formValues.dueCollected - formValues.newDueAmount - formValues.tokenMoney - formValues.staffExpense - formValues.extraAmount;
    const discrepancy = initialAdjustedExpected - actualReceived;

    const aiAdjustedExpectedAmount = initialAdjustedExpected; // Placeholder for AI logic
    const aiReasoning = "AI analysis currently bypassed. Using initial system calculation."; // Placeholder

    let status: SalesReportData['status'];
    if (Math.abs(discrepancy) < 0.01) status = 'Match';
    else if (discrepancy > 0) status = 'Shortage';
    else status = 'Overage';

    const selectedRiderForSalaryCalc = riders.find(r => r.name === formValues.riderName);
    const riderPerDaySalary = selectedRiderForSalaryCalc ? selectedRiderForSalaryCalc.perDaySalary : 0;

    const hoursWorked = formValues.hoursWorked || 9;
    const dailySalaryCalculated = (riderPerDaySalary / 9) * hoursWorked;
    let commissionEarned = 0;
    if (finalLitersSold > 2000) commissionEarned = (finalLitersSold - 2000) * 0.10;

    const reportToConfirm: SalesReportData = {
      date: formatDateFns(submissionDateObject, 'PPP'),
      firestoreDate: submissionDateObject,
      riderName: formValues.riderName,
      vehicleName: formValues.vehicleName,
      previousMeterReading: formValues.previousMeterReading,
      currentMeterReading: formValues.currentMeterReading,
      litersSold: finalLitersSold,
      adminOverrideLitersSold: (currentUserRole === 'Admin' && typeof formValues.overrideLitersSold === 'number' && formValues.overrideLitersSold >= 0) ? formValues.overrideLitersSold : undefined,
      ratePerLiter: formValues.ratePerLiter,
      cashReceived: formValues.cashReceived,
      onlineReceived: formValues.onlineReceived,
      dueCollected: formValues.dueCollected,
      newDueAmount: formValues.newDueAmount,
      tokenMoney: formValues.tokenMoney,
      staffExpense: formValues.staffExpense,
      extraAmount: formValues.extraAmount,
      hoursWorked: hoursWorked,
      dailySalaryCalculated: dailySalaryCalculated,
      commissionEarned: commissionEarned,
      comment: formValues.comment || "",
      recordedBy: loggedInUsername,
      totalSale, actualReceived, initialAdjustedExpected,
      aiAdjustedExpectedAmount, aiReasoning, discrepancy, status,
    };

    setPendingReportDetailsForConfirmation(reportToConfirm);
    setIsConfirmationDialogOpen(true);
  };

  const handleConfirmAndSaveReport = async () => {
    if (!pendingReportDetailsForConfirmation || !loggedInUsername) {
      toast({ title: "Error", description: "No report data to save or user not logged in.", variant: "destructive"});
      setIsConfirmationDialogOpen(false);
      setPendingReportDetailsForConfirmation(null);
      return;
    }

    setIsProcessing(true);
    const reportToSave = pendingReportDetailsForConfirmation;

    // Remove id and _id if they exist, as saveSalesReportAction expects Omit<...>
    const { id, _id, ...dataToSaveOnServer } = reportToSave;

    try {
      const dbResult = await saveSalesReportAction(dataToSaveOnServer);

      if (dbResult.success && dbResult.id) {
        toast({ title: 'Report Generated & Saved', description: 'Data saved successfully to database.', variant: 'default' });
        const fullReportDataForDisplay: SalesReportData = {
          ...reportToSave, // This includes all fields, including those not sent to server action if any were filtered
          _id: dbResult.id, // Use the ID from the database response
          id: dbResult.id,
        };
        setReportData(fullReportDataForDisplay);
      } else {
        toast({ title: 'Database Error', description: dbResult.message || "Failed to save sales report.", variant: 'destructive' });
        // Show local preview even if DB save fails, but with an indicator it's not saved.
        const localPreviewReportData: SalesReportData = {
            ...reportToSave,
            _id: `local-preview-${Date.now()}`, // Mark as local
            id: `local-preview-${Date.now()}`,
            status: 'Overage', // Or some other indicator of DB save failure in report if needed
        };
        setReportData(localPreviewReportData);
      }
    } catch (error) {
      console.error('Error processing sales data:', error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to process sales data.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
      setIsConfirmationDialogOpen(false);
      setPendingReportDetailsForConfirmation(null);
    }
  };


  const handleRiderNameInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setRiderNameInput(e.target.value);

  const handleAddOrUpdateRider = async () => {
    if (!riderNameInput.trim()) {
      toast({ title: "Error", description: "Rider name cannot be empty.", variant: "destructive" });
      return;
    }
    const trimmedRiderName = riderNameInput.trim();
    let result;

    if (editingRider) { 
      if (trimmedRiderName === editingRider.name) { 
        toast({ title: "Info", description: "No changes made to rider name." });
        handleCancelEditRider();
        return;
      }
      result = await updateRiderAction(editingRider._id, { name: trimmedRiderName });
    } else { 
      result = await addRiderAction({ name: trimmedRiderName, perDaySalary: 0 }); 
    }

    if (result.success) {
      toast({ title: "Success", description: `${result.message} Database record updated.` }); 
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
        toast({ title: "Success", description: `${result.message} Database record updated.` });
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
      toast({ title: "Success", description: `${result.message} Database record updated.` }); 
      await fetchRiders(); 
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
        <LoginForm
          onLogin={handleLogin}
          username={usernameInput}
          onUsernameChange={setUsernameInput}
          password={passwordInput}
          onPasswordChange={setPasswordInput}
          loginError={loginError}
        />
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
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-xl">
              <CheckCircle className="mr-2 h-6 w-6 text-primary" />
              Confirm Report Details
            </AlertDialogTitle>
            <AlertDialogDescription>
              Please review the following sales report details before saving. This action will record the data to the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {pendingReportDetailsForConfirmation && (
            <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3 text-sm my-4">
              <Card className="shadow-none border-dashed">
                <CardContent className="p-4 space-y-2">
                    <ConfirmationDialogItem label="Date" value={pendingReportDetailsForConfirmation.date} />
                    <ConfirmationDialogItem label="Rider Name" value={pendingReportDetailsForConfirmation.riderName} />
                    <ConfirmationDialogItem label="Vehicle Name" value={pendingReportDetailsForConfirmation.vehicleName} />
                    <ConfirmationDialogItem label="Hours Worked" value={pendingReportDetailsForConfirmation.hoursWorked} unit="hrs"/>
                </CardContent>
              </Card>

              <Card className="shadow-none border-dashed">
                <CardHeader className="p-0 px-4 py-2 bg-muted/30"><CardTitle className="text-base font-medium">Meter & Sales</CardTitle></CardHeader>
                <CardContent className="p-4 space-y-2">
                    <ConfirmationDialogItem label="Previous Meter" value={pendingReportDetailsForConfirmation.previousMeterReading} />
                    <ConfirmationDialogItem label="Current Meter" value={pendingReportDetailsForConfirmation.currentMeterReading} />
                    {pendingReportDetailsForConfirmation.adminOverrideLitersSold !== undefined && (
                       <ConfirmationDialogItem label="Liters Sold (Calculated from Meters)" value={(pendingReportDetailsForConfirmation.currentMeterReading - pendingReportDetailsForConfirmation.previousMeterReading).toFixed(2)} unit="L" />
                    )}
                    <ConfirmationDialogItem 
                        label={pendingReportDetailsForConfirmation.adminOverrideLitersSold !== undefined ? "Liters Sold (Admin Override)" : "Liters Sold (Calculated)"} 
                        value={pendingReportDetailsForConfirmation.litersSold} 
                        unit="L"
                        highlight
                    />
                    <ConfirmationDialogItem label="Rate Per Liter" value={pendingReportDetailsForConfirmation.ratePerLiter} />
                    <ConfirmationDialogItem label="Total Sale" value={pendingReportDetailsForConfirmation.totalSale} highlight />
                </CardContent>
              </Card>

              <Card className="shadow-none border-dashed">
                 <CardHeader className="p-0 px-4 py-2 bg-muted/30"><CardTitle className="text-base font-medium">Collections & Adjustments</CardTitle></CardHeader>
                 <CardContent className="p-4 space-y-2">
                    <ConfirmationDialogItem label="Cash Received" value={pendingReportDetailsForConfirmation.cashReceived} />
                    <ConfirmationDialogItem label="Online Received" value={pendingReportDetailsForConfirmation.onlineReceived} />
                    <ConfirmationDialogItem label="Actual Received" value={pendingReportDetailsForConfirmation.actualReceived} highlight />
                    <Separator className="my-2"/>
                    <ConfirmationDialogItem label="Due Collected (Past)" value={pendingReportDetailsForConfirmation.dueCollected} />
                    <ConfirmationDialogItem label="New Due (Today)" value={pendingReportDetailsForConfirmation.newDueAmount} />
                    <ConfirmationDialogItem label="Token Money" value={pendingReportDetailsForConfirmation.tokenMoney} />
                    <ConfirmationDialogItem label="Staff Expense" value={pendingReportDetailsForConfirmation.staffExpense} />
                    <ConfirmationDialogItem label="Extra Amount" value={pendingReportDetailsForConfirmation.extraAmount} />
                </CardContent>
              </Card>
              
              <Card className="shadow-none border-dashed">
                <CardHeader className="p-0 px-4 py-2 bg-muted/30"><CardTitle className="text-base font-medium">Reconciliation</CardTitle></CardHeader>
                <CardContent className="p-4 space-y-2">
                    <ConfirmationDialogItem label="Initial Adjusted Expected" value={pendingReportDetailsForConfirmation.initialAdjustedExpected} />
                    <ConfirmationDialogItem label="Discrepancy" value={pendingReportDetailsForConfirmation.discrepancy} highlight />
                    <div className="flex justify-between py-1">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        {pendingReportDetailsForConfirmation.status === 'Match' ? 
                            <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white"><CheckCircle className="mr-1 h-4 w-4" />Match</Badge> :
                         pendingReportDetailsForConfirmation.status === 'Shortage' ?
                            <Badge variant="destructive"><AlertTriangle className="mr-1 h-4 w-4" />Shortage</Badge> :
                            <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 text-black"><Info className="mr-1 h-4 w-4" />Overage</Badge>
                        }
                    </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-none border-dashed">
                <CardHeader className="p-0 px-4 py-2 bg-muted/30"><CardTitle className="text-base font-medium">Rider Earnings (This Entry)</CardTitle></CardHeader>
                <CardContent className="p-4 space-y-2">
                  <ConfirmationDialogItem label="Calculated Daily Salary" value={pendingReportDetailsForConfirmation.dailySalaryCalculated ?? 0} />
                  <ConfirmationDialogItem label="Commission Earned" value={pendingReportDetailsForConfirmation.commissionEarned ?? 0} />
                </CardContent>
              </Card>

              {pendingReportDetailsForConfirmation.comment && (
                 <Card className="shadow-none border-dashed">
                    <CardHeader className="p-0 px-4 py-2 bg-muted/30"><CardTitle className="text-base font-medium">Comment</CardTitle></CardHeader>
                    <CardContent className="p-4">
                        <p className="text-sm whitespace-pre-wrap">{pendingReportDetailsForConfirmation.comment}</p>
                    </CardContent>
                 </Card>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setPendingReportDetailsForConfirmation(null); setIsConfirmationDialogOpen(false); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAndSaveReport} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirm & Save Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="mb-8 shadow-md">
        <CardHeader>
          <CardTitle className="text-xl text-primary flex items-center"><Shield className="mr-2 h-5 w-5"/>Dashboard Links</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row flex-wrap gap-2 mt-4 sm:mt-0">
            {(currentUserRole === 'Admin' || currentUserRole === 'TeamLeader') && (
                <>
                    <Link href="/salary-payment" passHref><Button variant="outline" className="w-full sm:w-auto"><Landmark className="mr-2 h-4 w-4" /> Salary Payment Entry</Button></Link>
                    <Link href="/salary-history" passHref><Button variant="outline" className="w-full sm:w-auto"><History className="mr-2 h-4 w-4" /> Salary Payment History</Button></Link>
                    <Link href="/admin/rider-monthly-report" passHref><Button variant="outline" className="w-full sm:w-auto"><PieChart className="mr-2 h-4 w-4" /> Rider Monthly Report</Button></Link>
                    <Link href="/admin/user-monthly-cash-report" passHref><Button variant="outline" className="w-full sm:w-auto"><Users className="mr-2 h-4 w-4" /> Collector's Monthly Cash Report</Button></Link>
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
                                <SelectContent>{riders.length > 0 ? riders.map(r => (<SelectItem key={r._id} value={r._id}>{r.name}</SelectItem>)) : <SelectItem value="no_riders_placeholder_page" disabled>No riders available</SelectItem>}</SelectContent>
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
              ridersFromDB={riders.map(r => r.name)} 
              persistentRatePerLiter={globalRatePerLiter}
            />
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          {isProcessing && !reportData && (<Card className="flex flex-col items-center justify-center h-96 shadow-xl"><CardContent className="text-center"><Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /><p className="text-lg text-muted-foreground">Generating report...</p></CardContent></Card>)}
          {reportData && (<AquaTrackReport reportData={reportData} />)}
          {!isProcessing && !reportData && !isConfirmationDialogOpen && (<Card className="flex flex-col items-center justify-center h-96 shadow-xl border-2 border-dashed"><CardContent className="text-center p-6"><BarChartBig className="h-16 w-16 text-muted-foreground/50 mb-4 mx-auto" /><h3 className="text-xl font-semibold text-muted-foreground mb-2">Report Appears Here</h3><p className="text-muted-foreground">Submit the form and confirm to view the generated sales report. Data is saved to database.</p></CardContent></Card>)}
          {!isProcessing && !reportData && isConfirmationDialogOpen && (<Card className="flex flex-col items-center justify-center h-96 shadow-xl border-2 border-dashed"><CardContent className="text-center p-6"><ListChecks className="h-16 w-16 text-muted-foreground/50 mb-4 mx-auto" /><h3 className="text-xl font-semibold text-muted-foreground mb-2">Awaiting Confirmation</h3><p className="text-muted-foreground">Please review the details in the confirmation dialog.</p></CardContent></Card>)}
        </div>
      </div>
      <footer className="mt-12 text-center text-sm text-muted-foreground">
         {currentYear !== null ? <p>&copy; {currentYear} Drop Aqua Track. Streamlining your water delivery business.</p> : <p>Loading year...</p>}
      </footer>
    </main>
  );
}
    


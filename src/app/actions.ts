
'use server';

import dbConnect from '@/lib/dbConnect';
import SalesReportModel from '@/models/SalesReport';
import UserModel from '@/models/User';
import SalaryPaymentModel from '@/models/SalaryPayment';
import RiderModel from '@/models/Rider'; // New Rider Model
import type { SalesReportData, UserCredentials, SalaryPaymentServerData, SalaryPaymentData, RiderMonthlyAggregates, CollectorCashReportEntry, Rider } from '@/lib/types';
import { startOfMonth, endOfMonth } from 'date-fns';


interface SaveReportResult {
  success: boolean;
  message: string;
  error?: string;
  id?: string;
}

export async function saveSalesReportAction(reportData: Omit<SalesReportData, 'id' | '_id'>): Promise<SaveReportResult> {
  try {
    await dbConnect();

    const dataToSave: Omit<SalesReportData, 'id' | '_id'> = {
      date: reportData.date,
      firestoreDate: new Date(reportData.firestoreDate),
      riderName: reportData.riderName,
      vehicleName: reportData.vehicleName,
      previousMeterReading: reportData.previousMeterReading,
      currentMeterReading: reportData.currentMeterReading,
      litersSold: reportData.litersSold,
      adminOverrideLitersSold: reportData.adminOverrideLitersSold,
      ratePerLiter: reportData.ratePerLiter,
      cashReceived: reportData.cashReceived,
      onlineReceived: reportData.onlineReceived,
      dueCollected: reportData.dueCollected,
      newDueAmount: reportData.newDueAmount,
      tokenMoney: reportData.tokenMoney,
      staffExpense: reportData.staffExpense,
      extraAmount: reportData.extraAmount,
      hoursWorked: reportData.hoursWorked,
      dailySalaryCalculated: reportData.dailySalaryCalculated,
      commissionEarned: reportData.commissionEarned,
      comment: reportData.comment,
      recordedBy: reportData.recordedBy,
      totalSale: reportData.totalSale,
      actualReceived: reportData.actualReceived,
      initialAdjustedExpected: reportData.initialAdjustedExpected,
      aiAdjustedExpectedAmount: reportData.aiAdjustedExpectedAmount,
      aiReasoning: reportData.aiReasoning,
      discrepancy: reportData.discrepancy,
      status: reportData.status,
    };

    console.log("Attempting to save sales report with data:", JSON.stringify(dataToSave, null, 2));
    if (reportData.adminOverrideLitersSold !== undefined) {
      console.log(`Admin override for litersSold was used: ${reportData.adminOverrideLitersSold} L`);
    } else {
      console.log("Liters sold calculated from meter readings.");
    }


    const salesReportEntry = new SalesReportModel(dataToSave);
    const savedEntry = await salesReportEntry.save();

    console.log("Sales report saved successfully, ID:", savedEntry._id.toString());

    return {
      success: true,
      message: 'Sales report has been successfully generated and saved to database.',
      id: savedEntry._id.toString()
    };
  } catch (e: any) {
    console.error("Error saving sales report to database via Server Action: ", e);
    let dbErrorMessage = 'Failed to save sales report to database.';
    if (e.name === 'ValidationError') {
        console.error("Mongoose Validation Error details:", JSON.stringify(e.errors, null, 2));
        let validationErrors = Object.values(e.errors).map((err: any) => `${err.path}: ${err.message}`).join(', ');
        dbErrorMessage = `Database Validation Error: ${validationErrors}`;
    } else if (e instanceof Error) {
        dbErrorMessage = `Database Error: ${e.message}.`;
    }
    
    return {
      success: false,
      message: dbErrorMessage,
      error: e.message 
    };
  }
}

export async function getLastMeterReadingForVehicleAction(vehicleName: string): Promise<{ success: boolean; reading: number; message?: string }> {
  if (!vehicleName) {
    return { success: false, reading: 0, message: "Vehicle name is required." };
  }
  try {
    await dbConnect();
    const lastReport = await SalesReportModel.findOne({ vehicleName: vehicleName })
      .sort({ firestoreDate: -1 })
      .select('currentMeterReading')
      .lean();

    if (lastReport) {
      return { success: true, reading: lastReport.currentMeterReading || 0 };
    }
    return { success: true, reading: 0 };
  } catch (error: any) {
    console.error("Error fetching last meter reading:", error);
    return { success: false, reading: 0, message: `Error fetching last meter reading: ${error.message}` };
  }
}


// --- User Management Actions ---

export async function initializeDefaultAdminAction(): Promise<{ success: boolean; message: string }> {
  console.log('[initializeDefaultAdminAction] Starting initialization...');
  try {
    await dbConnect();
    console.log('[initializeDefaultAdminAction] Database connected.');
    const adminUserId = process.env.DEFAULT_ADMIN_USER_ID || "lucky170313";
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "northpole";
    console.log(`[initializeDefaultAdminAction] Default Admin User ID: ${adminUserId}`);
    console.log(`[initializeDefaultAdminAction] Default Admin Password (first 3 chars): ${adminPassword.substring(0,3)}...`);


    let adminUser = await UserModel.findOne({ userId: adminUserId, role: 'Admin' });
    
    if (!adminUser) {
      console.log('[initializeDefaultAdminAction] Default admin not found. Creating new admin...');
      adminUser = new UserModel({
        userId: adminUserId,
        password: adminPassword, // Password will be hashed by the pre-save hook
        role: 'Admin',
      });
    } else {
      console.log('[initializeDefaultAdminAction] Default admin found. Ensuring password is up to date with .env.');
      // Explicitly set the password to ensure the pre-save hook for hashing runs if it changed in .env
      adminUser.password = adminPassword;
    }
    
    await adminUser.save();
    console.log(`[initializeDefaultAdminAction] Admin user processed. Stored password (first 10 chars): ${adminUser.password ? adminUser.password.substring(0,10) : 'N/A'}...`);
    return { success: true, message: 'Default admin initialization complete in database (password hashed).' };

  } catch (error: any) {
    console.error("[initializeDefaultAdminAction] Error initializing default admin:", error);
    return { success: false, message: `Error initializing default admin: ${error.message}` };
  }
}

export async function verifyUserAction(userIdInput: string, passwordInput: string): Promise<{ success: boolean; user?: UserCredentials | null; message: string }> {
  console.log(`[verifyUserAction] Attempting to verify user: ${userIdInput}`);
  console.log(`[verifyUserAction] Password input (first 3 chars): ${passwordInput.substring(0, 3)}...`);

  try {
    await dbConnect();
    console.log('[verifyUserAction] Database connected.');

    // Fetch the full Mongoose document, not a lean object, to use instance methods
    const user = await UserModel.findOne({ userId: userIdInput });

    if (user) {
      console.log(`[verifyUserAction] User found in DB. User ID: ${user.userId}, Role: ${user.role}`);
      // Log the stored hashed password (or a portion of it for security, though for debugging it's fine to see more)
      console.log(`[verifyUserAction] Stored hashed password (first 10 chars): ${user.password ? user.password.substring(0, 10) : 'N/A'}...`);
      
      const isMatch = await user.comparePassword(passwordInput);
      console.log(`[verifyUserAction] Password comparison result for ${userIdInput}: ${isMatch}`);

      if (isMatch) {
        console.log(`[verifyUserAction] Password match for ${userIdInput}. Login successful.`);
        return { success: true, user: { userId: user.userId, role: user.role as 'Admin' | 'TeamLeader' }, message: 'Login successful.' };
      } else {
        console.log(`[verifyUserAction] Password mismatch for ${userIdInput}.`);
      }
    } else {
      console.log(`[verifyUserAction] User "${userIdInput}" not found in database.`);
    }
    return { success: false, message: 'Invalid User ID or Password.' };
  } catch (error: any) {
    console.error("[verifyUserAction] Error during user verification:", error);
    return { success: false, message: `Login error: ${error.message}` };
  }
}


export async function changeAdminPasswordAction(adminUserId: string, newPasswordInput: string): Promise<{ success: boolean; message: string }> {
  const defaultAdminId = process.env.DEFAULT_ADMIN_USER_ID || "lucky170313";
  if (adminUserId !== defaultAdminId) {
    return { success: false, message: "Unauthorized: Only the default admin can change their password through this action." };
  }
  try {
    await dbConnect();
    const admin = await UserModel.findOne({ userId: adminUserId, role: 'Admin' });
    if (!admin) {
      return { success: false, message: 'Admin user not found.' };
    }
    admin.password = newPasswordInput; // Set the new password
    await admin.save(); // The pre-save hook will hash it
    return { success: true, message: 'Admin password updated successfully in database (hashed).' };
  } catch (error: any) {
    console.error("Error changing admin password:", error);
    return { success: false, message: `Error updating password: ${error.message}` };
  }
}

export async function addTeamLeaderAction(userIdInput: string, passwordInput: string): Promise<{ success: boolean; message: string, user?: UserCredentials }> {
  const defaultAdminId = process.env.DEFAULT_ADMIN_USER_ID || "lucky170313";
  try {
    await dbConnect();
    const existingUser = await UserModel.findOne({ userId: userIdInput });
    if (existingUser) {
      return { success: false, message: `User ID "${userIdInput}" already exists.` };
    }
    if (userIdInput === defaultAdminId) {
      return { success: false, message: 'Cannot use Admin User ID for a Team Leader.' };
    }
    const newTeamLeader = new UserModel({
      userId: userIdInput,
      password: passwordInput, // Password will be hashed by the pre-save hook
      role: 'TeamLeader',
    });
    await newTeamLeader.save();
    return { success: true, message: `Team Leader "${userIdInput}" added successfully to database (password hashed).`, user: { userId: newTeamLeader.userId, role: 'TeamLeader' } };
  } catch (error: any) {
    console.error("Error adding team leader:", error);
    return { success: false, message: `Error adding team leader: ${error.message}` };
  }
}

export async function updateTeamLeaderPasswordAction(userIdInput: string, newPasswordInput: string): Promise<{ success: boolean; message: string }> {
  try {
    await dbConnect();
    const teamLeader = await UserModel.findOne({ userId: userIdInput, role: 'TeamLeader' });
    if (!teamLeader) {
      return { success: false, message: `Team Leader "${userIdInput}" not found.` };
    }
    teamLeader.password = newPasswordInput; // Set the new password
    await teamLeader.save(); // The pre-save hook will hash it
    return { success: true, message: `Password for Team Leader "${userIdInput}" updated successfully in database (hashed).` };
  } catch (error: any) {
    console.error("Error updating team leader password:", error);
    return { success: false, message: `Error updating password: ${error.message}` };
  }
}

export async function deleteTeamLeaderAction(userIdToDelete: string): Promise<{ success: boolean; message: string }> {
  try {
    await dbConnect();
    const result = await UserModel.deleteOne({ userId: userIdToDelete, role: 'TeamLeader' });
    if (result.deletedCount === 0) {
      return { success: false, message: `Team Leader "${userIdToDelete}" not found or not deleted from database.` };
    }
    return { success: true, message: `Team Leader "${userIdToDelete}" deleted successfully from database.` };
  } catch (error: any) {
    console.error("Error deleting team leader:", error);
    return { success: false, message: `Error deleting team leader: ${error.message}` };
  }
}

export async function getTeamLeadersAction(): Promise<{ success: boolean; teamLeaders?: UserCredentials[]; message: string }> {
  try {
    await dbConnect();
    const leaders = await UserModel.find({ role: 'TeamLeader' }).select('userId role').lean();
    const mappedLeaders = leaders.map(leader => ({ userId: leader.userId, role: leader.role as 'TeamLeader' } ));
    return { success: true, teamLeaders: mappedLeaders, message: 'Team leaders fetched successfully from database.' };
  } catch (error: any) {
    console.error("Error fetching team leaders:", error);
    return { success: false, message: `Error fetching team leaders: ${error.message}` };
  }
}

// --- Rider Management Actions ---
export async function addRiderAction(riderData: { name: string; perDaySalary?: number }): Promise<{ success: boolean; message: string; rider?: Rider }> {
  try {
    await dbConnect();
    const existingRider = await RiderModel.findOne({ name: riderData.name });
    if (existingRider) {
      return { success: false, message: `Rider with name "${riderData.name}" already exists.` };
    }
    const newRider = new RiderModel({
      name: riderData.name,
      perDaySalary: riderData.perDaySalary || 0,
    });
    const savedRiderDoc = await newRider.save();
    const plainRider = savedRiderDoc.toObject();

    const finalRider: Rider = {
      _id: plainRider._id.toString(),
      name: plainRider.name,
      perDaySalary: plainRider.perDaySalary,
      createdAt: plainRider.createdAt ? new Date(plainRider.createdAt).toISOString() : undefined,
      updatedAt: plainRider.updatedAt ? new Date(plainRider.updatedAt).toISOString() : undefined,
    };
    return { success: true, message: `Rider "${finalRider.name}" added successfully to the database.`, rider: finalRider };
  } catch (error: any) {
    console.error("Error adding rider:", error);
    let errorMessage = `Error adding rider: ${error.message}`;
    if (error.name === 'ValidationError') {
      errorMessage = `Validation Error: ${Object.values(error.errors).map((e: any) => e.message).join(', ')}`;
    }
    return { success: false, message: errorMessage };
  }
}

export async function getRidersAction(): Promise<{ success: boolean; riders?: Rider[]; message: string }> {
  try {
    await dbConnect();
    const ridersFromDB = await RiderModel.find({}).sort({ name: 1 }).lean();
    
    const processedRiders: Rider[] = ridersFromDB.map(dbRider => {
      const rider: Rider = {
        _id: dbRider._id.toString(),
        name: dbRider.name,
        perDaySalary: dbRider.perDaySalary,
      };
      if (dbRider.createdAt) {
        rider.createdAt = new Date(dbRider.createdAt).toISOString();
      }
      if (dbRider.updatedAt) {
        rider.updatedAt = new Date(dbRider.updatedAt).toISOString();
      }
      return rider;
    });

    return { success: true, riders: processedRiders, message: 'Riders fetched successfully from database.' };
  } catch (error: any) {
    console.error("Error fetching riders:", error);
    return { success: false, message: `Error fetching riders: ${error.message}` };
  }
}

export async function updateRiderAction(riderId: string, riderData: { name?: string; perDaySalary?: number }): Promise<{ success: boolean; message: string; rider?: Rider }> {
  try {
    await dbConnect();
    if (riderData.name) {
      const existingRiderWithNewName = await RiderModel.findOne({ name: riderData.name, _id: { $ne: riderId } });
      if (existingRiderWithNewName) {
        return { success: false, message: `Another rider with name "${riderData.name}" already exists.` };
      }
    }
    const updatedRiderDoc = await RiderModel.findByIdAndUpdate(riderId, riderData, { new: true, runValidators: true }).lean();
    if (!updatedRiderDoc) {
      return { success: false, message: 'Rider not found.' };
    }
     const finalRider: Rider = {
        _id: updatedRiderDoc._id.toString(),
        name: updatedRiderDoc.name,
        perDaySalary: updatedRiderDoc.perDaySalary,
        createdAt: updatedRiderDoc.createdAt ? new Date(updatedRiderDoc.createdAt).toISOString() : undefined,
        updatedAt: updatedRiderDoc.updatedAt ? new Date(updatedRiderDoc.updatedAt).toISOString() : undefined,
     };
    return { success: true, message: `Rider "${finalRider.name}" updated successfully in the database.`, rider: finalRider };
  } catch (error: any) {
    console.error("Error updating rider:", error);
    let errorMessage = `Error updating rider: ${error.message}`;
    if (error.name === 'ValidationError') {
      errorMessage = `Validation Error: ${Object.values(error.errors).map((e: any) => e.message).join(', ')}`;
    } else if (error.code === 11000 && error.keyValue?.name) { 
        errorMessage = `Rider name "${error.keyValue.name}" already exists.`;
    }
    return { success: false, message: errorMessage };
  }
}

export async function deleteRiderAction(riderId: string): Promise<{ success: boolean; message: string }> {
  try {
    await dbConnect();
    const result = await RiderModel.findByIdAndDelete(riderId);
    if (!result) {
      return { success: false, message: `Rider not found or already deleted from database.` };
    }
    return { success: true, message: `Rider "${result.name}" deleted successfully from the database.` };
  } catch (error: any) {
    console.error("Error deleting rider:", error);
    return { success: false, message: `Error deleting rider: ${error.message}` };
  }
}


// --- Salary Payment Actions ---
interface SaveSalaryPaymentResult {
  success: boolean;
  message: string;
  error?: string;
  id?: string;
}

export async function saveSalaryPaymentAction(paymentData: SalaryPaymentServerData): Promise<SaveSalaryPaymentResult> {
  try {
    await dbConnect();
    const dataToSave: Omit<SalaryPaymentData, '_id' | 'createdAt' | 'updatedAt' | 'remainingAmount'> & { remainingAmount: number } = {
      paymentDate: paymentData.paymentDate,
      riderName: paymentData.riderName,
      salaryGiverName: paymentData.salaryGiverName,
      salaryAmountForPeriod: paymentData.salaryAmountForPeriod,
      amountPaid: paymentData.amountPaid,
      deductionAmount: paymentData.deductionAmount || 0,
      advancePayment: paymentData.advancePayment || 0,
      comment: paymentData.comment,
      recordedBy: paymentData.recordedBy,
      remainingAmount: paymentData.salaryAmountForPeriod - paymentData.amountPaid - (paymentData.deductionAmount || 0),
    };
    const salaryPaymentEntry = new SalaryPaymentModel(dataToSave);
    const savedEntry = await salaryPaymentEntry.save();
    return {
      success: true,
      message: 'Salary payment has been successfully recorded in the database.',
      id: savedEntry._id.toString(),
    };
  } catch (e: any) {
    console.error("Error saving salary payment to database: ", e);
    let dbErrorMessage = 'Failed to save salary payment to database.';
     if (e instanceof Error) {
        dbErrorMessage = `Database Error: ${e.message}.`;
    }
    if (e.name === 'ValidationError') {
        let validationErrors = Object.values(e.errors).map((err: any) => err.message).join(', ');
        dbErrorMessage = `Database Validation Error: ${validationErrors}`;
    }
    return {
      success: false,
      message: dbErrorMessage,
      error: e.message,
    };
  }
}

export async function getSalaryPaymentsAction(): Promise<{ success: boolean; payments?: SalaryPaymentData[]; message: string }> {
  try {
    await dbConnect();
    const paymentsFromDB = await SalaryPaymentModel.find({}).sort({ paymentDate: -1 }).lean();
    
    const payments: SalaryPaymentData[] = paymentsFromDB.map(p => ({
        ...p,
        _id: p._id.toString(),
        paymentDate: new Date(p.paymentDate), 
        createdAt: p.createdAt ? new Date(p.createdAt) : undefined,
        updatedAt: p.updatedAt ? new Date(p.updatedAt) : undefined,
    })) as SalaryPaymentData[]; 
    return { success: true, payments: payments, message: 'Salary payments fetched successfully from database.' };
  } catch (error: any) {
    console.error("Error fetching salary payments:", error);
    return { success: false, message: `Error fetching salary payments: ${error.message}` };
  }
}


export async function getRiderMonthlyAggregatesAction(
  riderName: string,
  year: number,
  month: number
): Promise<{ success: boolean; aggregates?: RiderMonthlyAggregates; message: string }> {
  if (!riderName || year == null || month == null) {
    return { success: false, message: "Rider name, year, and month are required." };
  }

  try {
    await dbConnect();

    const startDate = startOfMonth(new Date(year, month));
    const endDate = endOfMonth(new Date(year, month));

    const reports = await SalesReportModel.find({
      riderName: riderName,
      firestoreDate: {
        $gte: startDate,
        $lte: endDate,
      },
    }).lean();

    if (!reports || reports.length === 0) {
      return {
        success: true,
        aggregates: {
          totalDailySalaryCalculated: 0,
          totalCommissionEarned: 0,
          totalDiscrepancy: 0,
          netMonthlyEarning: 0,
        },
        message: "No sales data found for this rider in the selected period."
      };
    }

    let totalDailySalaryCalculated = 0;
    let totalCommissionEarned = 0;
    let totalDiscrepancy = 0;

    reports.forEach(report => {
      totalDailySalaryCalculated += report.dailySalaryCalculated || 0;
      totalCommissionEarned += report.commissionEarned || 0;
      totalDiscrepancy += report.discrepancy || 0;
    });

    const netMonthlyEarning = totalDailySalaryCalculated + totalCommissionEarned - totalDiscrepancy;

    return {
      success: true,
      aggregates: {
        totalDailySalaryCalculated,
        totalCommissionEarned,
        totalDiscrepancy,
        netMonthlyEarning,
      },
      message: 'Aggregates fetched successfully from database.'
    };

  } catch (error: any) {
    console.error("Error fetching rider monthly aggregates:", error);
    return { success: false, message: `Error fetching aggregates: ${error.message}` };
  }
}

// New Server Action for Collector's Cash Report
export async function getCollectorCashReportDataAction(): Promise<{ success: boolean; data?: CollectorCashReportEntry[]; message: string }> {
  try {
    await dbConnect();
    const reportsFromDB = await SalesReportModel.find({})
      .select('_id recordedBy firestoreDate cashReceived') 
      .sort({ firestoreDate: -1 })
      .lean();

    const processedReports = reportsFromDB.map(report => ({
      _id: report._id.toString(),
      recordedBy: report.recordedBy,
      firestoreDate: new Date(report.firestoreDate), 
      cashReceived: report.cashReceived,
    }));

    return { success: true, data: processedReports as CollectorCashReportEntry[], message: 'Collector cash report data fetched successfully from database.' };
  } catch (error: any) {
    console.error("Error fetching data for collector's cash report:", error);
    return { success: false, message: `Error fetching data: ${error.message}` };
  }
}


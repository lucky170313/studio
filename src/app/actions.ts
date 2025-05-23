
'use server';

import dbConnect from '@/lib/dbConnect';
import SalesReportModel from '@/models/SalesReport';
import UserModel from '@/models/User';
import type { SalesReportData, UserCredentials } from '@/lib/types';

interface SaveReportResult {
  success: boolean;
  message: string;
  error?: string;
  id?: string;
}

export async function saveSalesReportAction(reportData: Omit<SalesReportData, 'id' | '_id'>): Promise<SaveReportResult> {
  try {
    await dbConnect();
    // Explicitly map fields to ensure all are included, especially meterReadingImageDriveLink
    const dataToSave = {
      date: reportData.date,
      firestoreDate: new Date(reportData.firestoreDate), // Ensure it's a Date object
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
      meterReadingImageDriveLink: reportData.meterReadingImageDriveLink, // Explicitly include
    };

    const salesReportEntry = new SalesReportModel(dataToSave);
    const savedEntry = await salesReportEntry.save();
    
    return { 
      success: true, 
      message: 'Sales report has been successfully generated and saved to MongoDB.',
      id: savedEntry._id.toString() 
    };
  } catch (e: any) {
    console.error("Error saving document to MongoDB via Server Action: ", e);
    let dbErrorMessage = 'Failed to save sales report to MongoDB.';
    if (e instanceof Error) {
        dbErrorMessage = `MongoDB Error: ${e.message}.`;
    }
    if (e.name === 'ValidationError') {
        let validationErrors = Object.values(e.errors).map((err: any) => err.message).join(', ');
        dbErrorMessage = `MongoDB Validation Error: ${validationErrors}`;
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

const DEFAULT_ADMIN_USER_ID = "lucky170313";
const DEFAULT_ADMIN_PASSWORD = "northpole"; // INSECURE PLAINTEXT

export async function initializeDefaultAdminAction(): Promise<{ success: boolean; message: string }> {
  try {
    await dbConnect();
    const existingAdmin = await UserModel.findOne({ userId: DEFAULT_ADMIN_USER_ID, role: 'Admin' });
    if (!existingAdmin) {
      const adminUser = new UserModel({
        userId: DEFAULT_ADMIN_USER_ID,
        password: DEFAULT_ADMIN_PASSWORD, 
        role: 'Admin',
      });
      await adminUser.save();
      return { success: true, message: 'Default admin initialized in MongoDB.' };
    }
    return { success: true, message: 'Default admin already exists in MongoDB.' };
  } catch (error: any) {
    console.error("Error initializing default admin:", error);
    return { success: false, message: `Error initializing default admin: ${error.message}` };
  }
}

export async function verifyUserAction(userIdInput: string, passwordInput: string): Promise<{ success: boolean; user?: UserCredentials | null; message: string }> {
  try {
    await dbConnect();
    const user = await UserModel.findOne({ userId: userIdInput }).lean();

    if (user && user.password === passwordInput) { 
      return { success: true, user: { userId: user.userId, role: user.role as 'Admin' | 'TeamLeader' }, message: 'Login successful.' };
    }
    return { success: false, message: 'Invalid User ID or Password.' };
  } catch (error: any) {
    console.error("Error verifying user:", error);
    return { success: false, message: `Login error: ${error.message}` };
  }
}

export async function changeAdminPasswordAction(adminUserId: string, newPasswordInput: string): Promise<{ success: boolean; message: string }> {
  if (adminUserId !== DEFAULT_ADMIN_USER_ID) { 
    return { success: false, message: "Unauthorized: Only the default admin can change their password through this action." };
  }
  try {
    await dbConnect();
    const admin = await UserModel.findOne({ userId: adminUserId, role: 'Admin' });
    if (!admin) {
      return { success: false, message: 'Admin user not found.' };
    }
    admin.password = newPasswordInput; 
    await admin.save();
    return { success: true, message: 'Admin password updated successfully in MongoDB.' };
  } catch (error: any) {
    console.error("Error changing admin password:", error);
    return { success: false, message: `Error updating password: ${error.message}` };
  }
}

export async function addTeamLeaderAction(userIdInput: string, passwordInput: string): Promise<{ success: boolean; message: string, user?: UserCredentials }> {
  try {
    await dbConnect();
    const existingUser = await UserModel.findOne({ userId: userIdInput });
    if (existingUser) {
      return { success: false, message: `User ID "${userIdInput}" already exists.` };
    }
    if (userIdInput === DEFAULT_ADMIN_USER_ID) {
      return { success: false, message: 'Cannot use Admin User ID for a Team Leader.' };
    }
    const newTeamLeader = new UserModel({
      userId: userIdInput,
      password: passwordInput, 
      role: 'TeamLeader',
    });
    await newTeamLeader.save();
    return { success: true, message: `Team Leader "${userIdInput}" added successfully to MongoDB.`, user: { userId: newTeamLeader.userId, role: 'TeamLeader' } };
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
    teamLeader.password = newPasswordInput; 
    await teamLeader.save();
    return { success: true, message: `Password for Team Leader "${userIdInput}" updated successfully in MongoDB.` };
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
      return { success: false, message: `Team Leader "${userIdToDelete}" not found or not deleted from MongoDB.` };
    }
    return { success: true, message: `Team Leader "${userIdToDelete}" deleted successfully from MongoDB.` };
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
    return { success: true, teamLeaders: mappedLeaders, message: 'Team leaders fetched successfully from MongoDB.' };
  } catch (error: any) {
    console.error("Error fetching team leaders:", error);
    return { success: false, message: `Error fetching team leaders: ${error.message}` };
  }
}

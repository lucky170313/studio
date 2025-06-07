
'use server';

import dbConnect from '@/lib/dbConnect';
import SalesReportModel from '@/models/SalesReport';
import UserModel from '@/models/User';
import SalaryPaymentModel from '@/models/SalaryPayment';
import RiderModel from '@/models/Rider'; // New Rider Model
import type { SalesReportData, UserCredentials, SalaryPaymentServerData, SalaryPaymentData, RiderMonthlyAggregates, CollectorCashReportEntry, Rider } from '@/lib/types';
import { format as formatDateFns, startOfMonth, endOfMonth } from 'date-fns';
import bcrypt from 'bcryptjs';


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

    console.log("[saveSalesReportAction] Attempting to save sales report with data:", JSON.stringify(dataToSave, null, 2));
    if (reportData.adminOverrideLitersSold !== undefined) {
      console.log(`[saveSalesReportAction] Admin override for litersSold was used: ${reportData.adminOverrideLitersSold} L`);
    } else {
      console.log("[saveSalesReportAction] Liters sold calculated from meter readings.");
    }


    const salesReportEntry = new SalesReportModel(dataToSave);
    const savedEntry = await salesReportEntry.save();

    console.log("[saveSalesReportAction] Sales report saved successfully, ID:", savedEntry._id.toString());

    return {
      success: true,
      message: 'Sales report has been successfully generated and saved to database.',
      id: savedEntry._id.toString()
    };
  } catch (e: any) {
    console.error("[saveSalesReportAction] Error saving sales report to database via Server Action: ", e);
    let dbErrorMessage = 'Failed to save sales report to database.';
    if (e.name === 'ValidationError') {
        console.error("[saveSalesReportAction] Mongoose Validation Error details:", JSON.stringify(e.errors, null, 2));
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

export async function getLastMeterReadingForVehicleAction(
  vehicleName: string,
  forDateISO?: string // This is the date chosen in the form for the NEW entry, as ISO string (UTC)
): Promise<{ success: boolean; reading: number; message?: string }> {
  if (!vehicleName) {
    return { success: false, reading: 0, message: "Vehicle name is required." };
  }
  try {
    await dbConnect();

    if (forDateISO) {
      const selectedDateForNewEntry_UTC = new Date(forDateISO);
      if (isNaN(selectedDateForNewEntry_UTC.getTime())) {
        console.warn(`[getLastMeterReadingForVehicleAction] Invalid forDateISO: ${forDateISO}. Fetching latest overall.`);
        // Fall through to fetching latest overall if date is invalid
      } else {
        // selectedDateForNewEntry_UTC represents the start of the day in the user's local timezone, converted to UTC.
        const startOfSelectedDay_UTC = selectedDateForNewEntry_UTC;
        
        const startOfNextDay_UTC = new Date(startOfSelectedDay_UTC);
        startOfNextDay_UTC.setUTCDate(startOfSelectedDay_UTC.getUTCDate() + 1); // Correctly gets start of the next UTC day

        console.log(`[getLastMeterReadingForVehicleAction] Vehicle: ${vehicleName}. New entry date (UTC start of user's local day): ${startOfSelectedDay_UTC.toISOString()}`);
        console.log(`[getLastMeterReadingForVehicleAction] Checking for entries ON selected day: >= ${startOfSelectedDay_UTC.toISOString()} and < ${startOfNextDay_UTC.toISOString()}`);

        // Try to find the latest report ON the selected day
        const latestReportOnSelectedDay = await SalesReportModel.findOne({
          vehicleName: vehicleName,
          firestoreDate: {
            $gte: startOfSelectedDay_UTC, 
            $lt: startOfNextDay_UTC,    
          },
        })
        .sort({ firestoreDate: -1 }) 
        .select('currentMeterReading firestoreDate')
        .lean();

        if (latestReportOnSelectedDay) {
          console.log(`[getLastMeterReadingForVehicleAction] Found latest report ON selected day (${formatDateFns(new Date(latestReportOnSelectedDay.firestoreDate), 'PPP p')}) with currentMeterReading: ${latestReportOnSelectedDay.currentMeterReading}`);
          return { success: true, reading: latestReportOnSelectedDay.currentMeterReading || 0 };
        } else {
          console.log(`[getLastMeterReadingForVehicleAction] No reports found ON selected day. Checking for reports BEFORE selected day (strictly less than ${startOfSelectedDay_UTC.toISOString()}).`);
          // If no report on selected day, find the latest report BEFORE the selected day
          const latestReportBeforeSelectedDay = await SalesReportModel.findOne({
            vehicleName: vehicleName,
            firestoreDate: { $lt: startOfSelectedDay_UTC }, 
          })
          .sort({ firestoreDate: -1 })
          .select('currentMeterReading firestoreDate')
          .lean();

          if (latestReportBeforeSelectedDay) {
            console.log(`[getLastMeterReadingForVehicleAction] Found latest report BEFORE selected day (${formatDateFns(new Date(latestReportBeforeSelectedDay.firestoreDate), 'PPP p')}) with currentMeterReading: ${latestReportBeforeSelectedDay.currentMeterReading}`);
            return { success: true, reading: latestReportBeforeSelectedDay.currentMeterReading || 0 };
          } else {
            console.log(`[getLastMeterReadingForVehicleAction] No prior reports found for vehicle ${vehicleName} before ${startOfSelectedDay_UTC.toISOString()}`);
            return { success: true, reading: 0, message: "No prior reading found for this vehicle before the selected date." };
          }
        }
      }
    }

    // Fallback: If no forDateISO is provided, or if it was invalid. Get the absolute latest reading.
    console.log(`[getLastMeterReadingForVehicleAction] Fallback: Fetching latest overall reading for vehicle '${vehicleName}'.`);
    const lastReportOverall = await SalesReportModel.findOne({ vehicleName: vehicleName })
      .sort({ firestoreDate: -1 })
      .select('currentMeterReading firestoreDate')
      .lean();

    if (lastReportOverall) {
      console.log(`[getLastMeterReadingForVehicleAction] Fallback: Found last overall report with currentMeterReading: ${lastReportOverall.currentMeterReading} (Date: ${formatDateFns(new Date(lastReportOverall.firestoreDate), 'PPP p')})`);
      return { success: true, reading: lastReportOverall.currentMeterReading || 0 };
    }
    console.log(`[getLastMeterReadingForVehicleAction] Fallback: No reports found at all for vehicle ${vehicleName}.`);
    return { success: true, reading: 0, message: "No prior reading found for this vehicle." };

  } catch (error: any) {
    console.error("[getLastMeterReadingForVehicleAction] Error fetching last meter reading:", error);
    return { success: false, reading: 0, message: `Error fetching last meter reading: ${error.message}` };
  }
}


// --- User Management Actions ---

export async function initializeDefaultAdminAction(): Promise<{ success: boolean; message: string }> {
  console.log('[initializeDefaultAdminAction] Starting simplified delete and recreate process...');
  try {
    await dbConnect();
    const adminUserId = process.env.DEFAULT_ADMIN_USER_ID || "lucky170313";
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "northpole";
    console.log(`[initializeDefaultAdminAction] Default Admin User ID: ${adminUserId}`);
    console.log(`[initializeDefaultAdminAction] Default Admin Password (for hashing): ${adminPassword.substring(0,3)}... (length: ${adminPassword.length})`);

    // Attempt to delete the existing admin user
    const deleteResult = await UserModel.deleteOne({ userId: adminUserId, role: 'Admin' });
    if (deleteResult.deletedCount > 0) {
      console.log(`[initializeDefaultAdminAction] Existing admin user '${adminUserId}' deleted.`);
    } else {
      console.log(`[initializeDefaultAdminAction] No existing admin user '${adminUserId}' found to delete, or deletion failed (count: ${deleteResult.deletedCount}). Proceeding to create.`);
    }

    console.log('[initializeDefaultAdminAction] Creating new default admin...');
    const newAdminUser = new UserModel({
      userId: adminUserId,
      password: adminPassword, // This will be hashed by pre-save on new user
      role: 'Admin',
    });
    await newAdminUser.save();
    console.log(`[initializeDefaultAdminAction] New admin '${adminUserId}' created.`);

    // Re-fetch the freshly created admin to verify its password hash
    const freshlyCreatedAdmin = await UserModel.findOne({ userId: adminUserId, role: 'Admin' }).select('+password');
    if (freshlyCreatedAdmin && freshlyCreatedAdmin.password) {
      console.log(`[initializeDefaultAdminAction] Freshly created admin's stored password hash (start): ${freshlyCreatedAdmin.password.substring(0,10)}...`);
      const testCompareNew = await bcrypt.compare(adminPassword, freshlyCreatedAdmin.password);
      console.log(`[initializeDefaultAdminAction] Test comparison for newly created admin with '${adminPassword.substring(0,3)}...': ${testCompareNew}`);
      if (testCompareNew) {
        return { success: true, message: `Default admin '${adminUserId}' successfully created/recreated with hashed password. Internal test comparison PASSED.` };
      } else {
        return { success: false, message: `Default admin '${adminUserId}' created/recreated, but internal password test comparison FAILED.` };
      }
    } else {
      console.log('[initializeDefaultAdminAction] Could not re-fetch freshly created admin or password after creation.');
      return { success: false, message: 'Failed to re-fetch admin after creation for verification.' };
    }

  } catch (error: any) {
    console.error("[initializeDefaultAdminAction] Error during simplified delete and recreate admin:", error);
    if (error.errors) {
        console.error("[initializeDefaultAdminAction] Mongoose validation errors:", JSON.stringify(error.errors, null, 2));
    }
    return { success: false, message: `Error initializing default admin: ${error.message}` };
  }
}

export async function verifyUserAction(userIdInput: string, passwordInput: string): Promise<{ success: boolean; user?: UserCredentials | null; message: string }> {
  console.log(`[verifyUserAction] Attempting to verify user: "${userIdInput}"`);
  console.log(`[verifyUserAction] Password input for comparison (first 3 chars): "${passwordInput.substring(0, 3)}..." (length: ${passwordInput.length})`);

  try {
    await dbConnect();
    console.log('[verifyUserAction] Database connected.');

    const user = await UserModel.findOne({ userId: userIdInput }).select('+password');

    if (user) {
      console.log(`[verifyUserAction] User found in DB. User ID: ${user.userId}, Role: ${user.role}`);
      console.log(`[verifyUserAction] Is user document new? ${user.isNew}`);
      console.log(`[verifyUserAction] Is user.password modified? ${user.isModified('password')}`);
      
      if (!user.password) {
        console.log(`[verifyUserAction] User '${userIdInput}' found, but NO password hash stored in DB!`);
        return { success: false, message: 'User found, but no password set. Please contact admin.' };
      }
      console.log(`[verifyUserAction] Stored hashed password from DB for '${userIdInput}' (first 10 chars): "${user.password.substring(0, 10)}..." (length: ${user.password.length})`);
      
      console.log(`[verifyUserAction] About to call bcrypt.compare with input: "${passwordInput.substring(0,3)}..." and DB hash: "${user.password.substring(0,10)}..."`);
      const isMatch = await bcrypt.compare(passwordInput, user.password);
      console.log(`[verifyUserAction] bcrypt.compare result for "${userIdInput}": ${isMatch}`);

      if (isMatch) {
        console.log(`[verifyUserAction] Password match for "${userIdInput}". Login successful.`);
        return { success: true, user: { userId: user.userId, role: user.role as 'Admin' | 'TeamLeader' }, message: 'Login successful.' };
      } else {
        console.log(`[verifyUserAction] Password mismatch for "${userIdInput}".`);
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
  console.log(`[changeAdminPasswordAction] Attempting to change password for admin: ${adminUserId}`);
  try {
    await dbConnect();
    const admin = await UserModel.findOne({ userId: adminUserId, role: 'Admin' });
    if (!admin) {
      console.log(`[changeAdminPasswordAction] Admin user '${adminUserId}' not found.`);
      return { success: false, message: 'Admin user not found.' };
    }

    admin.password = newPasswordInput; // Will be hashed by pre-save hook
    await admin.save();
    console.log(`[changeAdminPasswordAction] Admin password for '${adminUserId}' updated in Mongoose document. Save called. Password should be hashed by pre-save hook.`);

    // Re-fetch the admin to verify its new password hash
    const updatedAdmin = await UserModel.findOne({ userId: adminUserId, role: 'Admin' }).select('+password');
    if (updatedAdmin && updatedAdmin.password) {
      console.log(`[changeAdminPasswordAction] Updated admin '${adminUserId}' re-fetched. Stored password hash (start): ${updatedAdmin.password.substring(0,10)}...`);
      const testCompareNew = await bcrypt.compare(newPasswordInput, updatedAdmin.password);
      console.log(`[changeAdminPasswordAction] Test comparison for updated admin '${adminUserId}' with new password ('${newPasswordInput.substring(0,3)}...'): ${testCompareNew}`);
      if (testCompareNew) {
        return { success: true, message: `Admin password for '${adminUserId}' successfully updated. Internal test comparison PASSED.` };
      } else {
        return { success: false, message: `Admin password for '${adminUserId}' updated in database, but internal password test comparison FAILED.` };
      }
    } else {
      console.log(`[changeAdminPasswordAction] Could not re-fetch updated admin '${adminUserId}' or password after update for verification.`);
      return { success: false, message: 'Failed to re-fetch admin after password update for verification.' };
    }

  } catch (error: any) {
    console.error("[changeAdminPasswordAction] Error changing admin password:", error);
    if (error.errors) {
        console.error("[changeAdminPasswordAction] Mongoose validation errors:", JSON.stringify(error.errors, null, 2));
    }
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

    console.log(`[addTeamLeaderAction] Attempting to create Team Leader: ${userIdInput}`);
    const newTeamLeader = new UserModel({
      userId: userIdInput,
      password: passwordInput, // Will be hashed by pre-save
      role: 'TeamLeader',
    });
    await newTeamLeader.save();
    console.log(`[addTeamLeaderAction] Team Leader "${userIdInput}" saved. Password should be hashed.`);

    // Re-fetch and verify password hash
    const freshlyCreatedTL = await UserModel.findOne({ userId: userIdInput, role: 'TeamLeader' }).select('+password');
    if (freshlyCreatedTL && freshlyCreatedTL.password) {
      console.log(`[addTeamLeaderAction] Freshly created TL '${userIdInput}' stored password hash (start): ${freshlyCreatedTL.password.substring(0,10)}...`);
      const testCompareNew = await bcrypt.compare(passwordInput, freshlyCreatedTL.password);
      console.log(`[addTeamLeaderAction] Test comparison for newly created TL '${userIdInput}' with '${passwordInput.substring(0,3)}...': ${testCompareNew}`);
      if (testCompareNew) {
        return { 
          success: true, 
          message: `Team Leader "${userIdInput}" added successfully. Internal password test PASSED.`, 
          user: { userId: newTeamLeader.userId, role: 'TeamLeader' } 
        };
      } else {
        return { 
          success: false, 
          message: `Team Leader "${userIdInput}" created, but internal password test FAILED.` 
        };
      }
    } else {
      console.log(`[addTeamLeaderAction] Could not re-fetch freshly created TL '${userIdInput}' or password after creation.`);
      return { success: false, message: 'Failed to re-fetch TL after creation for verification.' };
    }

  } catch (error: any) {
    console.error("[addTeamLeaderAction] Error adding team leader:", error);
    if (error.errors) {
        console.error("[addTeamLeaderAction] Mongoose validation errors:", JSON.stringify(error.errors, null, 2));
    }
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
    teamLeader.password = newPasswordInput; // Will be hashed by pre-save
    await teamLeader.save();
    console.log(`[updateTeamLeaderPasswordAction] Password for TL "${userIdInput}" updated. Password should be hashed by pre-save hook.`);

    // Re-fetch and verify password hash
    const updatedTL = await UserModel.findOne({ userId: userIdInput, role: 'TeamLeader' }).select('+password');
    if (updatedTL && updatedTL.password) {
        console.log(`[updateTeamLeaderPasswordAction] Updated TL '${userIdInput}' stored password hash (start): ${updatedTL.password.substring(0,10)}...`);
        const testCompare = await bcrypt.compare(newPasswordInput, updatedTL.password);
        console.log(`[updateTeamLeaderPasswordAction] Test comparison for updated TL '${userIdInput}' with new password: ${testCompare}`);
        if (testCompare) {
            return { success: true, message: `Password for Team Leader "${userIdInput}" updated successfully. Internal test PASSED.` };
        } else {
            return { success: false, message: `Password for Team Leader "${userIdInput}" updated, but internal test FAILED.` };
        }
    } else {
        return { success: false, message: `Password for Team Leader "${userIdInput}" updated, but failed to re-fetch for verification.` };
    }

  } catch (error: any) {
    console.error("[updateTeamLeaderPasswordAction] Error updating team leader password:", error);
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
    console.error("[deleteTeamLeaderAction] Error deleting team leader:", error);
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
    console.error("[getTeamLeadersAction] Error fetching team leaders:", error);
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
    return { success: true, message: `Rider "${finalRider.name}" added successfully to the database. Database record updated.`, rider: finalRider };
  } catch (error: any) {
    console.error("[addRiderAction] Error adding rider:", error);
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
    console.error("[getRidersAction] Error fetching riders:", error);
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
    return { success: true, message: `Rider "${finalRider.name}" updated successfully in the database. Database record updated.`, rider: finalRider };
  } catch (error: any) {
    console.error("[updateRiderAction] Error updating rider:", error);
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
    return { success: true, message: `Rider "${result.name}" deleted successfully from the database. Database record updated.` };
  } catch (error: any) {
    console.error("[deleteRiderAction] Error deleting rider:", error);
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
    console.error("[saveSalaryPaymentAction] Error saving salary payment to database: ", e);
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
    console.error("[getSalaryPaymentsAction] Error fetching salary payments:", error);
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
    console.error("[getRiderMonthlyAggregatesAction] Error fetching rider monthly aggregates:", error);
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
    console.error("[getCollectorCashReportDataAction] Error fetching data for collector's cash report:", error);
    return { success: false, message: `Error fetching data: ${error.message}` };
  }
}


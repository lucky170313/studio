
import { z } from 'zod';

export type UserRole = 'Admin' | 'TeamLeader';

export interface UserCredentials {
  userId: string;
  role: UserRole;
  password?: string; // Optional here because we don't always pass it around
}


export const salesDataSchema = z.object({
  date: z.date({ required_error: 'Date is required.' }),
  riderName: z.string().min(1, 'Rider name is required.'),
  vehicleName: z.string().min(1, 'Vehicle name is required.'),
  previousMeterReading: z.coerce.number().min(0, 'Previous meter reading must be a positive number.'),
  currentMeterReading: z.coerce.number().min(0, 'Current meter reading must be a positive number.'),
  overrideLitersSold: z.coerce.number().min(0, "Override liters sold cannot be negative.").optional(),
  ratePerLiter: z.coerce.number().min(0, 'Rate per liter cannot be negative.'),
  cashReceived: z.coerce.number().min(0, 'Cash received must be a positive number.'),
  onlineReceived: z.coerce.number().min(0, 'Online received must be a positive number.'),
  dueCollected: z.coerce.number().min(0, 'Due collected must be a positive number.'),
  newDueAmount: z.coerce.number().min(0, 'New due amount cannot be negative.'),
  tokenMoney: z.coerce.number().min(0, 'Token money must be a positive number.'),
  staffExpense: z.coerce.number().min(0, 'Staff expense must be a positive number.'),
  extraAmount: z.coerce.number().min(0, 'Extra amount must be a positive number.'),
  hoursWorked: z.coerce.number().min(1, 'Hours worked are required.').max(9, 'Hours worked cannot exceed 9.').default(9),
  comment: z.string().optional(),
}).refine(data => {
  if (typeof data.overrideLitersSold === 'number' && data.overrideLitersSold >= 0) {
    return true;
  }
  return data.currentMeterReading >= data.previousMeterReading;
}, {
  message: "Current meter reading cannot be less than previous (unless Liters Sold are overridden by Admin). Check values or use override. This check also applies if Override Liters Sold is not a valid non-negative number.",
  path: ["currentMeterReading"],
});


export type SalesDataFormValues = z.infer<typeof salesDataSchema>;

export interface SalesReportData {
  id?: string;
  _id?: string; // Mongoose ID
  date: string; // Formatted date for display
  firestoreDate: Date; // JS Date object for DB storage and querying
  riderName: string;
  vehicleName: string;
  previousMeterReading: number;
  currentMeterReading: number;
  litersSold: number;
  adminOverrideLitersSold?: number;
  ratePerLiter: number;
  cashReceived: number;
  onlineReceived: number;
  dueCollected: number;
  newDueAmount: number;
  tokenMoney: number;
  staffExpense: number;
  extraAmount: number;
  hoursWorked: number;
  dailySalaryCalculated?: number;
  commissionEarned?: number;
  comment?: string;
  recordedBy: string; // User ID of the person who recorded the entry
  totalSale: number;
  actualReceived: number;
  initialAdjustedExpected: number;
  aiAdjustedExpectedAmount: number;
  aiReasoning: string;
  discrepancy: number;
  status: 'Match' | 'Shortage' | 'Overage';
  // meterReadingImageDriveLink: string | null; // Removed as per user request
}

// Type for the data expected by the saveSalesReportAction, omitting DB-generated fields
export type SalesReportServerSaveData = Omit<SalesReportData, 'id' | '_id'>;


// Salary Payment Types
export const salaryPaymentSchema = z.object({
  paymentDate: z.date({ required_error: 'Payment date is required.' }),
  riderName: z.string().min(1, 'Rider name is required.'),
  salaryGiverName: z.string().min(1, 'Salary giver name is required.'),
  selectedYear: z.string().min(1, 'Year for salary calculation is required.'),
  selectedMonth: z.string().min(1, 'Month for salary calculation is required.'),
  salaryAmountForPeriod: z.coerce.number().min(0, 'Salary amount must be a positive number.'),
  amountPaid: z.coerce.number().min(0, 'Amount paid must be a positive number.'),
  deductionAmount: z.coerce.number().min(0, 'Deduction amount cannot be negative.').optional(),
  advancePayment: z.coerce.number().min(0, 'Advance payment cannot be negative.').optional(),
  comment: z.string().optional(),
}).refine(data => {
    const salary = data.salaryAmountForPeriod || 0;
    const paid = data.amountPaid || 0;
    const deduction = data.deductionAmount || 0;
    return (paid + deduction) <= salary;
}, {
  message: "Amount paid (for current salary) plus deductions cannot exceed the salary amount for the period.",
  path: ["amountPaid"],
});

export type SalaryPaymentFormValues = z.infer<typeof salaryPaymentSchema>;

export interface SalaryPaymentData {
  _id?: string;
  paymentDate: Date;
  riderName: string;
  salaryGiverName: string; 
  salaryAmountForPeriod: number;
  amountPaid: number;
  deductionAmount?: number;
  advancePayment?: number; 
  remainingAmount: number; 
  comment?: string;
  recordedBy: string; 
  createdAt?: Date;
  updatedAt?: Date;
}

export type SalaryPaymentServerData = Omit<SalaryPaymentData, '_id' | 'createdAt' | 'updatedAt' | 'remainingAmount'>;


export interface RiderMonthlyAggregates {
  totalDailySalaryCalculated: number;
  totalCommissionEarned: number;
  totalDiscrepancy: number;
  netMonthlyEarning: number;
}

// New type for the specific data needed by the Collector's Cash Report
export interface CollectorCashReportEntry {
  _id: string; 
  recordedBy: string;
  firestoreDate: Date; // Will be a JS Date object after fetching and mapping
  cashReceived: number;
}

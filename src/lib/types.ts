
import { z } from 'zod';

export type UserRole = 'Admin' | 'TeamLeader';

export interface UserCredentials {
  userId: string;
  role: UserRole;
  password?: string;
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
  newDueAmount: z.coerce.number().min(0, 'New due amount must be a positive number.'),
  tokenMoney: z.coerce.number().min(0, 'Token money must be a positive number.'),
  staffExpense: z.coerce.number().min(0, 'Staff expense must be a positive number.'),
  extraAmount: z.coerce.number().min(0, 'Extra amount must be a positive number.'),
  hoursWorked: z.coerce.number().min(1, 'Hours worked are required.').max(9, 'Hours worked cannot exceed 9.').default(9),
  comment: z.string().optional(),
}).refine(data => {
  // If overrideLitersSold is provided and is a positive number, skip meter reading check.
  if (typeof data.overrideLitersSold === 'number' && data.overrideLitersSold > 0) {
    return true;
  }
  // Otherwise (overrideLitersSold is undefined, 0, or not positive), meter readings must be consistent.
  return data.currentMeterReading >= data.previousMeterReading;
}, {
  message: "Current meter reading cannot be less than previous meter reading (unless Liters Sold are positively overridden by Admin).",
  path: ["currentMeterReading"],
});


export type SalesDataFormValues = z.infer<typeof salesDataSchema>;

export interface SalesReportData {
  id?: string;
  _id?: string; // For MongoDB
  date: string; 
  firestoreDate: Date; // JS Date object for DB compatibility, storing JS Date
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
  recordedBy: string; 
  totalSale: number;
  actualReceived: number;
  initialAdjustedExpected: number;
  aiAdjustedExpectedAmount: number; 
  aiReasoning: string; 
  discrepancy: number;
  status: 'Match' | 'Shortage' | 'Overage';
}

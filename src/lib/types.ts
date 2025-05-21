
import { z } from 'zod';

export type UserRole = 'Admin' | 'Team Leader';

export const salesDataSchema = z.object({
  date: z.date({ required_error: 'Date is required.' }),
  riderName: z.string().min(1, 'Rider name is required.'),
  vehicleName: z.string().min(1, 'Vehicle name is required.'),
  previousMeterReading: z.coerce.number().min(0, 'Previous meter reading must be a positive number.'),
  currentMeterReading: z.coerce.number().min(0, 'Current meter reading must be a positive number.'),
  overrideLitersSold: z.coerce.number().min(0, "Override liters sold must be a positive number.").optional(),
  ratePerLiter: z.coerce.number().min(0, 'Rate per liter must be a positive number.'),
  cashReceived: z.coerce.number().min(0, 'Cash received must be a positive number.'),
  onlineReceived: z.coerce.number().min(0, 'Online received must be a positive number.'),
  dueCollected: z.coerce.number().min(0, 'Due collected must be a positive number.'),
  tokenMoney: z.coerce.number().min(0, 'Token money must be a positive number.'),
  staffExpense: z.coerce.number().min(0, 'Staff expense must be a positive number.'),
  extraAmount: z.coerce.number().min(0, 'Extra amount must be a positive number.'),
  comment: z.string().optional(),
}).refine(data => {
  // This refinement only applies if overrideLitersSold is not provided or is zero.
  // If overrideLitersSold is provided and positive, meter readings consistency is less critical for final calculation,
  // but still good practice to enter correct meter readings.
  if (data.overrideLitersSold === undefined || data.overrideLitersSold <= 0) {
    return data.currentMeterReading >= data.previousMeterReading;
  }
  return true; // Skip meter reading check if liters are overridden
}, {
  message: "Current meter reading cannot be less than previous meter reading (when not overriding liters sold).",
  path: ["currentMeterReading"],
});


export type SalesDataFormValues = z.infer<typeof salesDataSchema>;

export interface SalesReportData extends Omit<SalesDataFormValues, 'previousMeterReading' | 'currentMeterReading' | 'overrideLitersSold'> {
  date: string; // Store date as string for report
  previousMeterReading: number;
  currentMeterReading: number;
  litersSold: number; // This will be the final value used for calculations (either calculated or overridden)
  adminOverrideLitersSold?: number; // Store the admin's override value if provided
  totalSale: number;
  actualReceived: number;
  initialAdjustedExpected: number;
  aiAdjustedExpectedAmount: number;
  aiReasoning: string;
  discrepancy: number;
  status: 'Match' | 'Shortage' | 'Overage';
}

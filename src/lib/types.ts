
import { z } from 'zod';

export type UserRole = 'Admin' | 'Team Leader';

export const salesDataSchema = z.object({
  date: z.date({ required_error: 'Date is required.' }),
  riderName: z.string().min(1, 'Rider name is required.'),
  vehicleName: z.string().min(1, 'Vehicle name is required.'),
  previousMeterReading: z.coerce.number().min(0, 'Previous meter reading must be a positive number.'),
  currentMeterReading: z.coerce.number().min(0, 'Current meter reading must be a positive number.')
    .refine((data) => (data as unknown as SalesDataFormValues).currentMeterReading >= (data as unknown as SalesDataFormValues).previousMeterReading, { // HACK: Need to cast data due to how refine works internally with partial schemas during validation.
      message: "Current meter reading must be greater than or equal to previous meter reading.",
      path: ["currentMeterReading"], // specify the path to show the error
    }),
  ratePerLiter: z.coerce.number().min(0, 'Rate per liter must be a positive number.'),
  cashReceived: z.coerce.number().min(0, 'Cash received must be a positive number.'),
  onlineReceived: z.coerce.number().min(0, 'Online received must be a positive number.'),
  dueCollected: z.coerce.number().min(0, 'Due collected must be a positive number.'),
  tokenMoney: z.coerce.number().min(0, 'Token money must be a positive number.'),
  staffExpense: z.coerce.number().min(0, 'Staff expense must be a positive number.'),
  extraAmount: z.coerce.number().min(0, 'Extra amount must be a positive number.'),
  comment: z.string().optional(),
}).refine(data => data.currentMeterReading >= data.previousMeterReading, {
    message: "Current meter reading cannot be less than previous meter reading.",
    path: ["currentMeterReading"], // path of the error
});


export type SalesDataFormValues = z.infer<typeof salesDataSchema>;

export interface SalesReportData extends Omit<SalesDataFormValues, 'previousMeterReading' | 'currentMeterReading'> {
  date: string; // Store date as string for report
  previousMeterReading: number;
  currentMeterReading: number;
  litersSold: number; // This will be calculated
  totalSale: number;
  actualReceived: number;
  initialAdjustedExpected: number;
  aiAdjustedExpectedAmount: number;
  aiReasoning: string;
  discrepancy: number;
  status: 'Match' | 'Shortage' | 'Overage';
}

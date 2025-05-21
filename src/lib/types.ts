import { z } from 'zod';

export type UserRole = 'Admin' | 'Team Leader';

export const salesDataSchema = z.object({
  date: z.date({ required_error: 'Date is required.' }),
  riderName: z.string().min(1, 'Rider name is required.'),
  vehicleName: z.string().min(1, 'Vehicle name is required.'),
  litersSold: z.coerce.number().min(0, 'Liters sold must be a positive number.'),
  ratePerLiter: z.coerce.number().min(0, 'Rate per liter must be a positive number.'),
  cashReceived: z.coerce.number().min(0, 'Cash received must be a positive number.'),
  onlineReceived: z.coerce.number().min(0, 'Online received must be a positive number.'),
  dueCollected: z.coerce.number().min(0, 'Due collected must be a positive number.'),
  tokenMoney: z.coerce.number().min(0, 'Token money must be a positive number.'),
  staffExpense: z.coerce.number().min(0, 'Staff expense must be a positive number.'),
  extraAmount: z.coerce.number().min(0, 'Extra amount must be a positive number.'),
  comment: z.string().optional(),
});

export type SalesDataFormValues = z.infer<typeof salesDataSchema>;

export interface SalesReportData extends SalesDataFormValues {
  date: string; // Store date as string for report
  totalSale: number;
  actualReceived: number;
  initialAdjustedExpected: number;
  aiAdjustedExpectedAmount: number;
  aiReasoning: string;
  discrepancy: number;
  status: 'Match' | 'Shortage' | 'Overage';
}

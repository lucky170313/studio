
// AdjustExpectedAmount.ts
'use server';
/**
 * @fileOverview Adjusts the expected amount based on sales data analysis using GenAI.
 *
 * - adjustExpectedAmount - A function that suggests adjustments to the expected cash received based on sales data.
 * - AdjustExpectedAmountInput - The input type for the adjustExpectedAmount function.
 * - AdjustExpectedAmountOutput - The return type for the adjustExpectedAmount function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdjustExpectedAmountInputSchema = z.object({
  date: z.string().describe('The date of the sales data (YYYY-MM-DD).'),
  riderName: z.string().describe('The name of the rider.'),
  vehicleName: z.string().describe('The name of the vehicle.'),
  litersSold: z.number().describe('The total number of liters sold (calculated from meter readings or overridden by admin).'),
  ratePerLiter: z.number().describe('The rate per liter.'),
  cashReceived: z.number().describe('The amount of cash received.'),
  onlineReceived: z.number().describe('The amount received online.'),
  dueCollected: z.number().describe('The amount of past dues collected today.'),
  newDueAmount: z.number().describe("The amount from today's sale that became a new due."), // New field
  tokenMoney: z.number().describe('The amount of token money received.'),
  staffExpense: z.number().describe('The amount of staff expenses.'),
  extraAmount: z.number().describe('The extra amount recorded (typically an expense or other deduction).'),
  comment: z.string().optional().describe('Any comments related to the sales data.'),
  totalSale: z.number().describe('The total sale amount (litersSold * ratePerLiter).'),
  actualReceived: z.number().describe('The actual amount received (cashReceived + onlineReceived).'),
  // This 'adjustedExpected' is the value calculated by the system before AI analysis,
  // using the formula: totalSale + dueCollected - newDueAmount - tokenMoney - staffExpense - extraAmount
  adjustedExpected: z.number().describe('The initial system-calculated adjusted expected amount.'), 
});

export type AdjustExpectedAmountInput = z.infer<typeof AdjustExpectedAmountInputSchema>;

const AdjustExpectedAmountOutputSchema = z.object({
  adjustedExpectedAmount: z.number().describe('The GenAI-adjusted expected amount.'),
  reasoning: z.string().describe('The reasoning behind the adjustment.'),
});

export type AdjustExpectedAmountOutput = z.infer<typeof AdjustExpectedAmountOutputSchema>;

export async function adjustExpectedAmount(input: AdjustExpectedAmountInput): Promise<AdjustExpectedAmountOutput> {
  return adjustExpectedAmountFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adjustExpectedAmountPrompt',
  input: {schema: AdjustExpectedAmountInputSchema},
  output: {schema: AdjustExpectedAmountOutputSchema},
  prompt: `You are an expert financial analyst specializing in sales data for a water delivery business. Analyze the following daily sales data and suggest adjustments to the expected cash received. Consider factors like unusually high sales volume (based on liters sold), anomalies in the 'extra amounts' or 'new due amounts' entered, potential data entry errors, and any comments provided.

Sales Date: {{date}}
Rider Name: {{riderName}}
Vehicle Name: {{vehicleName}}
Liters Sold (Calculated or Admin Override): {{litersSold}}
Rate Per Liter: {{ratePerLiter}}
Cash Received: {{cashReceived}}
Online Received: {{onlineReceived}}
Due Collected (Past Dues): {{dueCollected}}
New Due Amount (From Today's Sale): {{newDueAmount}}
Token Money: {{tokenMoney}}
Staff Expense: {{staffExpense}}
Extra Amount: {{extraAmount}}
Comment: {{comment}}

Calculated Values by System:
Total Sale (Liters Sold * Rate Per Liter): {{totalSale}}
Actual Amount Received (Cash + Online): {{actualReceived}}
Initial Adjusted Expected Amount (Total Sale + Due Collected - New Due Amount - Token Money - Staff Expense - Extra Amount): {{adjustedExpected}}

Based on this data, review the 'Initial Adjusted Expected Amount'. Provide an 'adjustedExpectedAmount' which is your refined calculation of what should have been received, and a detailed 'reasoning' for any adjustment you make (or if no adjustment is needed from the 'Initial Adjusted Expected Amount'). Focus on identifying potential discrepancies, data entry errors, or unusual patterns. If the 'Initial Adjusted Expected Amount' seems correct, you can return that same amount.
The 'adjustedExpectedAmount' should be a numerical value.
The 'reasoning' should be a string explaining your analysis.`,
});

const adjustExpectedAmountFlow = ai.defineFlow(
  {
    name: 'adjustExpectedAmountFlow',
    inputSchema: AdjustExpectedAmountInputSchema,
    outputSchema: AdjustExpectedAmountOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("AI failed to return an output. Please check the input data and try again.");
    }
    if (typeof output.adjustedExpectedAmount !== 'number' || isNaN(output.adjustedExpectedAmount)) {
        console.error("AI returned invalid adjustedExpectedAmount:", output.adjustedExpectedAmount);
        return {
            adjustedExpectedAmount: input.adjustedExpected, 
            reasoning: "AI failed to provide a valid numerical adjustment. Using initial system calculation. " + (output.reasoning || "No specific reasoning provided by AI due to data format error.")
        };
    }
    return output;
  }
);

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
  date: z.string().describe('The date of the sales data.'),
  riderName: z.string().describe('The name of the rider.'),
  vehicleName: z.string().describe('The name of the vehicle.'),
  litersSold: z.number().describe('The number of liters sold.'),
  ratePerLiter: z.number().describe('The rate per liter.'),
  cashReceived: z.number().describe('The amount of cash received.'),
  onlineReceived: z.number().describe('The amount received online.'),
  dueCollected: z.number().describe('The amount of dues collected.'),
  tokenMoney: z.number().describe('The amount of token money received.'),
  staffExpense: z.number().describe('The amount of staff expenses.'),
  extraAmount: z.number().describe('The extra amount recorded.'),
  comment: z.string().optional().describe('Any comments related to the sales data.'),
  totalSale: z.number().describe('The total sale amount (litersSold * ratePerLiter).'),
  actualReceived: z.number().describe('The actual amount received (cashReceived + onlineReceived).'),
  adjustedExpected: z.number().describe('The initial adjusted expected amount (totalSale - dueCollected - tokenMoney - staffExpense - extraAmount).'),
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
  prompt: `You are an expert financial analyst specializing in sales data. Analyze the following daily sales data and suggest adjustments to the expected cash received. Consider factors like unusually high sales volume, anomalies in the 'extra amounts' entered, and any comments provided.

Sales Date: {{date}}
Rider Name: {{riderName}}
Vehicle Name: {{vehicleName}}
Liters Sold: {{litersSold}}
Rate Per Liter: {{ratePerLiter}}
Cash Received: {{cashReceived}}
Online Received: {{onlineReceived}}
Due Collected: {{dueCollected}}
Token Money: {{tokenMoney}}
Staff Expense: {{staffExpense}}
Extra Amount: {{extraAmount}}
Comment: {{comment}}
Total Sale: {{totalSale}}
Actual Received: {{actualReceived}}
Initial Adjusted Expected: {{adjustedExpected}}

Based on this data, provide an adjusted expected amount and a detailed reasoning for your adjustment. Focus on discrepancies and anomalies in the data.

Adjusted Expected Amount:`, // The LLM will output the new amount here.
});

const adjustExpectedAmountFlow = ai.defineFlow(
  {
    name: 'adjustExpectedAmountFlow',
    inputSchema: AdjustExpectedAmountInputSchema,
    outputSchema: AdjustExpectedAmountOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);



'use server';

import dbConnect from '@/lib/dbConnect';
import SalesReportModel from '@/models/SalesReport';
import type { SalesReportData } from '@/lib/types';

interface SaveReportResult {
  success: boolean;
  message: string;
  error?: string;
  id?: string;
}

export async function saveSalesReportAction(reportData: Omit<SalesReportData, 'id' | 'aiAdjustedExpectedAmount' | 'aiReasoning'> & { firestoreDate: Date }): Promise<SaveReportResult> {
  try {
    await dbConnect();

    // Ensure all required fields for the model are present
    const completeReportData = {
      ...reportData,
      // Add any default or derived fields if necessary for the model
      // For example, if aiAdjustedExpectedAmount and aiReasoning were previously set
      // before saving but are not part of the input to this action, handle them here.
      // Based on current page.tsx, these are set before calling this action.
      // However, the SalesReportData type includes them, so we should ensure they are covered.
      // For now, we assume the input `reportData` is structured correctly for the model.
    };
    
    const salesReportEntry = new SalesReportModel(completeReportData);
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
    return { 
      success: false, 
      message: dbErrorMessage,
      error: e.message 
    };
  }
}

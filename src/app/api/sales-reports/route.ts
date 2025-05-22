
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SalesReportModel from '@/models/SalesReport';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const reports = await SalesReportModel.find({}).sort({ firestoreDate: -1 }).lean();
    return NextResponse.json(reports, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch sales reports:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to fetch sales reports', error: errorMessage }, { status: 500 });
  }
}

// You can also add a POST handler here if you want to submit data via API route
// For now, submissions are handled by a Server Action in page.tsx
// export async function POST(request: Request) {
//   try {
//     await dbConnect();
//     const body = await request.json();
//     const newReport = new SalesReportModel(body);
//     await newReport.save();
//     return NextResponse.json(newReport, { status: 201 });
//   } catch (error) {
//     console.error('Failed to create sales report:', error);
//     const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
//     return NextResponse.json({ message: 'Failed to create sales report', error: errorMessage }, { status: 500 });
//   }
// }


import mongoose from 'mongoose';

const SalesReportSchema = new mongoose.Schema({
  date: { type: String, required: true },
  firestoreDate: { type: Date, required: true, default: Date.now, index: true },
  riderName: { type: String, required: true },
  vehicleName: { type: String, required: true },
  previousMeterReading: { type: Number, required: true },
  currentMeterReading: { type: Number, required: true },
  litersSold: { type: Number, required: true },
  adminOverrideLitersSold: { type: Number }, 
  ratePerLiter: { type: Number, required: true },
  cashReceived: { type: Number, required: true },
  onlineReceived: { type: Number, required: true },
  dueCollected: { type: Number, required: true },
  newDueAmount: { type: Number, required: true },
  tokenMoney: { type: Number, required: true },
  staffExpense: { type: Number, required: true },
  extraAmount: { type: Number, required: true },
  hoursWorked: { type: Number, required: true, min: 1, max: 9, default: 9 },
  dailySalaryCalculated: { type: Number, default: 0 },
  commissionEarned: { type: Number, default: 0 },
  comment: { type: String },
  recordedBy: { type: String, required: true }, 
  totalSale: { type: Number, required: true },
  actualReceived: { type: Number, required: true },
  initialAdjustedExpected: { type: Number, required: true },
  aiAdjustedExpectedAmount: { type: Number, required: true }, 
  aiReasoning: { type: String, required: true }, 
  discrepancy: { type: Number, required: true },
  status: {
    type: String,
    enum: ['Match', 'Shortage', 'Overage'],
    required: true,
  },
  // meterReadingImageDriveLink field removed
}, { timestamps: true }); 

// Compound indexes for common queries
SalesReportSchema.index({ vehicleName: 1, firestoreDate: -1 });
SalesReportSchema.index({ riderName: 1, firestoreDate: -1 });


export default mongoose.models.SalesReport || mongoose.model('SalesReport', SalesReportSchema);

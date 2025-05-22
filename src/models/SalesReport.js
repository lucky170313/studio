
import mongoose from 'mongoose';

const SalesReportSchema = new mongoose.Schema({
  date: { type: String, required: true }, // Formatted string date for display
  firestoreDate: { type: Date, required: true, default: Date.now }, // JS Date object (holds the actual date of entry)
  riderName: { type: String, required: true },
  vehicleName: { type: String, required: true },
  previousMeterReading: { type: Number, required: true },
  currentMeterReading: { type: Number, required: true },
  litersSold: { type: Number, required: true },
  adminOverrideLitersSold: { type: Number }, // Optional
  ratePerLiter: { type: Number, required: true },
  cashReceived: { type: Number, required: true },
  onlineReceived: { type: Number, required: true },
  dueCollected: { type: Number, required: true },
  tokenMoney: { type: Number, required: true },
  staffExpense: { type: Number, required: true },
  extraAmount: { type: Number, required: true },
  comment: { type: String }, // Optional
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
}, { timestamps: true }); // Adds createdAt and updatedAt

// To prevent recompilation of the model in Next.js dev environments
// Mongoose automatically handles the collection name by pluralizing the model name,
// so 'SalesReport' becomes 'salesreports'. If you want a specific name, you can pass it as a third argument to mongoose.model.
export default mongoose.models.SalesReport || mongoose.model('SalesReport', SalesReportSchema);

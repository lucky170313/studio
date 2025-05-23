
import mongoose from 'mongoose';

const SalaryPaymentSchema = new mongoose.Schema({
  paymentDate: { type: Date, required: true, default: Date.now },
  riderName: { type: String, required: true },
  salaryGiverName: { type: String, required: true }, // User ID of admin/TL who made the payment entry
  salaryAmountForPeriod: { type: Number, required: true },
  amountPaid: { type: Number, required: true },
  remainingAmount: { type: Number, required: true },
  comment: { type: String },
  recordedBy: { type: String, required: true }, // User ID of admin/TL who recorded this transaction
}, { timestamps: true });

export default mongoose.models.SalaryPayment || mongoose.model('SalaryPayment', SalaryPaymentSchema);

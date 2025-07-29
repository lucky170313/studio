
import mongoose from 'mongoose';

const SalaryPaymentSchema = new mongoose.Schema({
  paymentDate: { type: Date, required: true, default: Date.now, index: true },
  riderName: { type: String, required: true, index: true },
  salaryGiverName: { type: String, required: true }, // User ID of admin/TL who made the payment entry
  salaryAmountForPeriod: { type: Number, required: true },
  amountPaid: { type: Number, required: true }, // Amount paid towards current period's salary
  deductionAmount: { type: Number, default: 0 },
  advancePayment: { type: Number, default: 0 }, // New field for advance payment
  remainingAmount: { type: Number, required: true }, // Remains: salaryAmountForPeriod - amountPaid - deductionAmount
  comment: { type: String },
  recordedBy: { type: String, required: true, index: true }, // User ID of admin/TL who recorded this transaction
}, { timestamps: true });

export default mongoose.models.SalaryPayment || mongoose.model('SalaryPayment', SalaryPaymentSchema);

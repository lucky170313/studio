
import mongoose from 'mongoose';

const RiderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Rider name is required.'],
    unique: true,
    trim: true,
  },
  perDaySalary: { // Salary for a full 9-hour day
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Salary cannot be negative.'],
  },
}, { timestamps: true });

export default mongoose.models.Rider || mongoose.model('Rider', RiderSchema);


import mongoose from 'mongoose';

// WARNING: THIS IS FOR PROTOTYPING ONLY.
// STORING PASSWORDS IN PLAINTEXT IS EXTREMELY INSECURE.
// In a production application, passwords MUST be securely hashed (e.g., using bcrypt)
// before being stored, and comparisons should be done against the hashed value.

const UserSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: [true, 'User ID is required.'],
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required.'],
    // In a real app, NEVER store plaintext passwords. Store a hash.
  },
  role: {
    type: String,
    required: [true, 'User role is required.'],
    enum: ['Admin', 'TeamLeader'],
  },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);

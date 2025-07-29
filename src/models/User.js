
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Passwords will now be hashed before saving using bcrypt.

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
  },
  role: {
    type: String,
    required: [true, 'User role is required.'],
    enum: ['Admin', 'TeamLeader'],
    index: true // Added index for faster role-based queries
  },
}, { timestamps: true });

// Pre-save hook to hash password
UserSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password using the new salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password for login
UserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

export default mongoose.models.User || mongoose.model('User', UserSchema);

import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { generateToken, hashToken } from '../utils/helpers';

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  organizationType: 'individual' | 'cooperative' | 'commercial' | 'government';
  organizationName?: string;
  farmLocation?: {
    province: string;
    municipality: string;
    coordinates?: {
      lat: number;
      lon: number;
    };
  };
  role: 'farmer' | 'manager' | 'admin' | 'viewer';
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  refreshTokens: string[];
  lastLogin?: Date;
  isActive: boolean;
  isBlocked: boolean;
  blockedReason?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
  generateEmailVerificationToken(): string;
  generatePasswordResetToken(): string;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, unique: true, required: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true },
    organizationType: {
      type: String,
      enum: ['individual', 'cooperative', 'commercial', 'government'],
      required: true,
    },
    organizationName: String,
    farmLocation: {
      province: String,
      municipality: String,
      coordinates: {
        lat: Number,
        lon: Number,
      },
    },
    role: { type: String, enum: ['farmer', 'manager', 'admin', 'viewer'], default: 'farmer' },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    refreshTokens: { type: [String], default: [] },
    lastLogin: Date,
    isActive: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
    blockedReason: String,
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { userId: this._id, email: this.email, role: this.role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ userId: this._id }, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

userSchema.methods.generateEmailVerificationToken = function () {
  const token = generateToken(24);
  this.emailVerificationToken = hashToken(token);
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return token;
};

userSchema.methods.generatePasswordResetToken = function () {
  const token = generateToken(32);
  this.passwordResetToken = hashToken(token);
  this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  return token;
};

export const User = mongoose.model<IUser>('User', userSchema);

import mongoose, { Document, Schema } from 'mongoose';

export interface ITokenBlacklist extends Document {
  token: string;
  type: 'access' | 'refresh';
  expiresAt: Date;
  userId: string;
  reason?: string;
  createdAt: Date;
}

const tokenBlacklistSchema = new Schema<ITokenBlacklist>(
  {
    token: { type: String, required: true, index: true },
    type: { type: String, enum: ['access', 'refresh'], required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    userId: { type: String, required: true },
    reason: String,
  },
  { timestamps: true }
);

export const TokenBlacklist = mongoose.model<ITokenBlacklist>('TokenBlacklist', tokenBlacklistSchema);

import mongoose from 'mongoose';
import { env } from './env';

export const connectDatabase = async () => {
  const uri = env.NODE_ENV === 'production' && env.MONGODB_URI_PROD ? env.MONGODB_URI_PROD : env.MONGODB_URI;
  await mongoose.connect(uri);
  console.log('MongoDB connected');
};

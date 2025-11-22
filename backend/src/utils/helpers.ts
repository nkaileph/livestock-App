import crypto from 'crypto';

export const generateToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export const toSafeUser = <T extends { password?: string; refreshTokens?: unknown }>(user: T) => {
  const clone = { ...user } as any;
  delete clone.password;
  delete clone.refreshTokens;
  return clone;
};

import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { User } from '../models/User';
import { TokenBlacklist } from '../models/TokenBlacklist';
import {
  registerSchema,
  loginSchema,
  emailTokenSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
  resendVerificationSchema,
} from '../utils/validators';
import { hashToken, toSafeUser } from '../utils/helpers';
import { sendPasswordChangedEmail, sendPasswordResetEmail, sendVerificationEmail } from '../services/emailService';
import { verifyRefreshToken } from '../services/tokenService';

export const register = async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.errors } });
  }
  const { email, password, confirmPassword, ...rest } = parsed.data;
  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Passwords do not match' } });
  }

  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Email already registered' } });

  const user = new User({ email, password, ...rest });
  const verificationToken = user.generateEmailVerificationToken();
  await user.save();
  await sendVerificationEmail(user.email, user.firstName, verificationToken);

  return res.status(201).json({
    success: true,
    message: 'Registration successful. Please verify your email.',
    data: { user: toSafeUser(user.toObject()) },
  });
};

export const verifyEmail = async (req: Request, res: Response) => {
  const parsed = emailTokenSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid token' } });
  const tokenHash = hashToken(parsed.data.token);
  const user = await User.findOne({ emailVerificationToken: tokenHash, emailVerificationExpires: { $gt: new Date() } });
  if (!user) return res.status(400).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Token invalid or expired' } });
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();
  return res.json({ success: true, message: 'Email verified successfully. You can now log in.' });
};

export const login = async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid credentials' } });
  const { email, password } = parsed.data;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
  if (!user.isEmailVerified) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Email not verified' } });
  if (!user.isActive || user.isBlocked) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Account disabled' } });

  const valid = await user.comparePassword(password);
  if (!valid) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });

  user.lastLogin = new Date();
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  user.refreshTokens.push(refreshToken);
  await user.save();

  return res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: toSafeUser(user.toObject()),
      accessToken,
      refreshToken,
    },
  });
};

export const refreshToken = async (req: Request, res: Response) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid refresh token' } });
  const { refreshToken } = parsed.data;

  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.userId);
    if (!user) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
    if (!user.refreshTokens.includes(refreshToken))
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Token revoked' } });

    user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
    const newAccess = user.generateAccessToken();
    const newRefresh = user.generateRefreshToken();
    user.refreshTokens.push(newRefresh);
    await user.save();

    return res.json({ success: true, data: { accessToken: newAccess, refreshToken: newRefresh } });
  } catch (err) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
  }
};

export const logout = async (req: Request, res: Response) => {
  const { refreshToken } = req.body || {};
  if (!req.user) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing user' } });
  if (refreshToken) {
    req.user.refreshTokens = req.user.refreshTokens.filter((t) => t !== refreshToken);
    await req.user.save();
  }
  if (req.tokenId) {
    await TokenBlacklist.create({ token: req.tokenId, type: 'access', expiresAt: new Date(Date.now() + 15 * 60 * 1000), userId: req.user.id });
  }
  return res.json({ success: true, message: 'Logged out successfully' });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(200).json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
  const { email } = parsed.data;
  const user = await User.findOne({ email });
  if (user) {
    const token = user.generatePasswordResetToken();
    await user.save();
    await sendPasswordResetEmail(user.email, user.firstName, token);
  }
  return res.status(200).json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
};

export const resetPassword = async (req: Request, res: Response) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } });
  const { token, newPassword, confirmPassword } = parsed.data;
  if (newPassword !== confirmPassword) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Passwords do not match' } });

  const hashedToken = hashToken(token);
  const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: new Date() } });
  if (!user) return res.status(400).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Token invalid or expired' } });

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokens = [];
  await user.save();
  await sendPasswordChangedEmail(user.email, user.firstName);
  return res.json({ success: true, message: 'Password reset successful. Please log in with your new password.' });
};

export const me = async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing user' } });
  return res.json({ success: true, data: { user: toSafeUser(req.user.toObject()) } });
};

export const updateProfile = async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing user' } });
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.errors } });

  Object.assign(req.user, parsed.data);
  await req.user.save();
  return res.json({ success: true, message: 'Profile updated successfully', data: { user: toSafeUser(req.user.toObject()) } });
};

export const changePassword = async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing user' } });
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } });
  const { currentPassword, newPassword, confirmPassword } = parsed.data;
  if (newPassword !== confirmPassword) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Passwords do not match' } });

  const valid = await req.user.comparePassword(currentPassword);
  if (!valid) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid current password' } });

  req.user.password = newPassword;
  req.user.refreshTokens = [];
  await req.user.save();
  await sendPasswordChangedEmail(req.user.email, req.user.firstName);
  return res.json({ success: true, message: 'Password changed successfully' });
};

export const resendVerification = async (req: Request, res: Response) => {
  const parsed = resendVerificationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(200).json({ success: true, message: 'If your email is registered and unverified, a new verification link has been sent.' });
  const { email } = parsed.data;
  const user = await User.findOne({ email });
  if (user && !user.isEmailVerified) {
    const token = user.generateEmailVerificationToken();
    await user.save();
    await sendVerificationEmail(user.email, user.firstName, token);
  }
  return res.status(200).json({ success: true, message: 'If your email is registered and unverified, a new verification link has been sent.' });
};

import { mailer, defaultMailOptions } from '../config/email';
import { env } from '../config/env';

export const sendVerificationEmail = async (email: string, firstName: string, token: string) => {
  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
  await mailer.sendMail({
    ...defaultMailOptions,
    to: email,
    subject: 'Welcome to LiveStock Track - Verify Your Email',
    text: `Hi ${firstName},\n\nWelcome to LiveStock Track! Please verify your email: ${verifyUrl}\n\nThis link expires in 24 hours.`,
  });
};

export const sendPasswordResetEmail = async (email: string, firstName: string, token: string) => {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
  await mailer.sendMail({
    ...defaultMailOptions,
    to: email,
    subject: 'Reset Your LiveStock Track Password',
    text: `Hi ${firstName},\n\nReset your password here: ${resetUrl}\nThis link expires in 1 hour. If you didn't request this, ignore the email.`,
  });
};

export const sendPasswordChangedEmail = async (email: string, firstName: string) => {
  await mailer.sendMail({
    ...defaultMailOptions,
    to: email,
    subject: 'Your Password Has Been Changed',
    text: `Hi ${firstName},\n\nYour LiveStock Track password was changed. If this wasn't you, contact support immediately.`,
  });
};

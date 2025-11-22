  import nodemailer from 'nodemailer';
import { env } from './env';

export const mailer = nodemailer.createTransport({
  host: env.EMAIL_HOST,
  port: env.EMAIL_PORT,
  secure: env.EMAIL_PORT === 465,
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASSWORD,
  },
});

export const defaultMailOptions = {
  from: env.EMAIL_FROM,
};

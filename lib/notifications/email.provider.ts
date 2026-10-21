import nodemailer from 'nodemailer';
import { EmailOptions } from './types';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<void> {
  if (!process.env.SMTP_HOST) {
    console.warn('SMTP_HOST is not set. Skipping email send to:', to);
    return;
  }
  
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'FoodBridge <noreply@foodbridge.local>',
    to,
    subject,
    html,
  });
}

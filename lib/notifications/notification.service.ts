import { BaseNotificationPayload } from './types';
import { sendEmail } from './email.provider';
import { sendInAppNotification } from './in-app.provider';
import { sendSms } from './sms.provider';

export interface SendNotificationParams extends BaseNotificationPayload {
  emailOptions?: {
    to: string;
    subject: string;
    html: string;
  };
  phone?: string;
}

export async function sendNotification(params: SendNotificationParams): Promise<void> {
  const channels = params.channels || ['in-app'];

  const promises: Promise<void>[] = [];

  if (channels.includes('in-app')) {
    promises.push(
      sendInAppNotification(params).catch((err) => {
        console.error('Failed to send in-app notification:', err);
      })
    );
  }

  if (channels.includes('email') && params.emailOptions) {
    promises.push(
      sendEmail(params.emailOptions).catch((err) => {
        console.error('Failed to send email notification:', err);
      })
    );
  }

  if (channels.includes('sms') && params.phone) {
    promises.push(
      sendSms(params.phone, params.message).catch((err) => {
        console.error('Failed to send SMS notification:', err);
      })
    );
  }

  // Wait for all channels to attempt sending
  await Promise.all(promises);
}

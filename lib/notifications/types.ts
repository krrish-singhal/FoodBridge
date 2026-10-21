export type NotificationType =
  | 'NEW_DONATION'
  | 'MATCH_FOUND'
  | 'MATCH_ACCEPTED'
  | 'PICKUP_SCHEDULED'
  | 'PICKUP_APPROACHING'
  | 'EXPIRING_SOON'
  | 'DELIVERY_COMPLETED'
  | 'VERIFICATION_UPDATE'
  | 'SYSTEM_ALERT';

export interface BaseNotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  idempotencyKey?: string;
  channels?: ('in-app' | 'email' | 'sms')[];
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

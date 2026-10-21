import { createAdminClient } from '@/lib/supabase/admin';
import { BaseNotificationPayload } from './types';

export async function sendInAppNotification(payload: BaseNotificationPayload): Promise<void> {
  // Use admin client so we can insert notifications securely on the backend
  const supabase = createAdminClient();
  
  const { error } = await supabase.from('notifications').insert({
    user_id: payload.userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    is_read: false,
  });

  if (error) {
    if (error.code === '23505') {
      // Unique violation for idempotency key
      console.log(`Notification skipped due to idempotency: ${payload.idempotencyKey}`);
      return;
    }
    throw error;
  }
}

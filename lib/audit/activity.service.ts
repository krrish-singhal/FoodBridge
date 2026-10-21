import { createAdminClient } from '@/lib/supabase/admin'

export type EventType =
  | 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'PASSWORD_RESET'
  | 'ORGANIZATION_CREATED' | 'ORGANIZATION_UPDATED' | 'VERIFICATION_SUBMITTED' | 'VERIFICATION_APPROVED' | 'VERIFICATION_REJECTED'
  | 'USER_CREATED' | 'USER_UPDATED' | 'ROLE_CHANGED' | 'ACCOUNT_SUSPENDED'
  | 'DONATION_CREATED' | 'DONATION_UPDATED' | 'DONATION_PUBLISHED' | 'DONATION_CANCELLED' | 'DONATION_EXPIRED'
  | 'MATCH_CREATED' | 'MATCH_ACCEPTED' | 'MATCH_REJECTED' | 'MATCH_TIMED_OUT' | 'REMATCH_TRIGGERED'
  | 'PICKUP_CREATED' | 'PICKUP_SCHEDULED' | 'PICKUP_CONFIRMED' | 'OTP_VERIFIED' | 'PICKUP_COMPLETED' | 'PICKUP_FAILED'
  | 'MESSAGE_SENT' | 'NOTIFICATION_CREATED' | 'NOTIFICATION_READ'
  | 'RATING_SUBMITTED' | 'RELIABILITY_UPDATED'
  | 'REPORT_GENERATED' | 'REPORT_EXPORTED'

export type Severity = 'INFO' | 'WARNING' | 'CRITICAL' | 'ERROR'

export interface LogActivityParams {
  actor_id?: string
  actor_role?: string
  event_type: EventType
  entity_type: string
  entity_id?: string
  entity_public_id?: string
  description?: string
  severity?: Severity
  metadata?: Record<string, any>
  ip_address?: string
  user_agent?: string
}

export async function logActivity(params: LogActivityParams) {
  const adminClient = createAdminClient()
  
  try {
    const { error } = await adminClient.from('audit_logs').insert({
      actor_id: params.actor_id,
      action: params.event_type,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      ip_address: params.ip_address,
      metadata: {
        ...(params.metadata || {}),
        note: params.description,
        severity: params.severity || 'INFO',
        actor_role: params.actor_role,
        entity_public_id: params.entity_public_id,
        user_agent: params.user_agent
      }
    } as any)

    if (error) {
      console.error('Failed to log activity:', error)
    }
  } catch (err) {
    console.error('Exception while logging activity:', err)
  }
}

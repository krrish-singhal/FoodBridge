'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/nodemailer'
import { logActivity } from '@/lib/audit/activity.service'

/**
 * Initiates application-controlled password reset email via Nodemailer and Supabase Auth recovery token (Section 9).
 * Returns a generic success response to prevent email enumeration attacks.
 */
export async function requestPasswordReset(formData: FormData) {
  const email = (formData.get('email') as string)?.toLowerCase().trim()
  if (!email) {
    return { error: 'Please enter your email address.' }
  }

  const adminClient = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    // Generate recovery link using Supabase Admin API
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${appUrl}/reset-password`,
      },
    })

    if (!error && data?.properties?.action_link) {
      const resetLink = data.properties.action_link

      // Send branded recovery email via Nodemailer/SMTP
      await sendEmail({
        to: email,
        subject: 'Reset your FoodBridge Password',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <div style="margin-bottom: 20px;">
              <h2 style="color: #059669; margin: 0; font-size: 24px; font-weight: 800;">FoodBridge</h2>
              <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Surplus Food Redistribution Platform</p>
            </div>
            
            <h3 style="color: #0f172a; margin: 0 0 12px 0; font-size: 18px;">Password Reset Request</h3>
            <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
              We received a request to reset the password associated with this email address. Click the secure button below to choose a new password:
            </p>
            
            <div style="text-align: center; margin: 24px 0;">
              <a href="${resetLink}" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 16px 0 0 0;">
              This link is single-use and will expire in 1 hour. If you did not request this reset, you can safely ignore this email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0 16px 0;" />
            <p style="color: #94a3b8; font-size: 11px; margin: 0;">
              FoodBridge Security Team • Never share this link with anyone.
            </p>
          </div>
        `,
      })

      // Log security event (without storing recovery token)
      await logActivity({
        event_type: 'PASSWORD_RESET',
        entity_type: 'AUTH',
        description: `Password reset recovery link generated and dispatched via SMTP for ${email}`,
        severity: 'INFO',
      })
    }
  } catch (err) {
    console.error('Password reset handler error:', err)
  }

  // Always return generic response to avoid user enumeration
  return {
    success: true,
    message: 'If an account exists with this email address, password reset instructions have been sent to your inbox.',
  }
}

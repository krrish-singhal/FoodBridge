'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/audit/activity.service'
import { sendEmail } from '@/lib/email/nodemailer'
import { sendNotification } from '@/lib/notifications/notification.service'

/**
 * Admin Verification and NGO Account Provisioning Workflow (Section 8 / REQ-4).
 * Enforces admin authorization, updates organization status, provisions NGO Auth user,
 * assigns NGO role securely server-side, links membership, and sends approval notifications.
 */
export async function updateVerificationStatus(
  verificationId: string,
  organizationId: string,
  status: 'VERIFIED' | 'REJECTED',
  rejectionReason?: string
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'ADMIN') {
    return { error: 'Unauthorized: Only platform administrators can verify organizations.' }
  }

  const adminClient = createAdminClient()

  // 1. Fetch organization details
  const { data: org, error: orgFetchError } = await adminClient
    .from('organizations')
    .select('id, name, email, contact_person, type, city, public_id')
    .eq('id', organizationId)
    .single()

  if (orgFetchError || !org) {
    return { error: 'Organization record not found.' }
  }

  // 2. Update verification record
  const { error: verifyError } = await adminClient
    .from('organization_verification')
    .update({
      status,
      reviewer_id: user.id,
      rejection_reason: rejectionReason || null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', verificationId)

  if (verifyError) {
    return { error: 'Failed to update verification record.' }
  }

  // 3. Update organization status
  const { error: orgError } = await adminClient
    .from('organizations')
    .update({
      verification_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId)

  if (orgError) {
    return { error: 'Failed to update organization status.' }
  }

  // 4. If approved and organization is an NGO, ensure an Auth account is provisioned
  let provisionedUserId: string | null = null
  let initialPassword = ''

  if (status === 'VERIFIED' && org.type === 'NGO' && org.email) {
    // Check if user already exists with this email
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('email', org.email)
      .maybeSingle()

    if (existingProfile) {
      provisionedUserId = existingProfile.id
      // Ensure role is NGO in profiles and auth metadata
      await adminClient.from('profiles').update({ role: 'NGO' }).eq('id', existingProfile.id)
      await adminClient.auth.admin.updateUserById(existingProfile.id, {
        app_metadata: { role: 'NGO' },
        user_metadata: { role: 'NGO' },
      })
    } else {
      // Provision fresh credentials for the official email
      initialPassword = `FoodBridge#${Math.floor(100000 + Math.random() * 900000)}`
      const { data: createdAuth, error: createError } = await adminClient.auth.admin.createUser({
        email: org.email,
        password: initialPassword,
        email_confirm: true,
        app_metadata: { role: 'NGO' },
        user_metadata: {
          role: 'NGO',
          full_name: org.contact_person || org.name,
        },
      })

      if (!createError && createdAuth?.user) {
        provisionedUserId = createdAuth.user.id

        // Create profile
        await adminClient.from('profiles').upsert({
          id: createdAuth.user.id,
          email: org.email,
          full_name: org.contact_person || org.name,
          role: 'NGO',
          created_at: new Date().toISOString(),
        })
      }
    }

    // Link user to organization in organization_members
    if (provisionedUserId) {
      await adminClient.from('organization_members').upsert({
        organization_id: organizationId,
        user_id: provisionedUserId,
        role: 'ADMIN',
      }, { onConflict: 'organization_id,user_id' })

      // Initialize reliability score if missing
      await adminClient.from('reliability_scores').upsert({
        organization_id: organizationId,
        score: 100,
        total_completed: 0,
        total_failed: 0,
      }, { onConflict: 'organization_id' })

      // Dispatch in-app welcome notification
      await sendNotification({
        userId: provisionedUserId,
        type: 'VERIFICATION_UPDATE',
        title: 'Organization Verification Approved! 🎉',
        message: `Welcome to FoodBridge! Your non-profit profile for "${org.name}" has been verified. You can now claim matching surplus food donations.`,
        channels: ['in-app'],
      })
    }

    // Dispatch approval email via Nodemailer
    sendEmail({
      to: org.email,
      subject: `FoodBridge Organization Verification Approved: ${org.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
          <h2 style="color: #059669;">Welcome to FoodBridge!</h2>
          <p>Dear ${org.contact_person || 'Representative'},</p>
          <p>We are delighted to inform you that your organization <strong>${org.name}</strong> has been officially <strong>verified</strong> as a partner on the FoodBridge surplus redistribution platform.</p>
          <p>Your portal account is active with the <strong>NGO</strong> role.</p>
          ${
            initialPassword
              ? `<div style="background: #f0fdf4; padding: 12px; border-radius: 6px; border: 1px solid #bbf7d0; margin: 16px 0;">
                  <p style="margin: 0; font-size: 13px; color: #166534;"><strong>Initial Account Credentials:</strong></p>
                  <p style="margin: 4px 0 0 0; font-size: 14px;">Email: <strong>${org.email}</strong></p>
                  <p style="margin: 4px 0 0 0; font-size: 14px;">Temporary Password: <strong>${initialPassword}</strong></p>
                  <p style="margin: 6px 0 0 0; font-size: 12px; color: #4b5563;">Please sign in at <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login">FoodBridge Login</a> and update your password.</p>
                </div>`
              : `<p>You can sign in with your verified email (${org.email}) to start claiming food matches.</p>`
          }
          <p style="margin-top: 20px; font-size: 12px; color: #64748b;">FoodBridge Surplus Food Redistribution System • Automated Verification Service</p>
        </div>
      `,
    }).catch(err => console.error('Error sending verification email:', err))
  }

  // 5. If rejected, notify applicant
  if (status === 'REJECTED' && org.email) {
    sendEmail({
      to: org.email,
      subject: `FoodBridge Application Status: ${org.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
          <h3 style="color: #b91c1c;">Application Status Update</h3>
          <p>Dear ${org.contact_person || 'Representative'},</p>
          <p>Thank you for your application to partner with FoodBridge. Following review of your submitted credentials for <strong>${org.name}</strong>, our administrative team was unable to verify the organization at this time.</p>
          ${rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ''}
          <p>For inquiries or to provide updated documentation, please contact our support team.</p>
        </div>
      `,
    }).catch(err => console.error('Error sending rejection email:', err))
  }

  // 6. Record audit log
  await logActivity({
    actor_id: user.id,
    actor_role: 'ADMIN',
    event_type: `VERIFICATION_${status}` as any,
    entity_type: 'ORGANIZATION',
    entity_id: organizationId,
    entity_public_id: org.public_id || undefined,
    description: `Admin ${status.toLowerCase()} organization "${org.name}". Provisioned: ${provisionedUserId ? 'Yes' : 'No'}. Reason: ${rejectionReason || 'None'}`,
    severity: status === 'VERIFIED' ? 'INFO' : 'WARNING',
  })

  revalidatePath('/admin/verifications')
  revalidatePath('/admin/organizations')
  revalidatePath('/admin/dashboard')

  return { success: true }
}

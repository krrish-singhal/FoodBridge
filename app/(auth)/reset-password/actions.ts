'use server'

import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/audit/activity.service'

export async function resetPassword(formData: FormData) {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || !confirmPassword) {
    return { error: 'Please enter and confirm your new password.' }
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters long.' }
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.updateUser({
    password,
  })

  if (error || !data.user) {
    console.error('Password update error:', error)
    return { error: error?.message || 'Failed to update password. Your reset link may have expired.' }
  }

  await logActivity({
    actor_id: data.user.id,
    event_type: 'PASSWORD_RESET',
    entity_type: 'AUTH',
    description: 'User successfully updated password via recovery flow',
    severity: 'INFO',
  })

  return { success: true }
}

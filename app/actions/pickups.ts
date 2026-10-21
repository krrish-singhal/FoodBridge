'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function uploadProofRecord(pickupId: string, publicUrl: string) {
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('pickup_proof').insert({
    pickup_id: pickupId,
    proof_url: publicUrl,
    notes: 'Uploaded via Provider Dashboard'
  } as any)

  if (error) throw new Error(error.message)
}

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Upload, FileImage } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { uploadProofRecord } from '@/app/actions/pickups'

export function UploadProofForm({ pickupId }: { pickupId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploaded, setUploaded] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    
    setLoading(true)
    setError(null)
    
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${pickupId}_${Math.random()}.${fileExt}`
      const filePath = `pickup_proofs/${fileName}`

      // NOTE: Assuming there's a 'donations' or 'proofs' bucket configured in Supabase.
      // If it doesn't exist, this will fail in the browser until configured.
      // Using public placeholder for demonstration of architecture.
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images') // Usually 'donations' or a generic images bucket
        .upload(filePath, file)
        
      if (uploadError) {
        throw uploadError
      }
      
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath)
      
      await uploadProofRecord(pickupId, publicUrl)
      
      setUploaded(true)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to upload proof')
    } finally {
      setLoading(false)
    }
  }

  if (uploaded) {
    return <span className="text-xs text-green-600 flex items-center mt-2"><FileImage className="w-3 h-3 mr-1"/> Proof Uploaded</span>
  }

  return (
    <div className="mt-2 relative">
      <label className="flex items-center space-x-2 text-xs font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        <span>Upload Pickup Proof (Photo)</span>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange} 
          className="hidden" 
          disabled={loading}
        />
      </label>
      {error && <span className="text-xs text-red-500 block mt-1">{error}</span>}
    </div>
  )
}

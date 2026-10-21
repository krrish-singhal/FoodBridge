'use client'

import { useState, useEffect } from 'react'
import { Save, User, Building, MapPin } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getSettings, updateSettings } from '@/app/actions/settings'
import { toast } from 'sonner'

export default function ProviderSettingsPage() {
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  
  // Notification Preferences
  const [notifPrefs, setNotifPrefs] = useState({
    push_notifications: true,
    email_notifications: true,
  })
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: ''
  })

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getSettings()
        if (data && data.org) {
          setOrgId(data.org.id)
          setFormData({
            name: data.org.name,
            email: data.org.email || '',
            phone: data.org.phone || '',
            address: data.org.address || '',
            city: data.org.city || '',
            country: data.org.country || ''
          })
          setNotifPrefs({
            push_notifications: data.prefs.push_notifications,
            email_notifications: data.prefs.email_notifications
          })
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId) return
    
    setSaving(true)
    try {
      await updateSettings(orgId, formData, notifPrefs)
      toast.success('Profile updated successfully!')
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-12 text-center">Loading profile...</div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Organization Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Update your provider profile and contact information.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Organization Name</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="pl-10 block w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm h-10 border"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm h-10 border px-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm h-10 border px-3"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Street Address</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="pl-10 block w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm h-10 border"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm h-10 border px-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({...formData, country: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm h-10 border px-3"
              />
            </div>
          </div>
          
          {/* Notification Preferences */}
          <div className="pt-6 border-t border-gray-100">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              Notification Preferences
            </h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  id="notif_in_app"
                  type="checkbox"
                  checked={notifPrefs.push_notifications}
                  onChange={(e) => setNotifPrefs({...notifPrefs, push_notifications: e.target.checked})}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="notif_in_app" className="ml-2 block text-sm text-gray-900">
                  Receive In-App Notifications
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="notif_email"
                  type="checkbox"
                  checked={notifPrefs.email_notifications}
                  onChange={(e) => setNotifPrefs({...notifPrefs, email_notifications: e.target.checked})}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="notif_email" className="ml-2 block text-sm text-gray-900">
                  Receive Email Notifications
                </label>
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

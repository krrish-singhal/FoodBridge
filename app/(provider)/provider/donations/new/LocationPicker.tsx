'use client'

import { useState } from 'react'
import { MapPin, Navigation, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function LocationPicker() {
  const [address, setAddress] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)

  function handleLocate() {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.')
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setCoords({ lat: latitude, lng: longitude })
        toast.success(`Coordinates captured (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`)
        setLocating(false)
      },
      (err) => {
        console.warn('Geolocation error:', err.message)
        toast.info('Location permission denied or unavailable. Please enter address manually.')
        setLocating(false)
      },
      { timeout: 8000 }
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label htmlFor="address" className="block text-sm font-semibold text-gray-700">
          Pickup Address & Hub <span className="text-red-500">*</span>
        </label>
        <button
          type="button"
          onClick={handleLocate}
          disabled={locating}
          className="inline-flex items-center text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
        >
          {locating ? (
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
          ) : (
            <Navigation className="w-3.5 h-3.5 mr-1" />
          )}
          {coords ? `GPS: ${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}` : 'Detect Current GPS Coordinates'}
        </button>
      </div>

      <input
        type="text"
        name="address"
        id="address"
        required
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Building name, Street, Landmark, Area"
        className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
      />

      {/* Hidden coordinates passed to server action */}
      {coords && (
        <input
          type="hidden"
          name="coordinates"
          value={`POINT(${coords.lng} ${coords.lat})`}
        />
      )}
    </div>
  )
}

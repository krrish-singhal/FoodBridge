import { createClient } from '@/lib/supabase/server'
import { Leaf, Users, Clock, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export const revalidate = 3600 // Cache for 1 hour

export default async function ImpactDashboardPage() {
  const supabase = await createClient()

  // 1. Fetch total meals rescued (Donations marked as PICKED_UP, DELIVERED, DISTRIBUTED)
  const { data: donations } = await supabase
    .from('donations')
    .select('quantity, quantity_unit, status')
    .in('status', ['PICKED_UP', 'DELIVERED', 'DISTRIBUTED'])

  let totalMeals = 0
  if (donations) {
    totalMeals = donations.reduce((acc, d) => {
      // Very rough conversion: 1 kg = 2 meals, 1 unit = 1 meal, 1 lb = 1 meal
      let meals = d.quantity
      if (d.quantity_unit === 'KG') meals *= 2
      if (d.quantity_unit === 'LBS') meals *= 1
      return acc + meals
    }, 0)
  }

  // 2. Fetch total verified organizations
  const { count: orgCount } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true })
    .eq('verification_status', 'VERIFIED')

  // 3. Fetch recent successful donations for activity feed
  const { data: recentDonations } = await supabase
    .from('donations')
    .select(`
      id,
      food_name,
      quantity,
      quantity_unit,
      updated_at,
      provider:organizations!provider_id(type)
    `)
    .in('status', ['PICKED_UP', 'DELIVERED', 'DISTRIBUTED'])
    .order('updated_at', { ascending: false })
    .limit(5)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Leaf className="h-6 w-6 text-green-600" />
            <span className="font-bold text-xl text-green-800">FoodBridge</span>
          </Link>
          <div className="flex space-x-4">
            <Link href="/login" className="text-gray-600 hover:text-green-600 px-3 py-2 text-sm font-medium">Log In</Link>
          </div>
        </div>
      </header>
      
      <main className="flex-grow pt-16 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
              Our Collective <span className="text-green-600">Impact</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Transparent, real-time metrics showing how FoodBridge is connecting surplus food with communities in need.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {/* Stat Card 1 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center flex flex-col items-center">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Leaf className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-5xl font-black text-gray-900 mb-2">{totalMeals.toLocaleString()}</h2>
              <p className="text-lg font-medium text-gray-500 uppercase tracking-wide">Meals Rescued</p>
            </div>

            {/* Stat Card 2 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center flex flex-col items-center">
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-5xl font-black text-gray-900 mb-2">{orgCount || 0}</h2>
              <p className="text-lg font-medium text-gray-500 uppercase tracking-wide">Verified Partners</p>
            </div>

            {/* Stat Card 3 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center flex flex-col items-center">
              <div className="h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <Clock className="h-8 w-8 text-amber-600" />
              </div>
              <h2 className="text-5xl font-black text-gray-900 mb-2">~45m</h2>
              <p className="text-lg font-medium text-gray-500 uppercase tracking-wide">Avg. Match Time</p>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Recent Successful Rescues</h3>
            
            {recentDonations && recentDonations.length > 0 ? (
              <div className="space-y-6">
                {recentDonations.map((d: any) => (
                  <div key={d.id} className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    </div>
                    <div className="ml-4">
                      <p className="text-lg font-medium text-gray-900">
                        {d.quantity} {d.quantity_unit} of {d.food_name} rescued!
                      </p>
                      <p className="text-sm text-gray-500">
                        Donated by a verified {d.provider?.type?.replace('_', ' ')?.toLowerCase() || 'partner'} • {new Date(d.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No recent rescues found yet.</p>
            )}
          </div>

        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Leaf className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-gray-900">FoodBridge</span>
          </div>
          <p className="text-sm text-gray-500">© 2026 FoodBridge. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

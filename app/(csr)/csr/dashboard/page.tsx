import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth/getUser'
import { redirect } from 'next/navigation'
import { Award, TrendingUp, Users, HeartHandshake, ShieldCheck, Leaf } from 'lucide-react'

export default async function CsrDashboardPage() {
  const auth = await getCurrentUser()
  if (!auth) redirect('/login')

  const adminClient = createAdminClient()

  // Fetch real aggregated impact stats from database
  const { data: donations } = await adminClient
    .from('donations')
    .select('id, meals_estimate, quantity, status, created_at')

  const totalMeals = (donations || []).reduce((acc, d) => acc + (d.meals_estimate || 0), 0)
  const totalCompleted = (donations || []).filter(d => ['PICKED_UP', 'DELIVERED', 'DISTRIBUTED'].includes(d.status)).length
  const totalQuantityKg = (donations || []).reduce((acc, d) => acc + (Number(d.quantity) || 0), 0)
  const co2DivertedKg = Math.round(totalQuantityKg * 2.5)

  const { count: orgCount } = await adminClient
    .from('organizations')
    .select('id', { count: 'exact', head: true })

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-gray-900">CSR Dashboard</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              <Award className="w-3.5 h-3.5 mr-1" /> Corporate Impact Partner
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Corporate Social Responsibility & ESG Surplus Food Rescue Tracking
          </p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Meals Rescued</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{totalMeals.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Completed Distributions</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{totalCompleted}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <Leaf className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">CO₂ Emissions Saved</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{co2DivertedKg.toLocaleString()} kg</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Network Organizations</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{orgCount || 0}</p>
          </div>
        </div>
      </div>

      {/* ESG Impact Overview */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center">
          <ShieldCheck className="w-5 h-5 mr-2 text-emerald-600" />
          UN Sustainable Development Goals (SDG) Alignment
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-gray-100 bg-amber-50/50">
            <p className="text-xs font-bold text-amber-800">SDG 2: Zero Hunger</p>
            <p className="text-sm text-gray-700 mt-1">Directly funding and overseeing high-volume surplus food transfers to verified grassroots shelters.</p>
          </div>
          <div className="p-4 rounded-xl border border-gray-100 bg-emerald-50/50">
            <p className="text-xs font-bold text-emerald-800">SDG 12: Responsible Consumption</p>
            <p className="text-sm text-gray-700 mt-1">Preventing commercial edible food from entering landfills through real-time matching.</p>
          </div>
          <div className="p-4 rounded-xl border border-gray-100 bg-blue-50/50">
            <p className="text-xs font-bold text-blue-800">SDG 13: Climate Action</p>
            <p className="text-sm text-gray-700 mt-1">Mitigating methane emissions from food decay with verified pickup proof and audit trails.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

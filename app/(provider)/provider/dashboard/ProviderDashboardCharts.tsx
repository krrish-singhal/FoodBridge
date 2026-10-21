'use client'

import { useState, useId } from 'react'
import {
  Heart,
  TrendingUp,
  Award,
  Sparkles,
  Info,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Utensils,
  ChevronRight,
  ShieldCheck,
  X,
} from 'lucide-react'
import { HappyScoreBreakdown } from '@/lib/analytics/happy-score'

interface DonationSummaryItem {
  id: string
  food_name: string
  meals_estimate: number
  quantity: number
  quantity_unit: string
  status: string
  created_at: string
  category_name?: string
}

interface ProviderDashboardChartsProps {
  donations: DonationSummaryItem[]
  happyScore: HappyScoreBreakdown
  orgName: string
  dateRange: string
}

export function ProviderDashboardCharts({
  donations,
  happyScore,
  orgName,
  dateRange: initialDateRange,
}: ProviderDashboardChartsProps) {
  const [dateRange, setDateRange] = useState(initialDateRange || 'all')
  const [metricTab, setMetricTab] = useState<'meals' | 'weight'>('meals')
  const [showHappyModal, setShowHappyModal] = useState(false)
  const [hoveredStatusSlice, setHoveredStatusSlice] = useState<string | null>(null)
  const chartId = useId()

  // Standard conversion policy: 1 portion = 0.4 kg, 1 meal = 0.4 kg; 1 kg = 2.5 meals
  const toKg = (quantity: number, unit: string, meals: number) => {
    const u = (unit || '').toLowerCase()
    if (u === 'kg' || u === 'kgs' || u === 'kilograms') return quantity
    if (u === 'portions' || u === 'plates' || u === 'packets') return quantity * 0.4
    if (meals > 0) return meals * 0.4
    return quantity
  }

  // Filter donations by date range
  const now = new Date()
  const filteredDonations = donations.filter(d => {
    if (dateRange === 'all') return true
    const itemDate = new Date(d.created_at)
    const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24)
    if (dateRange === '7d') return diffDays <= 7
    if (dateRange === '30d') return diffDays <= 30
    if (dateRange === '90d') return diffDays <= 90
    return true
  })

  // KPI Calculations
  const totalDonations = filteredDonations.length
  const completedDonations = filteredDonations.filter(d =>
    ['DISTRIBUTED', 'DELIVERED', 'PICKED_UP'].includes(d.status)
  )
  const totalMealsSaved = completedDonations.reduce((sum, d) => sum + (d.meals_estimate || 0), 0)
  const totalWeightSavedKg = completedDonations.reduce(
    (sum, d) => sum + toKg(d.quantity, d.quantity_unit, d.meals_estimate),
    0
  )
  const successRate = totalDonations > 0 ? Math.round((completedDonations.length / totalDonations) * 100) : 100

  // Status Distribution
  const statusCounts: Record<string, number> = {}
  filteredDonations.forEach(d => {
    statusCounts[d.status] = (statusCounts[d.status] || 0) + 1
  })

  const statusColors: Record<string, { bg: string; stroke: string; label: string }> = {
    DELIVERED: { bg: '#10b981', stroke: '#059669', label: 'Delivered / Rescued' },
    DISTRIBUTED: { bg: '#059669', stroke: '#047857', label: 'Distributed' },
    PICKED_UP: { bg: '#34d399', stroke: '#10b981', label: 'Picked Up' },
    AVAILABLE: { bg: '#f59e0b', stroke: '#d97706', label: 'Available (Listing)' },
    MATCHED: { bg: '#3b82f6', stroke: '#2563eb', label: 'Matched with NGO' },
    PICKUP_SCHEDULED: { bg: '#8b5cf6', stroke: '#7c3aed', label: 'Pickup Scheduled' },
    EXPIRED: { bg: '#ef4444', stroke: '#dc2626', label: 'Expired' },
    CANCELLED: { bg: '#6b7280', stroke: '#4b5563', label: 'Cancelled' },
  }

  const statusSlices = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
    label: statusColors[status]?.label || status,
    color: statusColors[status]?.bg || '#94a3b8',
    percent: totalDonations > 0 ? Math.round((count / totalDonations) * 100) : 0,
  }))

  // Monthly Trend Data
  const monthlyData: Record<string, { meals: number; weight: number }> = {}
  filteredDonations.forEach(d => {
    const date = new Date(d.created_at)
    const monthKey = date.toLocaleString('default', { month: 'short' })
    if (!monthlyData[monthKey]) monthlyData[monthKey] = { meals: 0, weight: 0 }
    if (['DISTRIBUTED', 'DELIVERED', 'PICKED_UP'].includes(d.status)) {
      monthlyData[monthKey].meals += d.meals_estimate || 0
      monthlyData[monthKey].weight += toKg(d.quantity, d.quantity_unit, d.meals_estimate)
    }
  })

  const trendMonths = Object.keys(monthlyData).length > 0 ? Object.keys(monthlyData) : ['Past', 'Recent', 'Current']
  const trendValues = trendMonths.map(m =>
    metricTab === 'meals' ? monthlyData[m]?.meals || 0 : Math.round(monthlyData[m]?.weight || 0)
  )
  const maxTrendVal = Math.max(...trendValues, 10)

  // Category Distribution
  const categoryCounts: Record<string, number> = {}
  filteredDonations.forEach(d => {
    const cat = d.category_name || 'Cooked Meals'
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
  })
  const categoryList = Object.entries(categoryCounts).map(([name, count]) => ({
    name,
    count,
    pct: totalDonations > 0 ? Math.round((count / totalDonations) * 100) : 0,
  }))

  return (
    <div className="space-y-6">
      {/* Date Range Selector & Global Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-semibold text-gray-800">Filter Analysis:</span>
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            {[
              { id: 'all', label: 'All Time' },
              { id: '90d', label: 'Past 90 Days' },
              { id: '30d', label: 'Past 30 Days' },
              { id: '7d', label: 'Past 7 Days' },
            ].map(r => (
              <button
                key={r.id}
                onClick={() => setDateRange(r.id)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  dateRange === r.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Happy Score Pill Button */}
        <button
          onClick={() => setShowHappyModal(true)}
          className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 transition-colors shadow-xs"
        >
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-semibold">Happy Score:</span>
          <span className="text-sm font-extrabold text-emerald-700">{happyScore.score}/100</span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
            {happyScore.tier}
          </span>
          <Info className="w-3.5 h-3.5 text-emerald-600 ml-1" />
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Meals */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-emerald-100">Meals Rescued</span>
            <div className="rounded-lg bg-white/20 p-2 backdrop-blur-xs">
              <Utensils className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight">{totalMealsSaved.toLocaleString()}</p>
          <p className="mt-1 text-xs text-emerald-100 flex items-center">
            <TrendingUp className="w-3.5 h-3.5 mr-1 inline" />
            Nutritional sustenance distributed to hungry people
          </p>
        </div>

        {/* Weight in KG */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-amber-100">Weight Diverted</span>
            <div className="rounded-lg bg-white/20 p-2 backdrop-blur-xs">
              <Scale className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight">
            {Math.round(totalWeightSavedKg).toLocaleString()} <span className="text-lg font-normal">kg</span>
          </p>
          <p className="mt-1 text-xs text-amber-100 flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" />
            Saved from methane-producing landfill waste
          </p>
        </div>

        {/* Total Listings & Fulfillment */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-blue-100">Listing Fulfillment</span>
            <div className="rounded-lg bg-white/20 p-2 backdrop-blur-xs">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight">{successRate}%</p>
          <p className="mt-1 text-xs text-blue-100 flex items-center">
            <span>{completedDonations.length} of {totalDonations} batches completed</span>
          </p>
        </div>

        {/* Happy Score Card */}
        <div
          onClick={() => setShowHappyModal(true)}
          className="relative overflow-hidden rounded-xl bg-white border border-emerald-100 p-5 shadow-md cursor-pointer hover:border-emerald-300 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Happy Score</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 group-hover:bg-emerald-100">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <p className="text-3xl font-extrabold text-emerald-600">{happyScore.score}</p>
            <span className="text-sm font-semibold text-gray-400">/ 100</span>
          </div>
          <p className="mt-1 text-xs text-emerald-700 font-medium flex items-center">
            <span>Rank: {happyScore.tier}</span>
            <ChevronRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
          </p>
        </div>
      </div>

      {/* Visualizations Section: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Trend Spline Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
            <div>
              <h3 className="text-base font-bold text-gray-900">Donation Impact Trends</h3>
              <p className="text-xs text-gray-500">Track monthly surplus food recovery and meal distribution.</p>
            </div>
            {/* Meals vs Weight Toggle */}
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
              <button
                onClick={() => setMetricTab('meals')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  metricTab === 'meals' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Meals ({totalMealsSaved})
              </button>
              <button
                onClick={() => setMetricTab('weight')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  metricTab === 'weight' ? 'bg-white text-amber-700 shadow-xs' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Weight ({Math.round(totalWeightSavedKg)} kg)
              </button>
            </div>
          </div>

          {/* SVG Curved Spline Area Chart */}
          <div className="w-full h-64 relative flex items-end">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id={`${chartId}-trend-grad`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={metricTab === 'meals' ? '#10b981' : '#f59e0b'} stopOpacity="0.35" />
                  <stop offset="100%" stopColor={metricTab === 'meals' ? '#10b981' : '#f59e0b'} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              <line x1="0" y1="40" x2="500" y2="40" stroke="#f1f5f9" strokeDasharray="4 4" />
              <line x1="0" y1="100" x2="500" y2="100" stroke="#f1f5f9" strokeDasharray="4 4" />
              <line x1="0" y1="160" x2="500" y2="160" stroke="#f1f5f9" strokeDasharray="4 4" />

              {/* Area spline */}
              {(() => {
                const points = trendValues.map((v, i) => {
                  const x = (i / Math.max(trendValues.length - 1, 1)) * 480 + 10
                  const y = 180 - (v / maxTrendVal) * 140
                  return { x, y, v, month: trendMonths[i] }
                })

                if (points.length < 2) return null

                // Generate cubic bezier path
                let pathD = `M ${points[0].x} ${points[0].y}`
                for (let i = 0; i < points.length - 1; i++) {
                  const curr = points[i]
                  const next = points[i + 1]
                  const cp1x = curr.x + (next.x - curr.x) / 2
                  const cp1y = curr.y
                  const cp2x = curr.x + (next.x - curr.x) / 2
                  const cp2y = next.y
                  pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`
                }

                const areaD = `${pathD} L ${points[points.length - 1].x} 190 L ${points[0].x} 190 Z`

                return (
                  <g>
                    <path d={areaD} fill={`url(#${chartId}-trend-grad)`} />
                    <path
                      d={pathD}
                      fill="none"
                      stroke={metricTab === 'meals' ? '#10b981' : '#f59e0b'}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    {points.map((p, idx) => (
                      <g key={idx} className="cursor-pointer group">
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="5"
                          fill="#ffffff"
                          stroke={metricTab === 'meals' ? '#059669' : '#d97706'}
                          strokeWidth="2.5"
                        />
                        <text
                          x={p.x}
                          y={p.y - 12}
                          textAnchor="middle"
                          className="text-[11px] font-bold fill-gray-700"
                        >
                          {p.v}
                        </text>
                      </g>
                    ))}
                  </g>
                )
              })()}
            </svg>
          </div>

          {/* Month labels */}
          <div className="flex justify-between text-xs font-semibold text-gray-500 pt-3 border-t border-gray-100">
            {trendMonths.map((m, i) => (
              <span key={i}>{m}</span>
            ))}
          </div>
        </div>

        {/* Right Column: Status Breakdown Donut Chart (1 col) */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">Donation Lifecycle</h3>
            <p className="text-xs text-gray-500">Live statuses across active & delivered batches.</p>
          </div>

          {/* Donut Chart */}
          <div className="relative my-4 flex items-center justify-center h-48">
            <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" strokeWidth="12" />
              {(() => {
                let accumulatedPercent = 0
                return statusSlices.map((slice, idx) => {
                  const circumference = 2 * Math.PI * 38
                  const strokeDasharray = `${(slice.percent / 100) * circumference} ${circumference}`
                  const strokeDashoffset = -((accumulatedPercent / 100) * circumference)
                  accumulatedPercent += slice.percent

                  return (
                    <circle
                      key={idx}
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke={slice.color}
                      strokeWidth="12"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                      onMouseEnter={() => setHoveredStatusSlice(slice.status)}
                      onMouseLeave={() => setHoveredStatusSlice(null)}
                    />
                  )
                })
              })()}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-extrabold text-gray-900">{totalDonations}</span>
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Total Listings</span>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-1.5 pt-3 border-t border-gray-100 max-h-40 overflow-y-auto">
            {statusSlices.map((slice, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between text-xs p-1 rounded-md transition-colors ${
                  hoveredStatusSlice === slice.status ? 'bg-gray-100 font-semibold' : ''
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                  <span className="text-gray-700">{slice.label}</span>
                </div>
                <span className="font-bold text-gray-900">
                  {slice.count} ({slice.percent}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Breakdown Bar Progress */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-base font-bold text-gray-900 mb-1">Food Category Distribution</h3>
        <p className="text-xs text-gray-500 mb-4">Breakdown of surplus food streams donated by your kitchen.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryList.map((cat, idx) => (
            <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex justify-between items-center text-xs font-semibold text-gray-800 mb-1.5">
                <span>{cat.name}</span>
                <span className="text-emerald-700">{cat.count} listings ({cat.pct}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${cat.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Happy Score Transparency Modal */}
      {showHappyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Happy Score Breakdown</h3>
                  <p className="text-xs text-gray-500">{orgName} • Transparent Scoring Model</p>
                </div>
              </div>
              <button
                onClick={() => setShowHappyModal(false)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-5 text-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-4xl font-extrabold text-emerald-700">{happyScore.score}</span>
              <span className="text-base text-gray-500 font-semibold"> / 100</span>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 mt-1">
                Tier: {happyScore.tier} ({happyScore.change >= 0 ? `+${happyScore.change}` : happyScore.change} pts in last 30d)
              </p>
              <p className="text-xs text-emerald-900/80 mt-2 font-medium">{happyScore.summary}</p>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Score Factors</h4>
              {happyScore.factors.map((f, i) => (
                <div key={i} className="flex justify-between items-start p-2.5 bg-gray-50 rounded-lg text-xs">
                  <div>
                    <span className="font-semibold text-gray-900">{f.category}</span>
                    <p className="text-gray-500 text-[11px] mt-0.5">{f.explanation}</p>
                  </div>
                  <span className="font-extrabold text-emerald-700 ml-3 whitespace-nowrap">
                    +{f.points} / {f.maxPoints}
                  </span>
                </div>
              ))}

              {happyScore.penalties.length > 0 && (
                <>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-red-500 mt-3">Deductions</h4>
                  {happyScore.penalties.map((p, i) => (
                    <div key={i} className="flex justify-between items-center p-2 bg-red-50 rounded-lg text-xs text-red-800">
                      <span>{p.reason}</span>
                      <span className="font-bold">-{p.deduction} pts</span>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowHappyModal(false)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

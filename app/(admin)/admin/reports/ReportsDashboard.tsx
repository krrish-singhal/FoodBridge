'use client'

import { useState, useId, useEffect, useCallback } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  Download, 
  ShieldCheck, 
  Building2, 
  Package, 
  HeartHandshake, 
  MapPin, 
  Users, 
  CheckCircle2, 
  Calendar, 
  Sparkles,
  RefreshCw 
} from 'lucide-react'
import { getLiveAnalyticsData } from './actions'
import { createClient } from '@/lib/supabase/client'

export interface AnalyticsData {
  totalMeals: number
  totalDonations: number
  availableDonations: number
  deliveredDonations: number
  totalPartners: number
  verifiedPartners: number
  underReviewPartners: number
  pendingPartners: number
  rejectedPartners: number
  verificationDistribution: Array<{
    label: string
    value: number
    percentage: number
    color: string
    badgeBg: string
    textColor: string
  }>
  sectorDistribution: Array<{
    label: string
    value: number
    percentage: number
    color: string
    badgeBg: string
    textColor: string
  }>
  monthlyTrends: Array<{
    month: string
    monthLabel: string
    donations: number
    meals: number
    delivered: number
  }>
  topCities: Array<{
    city: string
    count: number
    percentage: number
  }>
}

export function ReportsDashboard({ initialData }: { initialData: AnalyticsData }) {
  const [data, setData] = useState<AnalyticsData>(initialData)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [hoveredVerifSlice, setHoveredVerifSlice] = useState<number | null>(null)
  const [hoveredSectorSlice, setHoveredSectorSlice] = useState<number | null>(null)
  const [trendMetric, setTrendMetric] = useState<'meals' | 'donations'>('meals')
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null)
  const [timeFilter, setTimeFilter] = useState<'all' | '2026' | '2025'>('all')

  const filterId = useId()

  // Initialize mounted state for client-only locale formatting
  useEffect(() => {
    setIsMounted(true)
    setLastSyncTime(new Date())
  }, [])

  // Real-time synchronization handler
  const syncLiveData = useCallback(async () => {
    try {
      setIsSyncing(true)
      const fresh = await getLiveAnalyticsData()
      setData(fresh)
      setLastSyncTime(new Date())
    } catch (err) {
      console.error('Failed to sync live analytics:', err)
    } finally {
      setIsSyncing(false)
    }
  }, [])

  // Live Auto-Refresh & Realtime WebSocket listener
  useEffect(() => {
    // 1. Auto-polling interval every 6 seconds to ensure instant database reflection
    const interval = setInterval(() => {
      syncLiveData()
    }, 6000)

    // 2. Realtime WebSocket subscription for database changes
    try {
      const supabase = createClient()
      const channel = supabase
        .channel('admin-analytics-live-feed')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'donations' }, () => syncLiveData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'organizations' }, () => syncLiveData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pickups' }, () => syncLiveData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => syncLiveData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'organization_verification' }, () => syncLiveData())
        .subscribe()

      return () => {
        clearInterval(interval)
        supabase.removeChannel(channel)
      }
    } catch {
      return () => clearInterval(interval)
    }
  }, [syncLiveData])

  // Filter monthly trends if requested
  const filteredTrends = data.monthlyTrends.filter(t => {
    if (timeFilter === '2026') return t.month.startsWith('2026')
    if (timeFilter === '2025') return t.month.startsWith('2025')
    return true
  })

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = ['Category', 'Metric', 'Value', 'Details']
    const rows: string[][] = [
      ['KPI', 'Total Rescued Meals', String(data.totalMeals), 'Estimated meals redistributed'],
      ['KPI', 'Total Donations', String(data.totalDonations), 'Active & completed listings'],
      ['KPI', 'Available Food Listings', String(data.availableDonations), 'Currently listed for claim'],
      ['KPI', 'Delivered Rescues', String(data.deliveredDonations), 'Successfully transferred to NGOs'],
      ['KPI', 'Total Registered Partners', String(data.totalPartners), 'All organizations in platform'],
      ['KPI', 'Verified Active Partners', String(data.verifiedPartners), 'Approved & fully operational'],
      ['KPI', 'Pending Verifications', String(data.pendingPartners), 'Awaiting admin review'],
      ['KPI', 'Rejected Verifications', String(data.rejectedPartners), 'Did not meet compliance'],
    ]

    // Sector Distribution
    data.sectorDistribution.forEach(s => {
      rows.push(['Partner Sector', s.label, String(s.value), `${s.percentage.toFixed(1)}% of total partners`])
    })

    // Monthly Data
    data.monthlyTrends.forEach(m => {
      rows.push(['Monthly Trend', m.monthLabel, String(m.meals), `${m.donations} donations, ${m.delivered} delivered`])
    })

    // Top Cities
    data.topCities.forEach(c => {
      rows.push(['Regional Hub', c.city, String(c.count), `${c.percentage.toFixed(1)}% of partner base`])
    })

    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `foodbridge-analytics-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // --- Donut Chart Geometry Math ---
  const donutRadius = 68
  const donutCircumference = 2 * Math.PI * donutRadius

  // Compute Verification Slices
  let verifOffset = 0
  const verifSlices = data.verificationDistribution.map((item, idx) => {
    const strokeLength = (item.percentage / 100) * donutCircumference
    const currentOffset = -verifOffset
    verifOffset += strokeLength
    return {
      ...item,
      strokeLength,
      strokeOffset: currentOffset,
      isHovered: hoveredVerifSlice === idx,
    }
  })

  // Compute Sector Slices
  let sectorOffset = 0
  const sectorSlices = data.sectorDistribution.map((item, idx) => {
    const strokeLength = (item.percentage / 100) * donutCircumference
    const currentOffset = -sectorOffset
    sectorOffset += strokeLength
    return {
      ...item,
      strokeLength,
      strokeOffset: currentOffset,
      isHovered: hoveredSectorSlice === idx,
    }
  })

  // --- Area/Line Chart Geometry Math ---
  const chartWidth = 720
  const chartHeight = 240
  const chartPadding = { top: 30, right: 25, bottom: 40, left: 55 }

  const maxTrendVal = Math.max(
    ...filteredTrends.map(t => (trendMetric === 'meals' ? t.meals : t.donations)),
    100
  )

  const trendPoints = filteredTrends.map((t, idx) => {
    const totalPoints = filteredTrends.length
    const x = chartPadding.left + (idx / Math.max(totalPoints - 1, 1)) * (chartWidth - chartPadding.left - chartPadding.right)
    const val = trendMetric === 'meals' ? t.meals : t.donations
    const y = chartHeight - chartPadding.bottom - (val / maxTrendVal) * (chartHeight - chartPadding.top - chartPadding.bottom)
    return { x, y, val, item: t }
  })

  // Generate Smooth Bezier Spline
  function buildBezierPath(pts: Array<{ x: number; y: number }>) {
    if (pts.length === 0) return ''
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`
    let path = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1]
      const p1 = pts[i]
      const p2 = pts[i + 1]
      const p3 = pts[i + 2] || p2

      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
    }
    return path
  }

  const linePath = buildBezierPath(trendPoints)
  const areaPath = trendPoints.length > 0
    ? `${linePath} L ${trendPoints[trendPoints.length - 1].x} ${chartHeight - chartPadding.bottom} L ${trendPoints[0].x} ${chartHeight - chartPadding.bottom} Z`
    : ''

  const activeVerif = hoveredVerifSlice !== null ? data.verificationDistribution[hoveredVerifSlice] : null
  const activeSector = hoveredSectorSlice !== null ? data.sectorDistribution[hoveredSectorSlice] : null

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Reports & Analytics</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <Sparkles className="w-3 h-3 mr-1 text-emerald-600" />
              Live Impact
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Real-time visual intelligence on food redistribution, rescue efficiency, and partner growth.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Live Sync Indicator & Manual Sync Button */}
          <button
            onClick={() => syncLiveData()}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-800 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            title="Click to refresh live metrics immediately"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Live'}</span>
            <span suppressHydrationWarning className="hidden sm:inline text-emerald-600/70 font-normal">
              {isMounted && lastSyncTime ? (
                <>• {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</>
              ) : (
                <>• Live Stream</>
              )}
            </span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-50 hover:border-gray-400 font-semibold text-sm shadow-sm transition-all cursor-pointer hover:shadow"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {/* Row 1: KPI Impact Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Meals Rescued */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-teal-50/40 p-6 border border-emerald-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-emerald-700 uppercase">Total Meals Rescued</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-100/80 flex items-center justify-center text-emerald-700 shadow-inner">
              <HeartHandshake className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-gray-950">
              {data.totalMeals.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-100/60 px-2 py-0.5 rounded-full">
              Meals Saved
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
            <span className="text-emerald-600 font-semibold">100% fulfillment</span> on matched requests
          </p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-200/30 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Card 2: Food Donations Listed */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-50 via-white to-indigo-50/40 p-6 border border-sky-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-sky-700 uppercase">Donation Listings</span>
            <div className="w-10 h-10 rounded-xl bg-sky-100/80 flex items-center justify-center text-sky-700 shadow-inner">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-gray-950">
              {data.totalDonations.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-sky-600 bg-sky-100/60 px-2 py-0.5 rounded-full">
              Listings
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            <strong className="text-gray-700">{data.availableDonations}</strong> Available • <strong className="text-gray-700">{data.deliveredDonations}</strong> Delivered
          </p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-sky-200/30 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Card 3: Partner Network */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 via-white to-pink-50/40 p-6 border border-purple-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-purple-700 uppercase">Partner Network</span>
            <div className="w-10 h-10 rounded-xl bg-purple-100/80 flex items-center justify-center text-purple-700 shadow-inner">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-gray-950">
              {data.totalPartners.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-purple-600 bg-purple-100/60 px-2 py-0.5 rounded-full">
              Organizations
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            <strong className="text-purple-700">{data.verifiedPartners} verified</strong> active NGOs & Providers
          </p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-purple-200/30 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Card 4: Verification Rate */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-white to-orange-50/40 p-6 border border-amber-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-amber-700 uppercase">Verification Health</span>
            <div className="w-10 h-10 rounded-xl bg-amber-100/80 flex items-center justify-center text-amber-700 shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-gray-950">
              {((data.verifiedPartners / Math.max(data.totalPartners, 1)) * 100).toFixed(1)}%
            </span>
            <span className="text-xs font-medium text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-full">
              Approval Rate
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {data.pendingPartners} pending review • {data.underReviewPartners} in process
          </p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-amber-200/30 rounded-full blur-2xl pointer-events-none" />
        </div>
      </div>

      {/* Row 2: Colorful Advanced Pie & Donut Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie/Donut Chart 1: Partner Verification Status */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <PieChartIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Partner Verification Status</h3>
                  <p className="text-xs text-gray-500">Breakdown of network credibility and vetting pipeline</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                {data.totalPartners} Total
              </span>
            </div>

            {/* Donut SVG & Center Metrics */}
            <div className="py-6 flex flex-col sm:flex-row items-center justify-center gap-8">
              <div className="relative w-48 h-48 flex-shrink-0 flex items-center justify-center">
                <svg className="w-48 h-48 -rotate-90 transform" viewBox="0 0 160 160">
                  {/* Background Track */}
                  <circle
                    cx="80"
                    cy="80"
                    r={donutRadius}
                    fill="transparent"
                    stroke="#f1f5f9"
                    strokeWidth="18"
                  />
                  {/* Slices */}
                  {verifSlices.map((slice, idx) => (
                    <circle
                      key={slice.label}
                      cx="80"
                      cy="80"
                      r={donutRadius}
                      fill="transparent"
                      stroke={slice.color}
                      strokeWidth={slice.isHovered ? 24 : 18}
                      strokeDasharray={`${slice.strokeLength} ${donutCircumference}`}
                      strokeDashoffset={slice.strokeOffset}
                      className="transition-all duration-300 cursor-pointer"
                      onMouseEnter={() => setHoveredVerifSlice(idx)}
                      onMouseLeave={() => setHoveredVerifSlice(null)}
                      style={{
                        filter: slice.isHovered ? `drop-shadow(0px 0px 8px ${slice.color}90)` : 'none'
                      }}
                    />
                  ))}
                </svg>

                {/* Donut Center Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  {activeVerif ? (
                    <>
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                        {activeVerif.label}
                      </span>
                      <span className="text-2xl font-black text-gray-900">
                        {activeVerif.value}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full mt-0.5" style={{ backgroundColor: activeVerif.badgeBg, color: activeVerif.textColor }}>
                        {activeVerif.percentage.toFixed(1)}%
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Verified</span>
                      <span className="text-2xl font-black text-gray-900">{data.verifiedPartners}</span>
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-0.5">
                        {((data.verifiedPartners / data.totalPartners) * 100).toFixed(1)}% Active
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Legend with Progress Bars */}
              <div className="flex-1 w-full space-y-3">
                {data.verificationDistribution.map((item, idx) => (
                  <div
                    key={item.label}
                    onMouseEnter={() => setHoveredVerifSlice(idx)}
                    onMouseLeave={() => setHoveredVerifSlice(null)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      hoveredVerifSlice === idx 
                        ? 'border-gray-300 bg-gray-50/80 shadow-xs' 
                        : 'border-transparent hover:bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-semibold text-gray-800">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-gray-900 font-bold">{item.value}</span>
                        <span className="text-gray-400">({item.percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                    {/* Mini Progress Bar */}
                    <div className="mt-1.5 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Pie/Donut Chart 2: Partner Sector Breakdown */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Network by Organization Sector</h3>
                  <p className="text-xs text-gray-500">Distribution across NGOs, Restaurants, Caterers & Hotels</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                6 Sectors
              </span>
            </div>

            {/* Donut SVG & Center Metrics */}
            <div className="py-6 flex flex-col sm:flex-row items-center justify-center gap-8">
              <div className="relative w-48 h-48 flex-shrink-0 flex items-center justify-center">
                <svg className="w-48 h-48 -rotate-90 transform" viewBox="0 0 160 160">
                  {/* Background Track */}
                  <circle
                    cx="80"
                    cy="80"
                    r={donutRadius}
                    fill="transparent"
                    stroke="#f1f5f9"
                    strokeWidth="18"
                  />
                  {/* Slices */}
                  {sectorSlices.map((slice, idx) => (
                    <circle
                      key={slice.label}
                      cx="80"
                      cy="80"
                      r={donutRadius}
                      fill="transparent"
                      stroke={slice.color}
                      strokeWidth={slice.isHovered ? 24 : 18}
                      strokeDasharray={`${slice.strokeLength} ${donutCircumference}`}
                      strokeDashoffset={slice.strokeOffset}
                      className="transition-all duration-300 cursor-pointer"
                      onMouseEnter={() => setHoveredSectorSlice(idx)}
                      onMouseLeave={() => setHoveredSectorSlice(null)}
                      style={{
                        filter: slice.isHovered ? `drop-shadow(0px 0px 8px ${slice.color}90)` : 'none'
                      }}
                    />
                  ))}
                </svg>

                {/* Donut Center Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  {activeSector ? (
                    <>
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                        {activeSector.label}
                      </span>
                      <span className="text-2xl font-black text-gray-900">
                        {activeSector.value}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full mt-0.5" style={{ backgroundColor: activeSector.badgeBg, color: activeSector.textColor }}>
                        {activeSector.percentage.toFixed(1)}%
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Top Sector</span>
                      <span className="text-xl font-black text-purple-700">NGOs (180)</span>
                      <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full mt-0.5">
                        36.7% Majority
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Legend Grid */}
              <div className="flex-1 w-full grid grid-cols-2 gap-2.5">
                {data.sectorDistribution.map((item, idx) => (
                  <div
                    key={item.label}
                    onMouseEnter={() => setHoveredSectorSlice(idx)}
                    onMouseLeave={() => setHoveredSectorSlice(null)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                      hoveredSectorSlice === idx 
                        ? 'border-gray-300 bg-gray-50/80 shadow-xs' 
                        : 'border-gray-100 bg-white hover:bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-semibold text-gray-800 truncate">{item.label}</span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between text-[11px] font-mono">
                      <span className="font-bold text-gray-900">{item.value} orgs</span>
                      <span className="text-gray-400">{item.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Advance Styled Area Trend Graph & Donation Funnel Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Smooth Curved Area Chart */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-7 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Impact Timeline & Growth Trend</h3>
                  <p className="text-xs text-gray-500">Historical food rescue volumes and listings across months</p>
                </div>
              </div>

              {/* Metric Toggle Buttons */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setTrendMetric('meals')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    trendMetric === 'meals' 
                      ? 'bg-white text-emerald-700 shadow-xs' 
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Meals Rescued
                </button>
                <button
                  onClick={() => setTrendMetric('donations')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    trendMetric === 'donations' 
                      ? 'bg-white text-sky-700 shadow-xs' 
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Donation Count
                </button>
              </div>
            </div>

            {/* SVG Area Chart */}
            <div className="mt-6 relative w-full overflow-x-auto">
              <svg 
                className="w-full min-w-[500px] h-60 overflow-visible" 
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              >
                <defs>
                  <linearGradient id={`areaGrad-${filterId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={trendMetric === 'meals' ? '#10b981' : '#0284c7'} stopOpacity="0.4" />
                    <stop offset="100%" stopColor={trendMetric === 'meals' ? '#10b981' : '#0284c7'} stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines */}
                {[0.25, 0.5, 0.75, 1].map((pct, i) => {
                  const y = chartHeight - chartPadding.bottom - pct * (chartHeight - chartPadding.top - chartPadding.bottom)
                  const labelVal = Math.round(maxTrendVal * pct)
                  return (
                    <g key={i}>
                      <line
                        x1={chartPadding.left}
                        y1={y}
                        x2={chartWidth - chartPadding.right}
                        y2={y}
                        stroke="#f1f5f9"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={chartPadding.left - 10}
                        y={y + 4}
                        textAnchor="end"
                        className="text-[10px] font-mono fill-gray-400"
                      >
                        {labelVal.toLocaleString()}
                      </text>
                    </g>
                  )
                })}

                {/* Base Axis Line */}
                <line
                  x1={chartPadding.left}
                  y1={chartHeight - chartPadding.bottom}
                  x2={chartWidth - chartPadding.right}
                  y2={chartHeight - chartPadding.bottom}
                  stroke="#e2e8f0"
                  strokeWidth="1.5"
                />

                {/* Area Gradient Fill */}
                {areaPath && (
                  <path
                    d={areaPath}
                    fill={`url(#areaGrad-${filterId})`}
                    className="transition-all duration-500"
                  />
                )}

                {/* Line Path */}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke={trendMetric === 'meals' ? '#10b981' : '#0284c7'}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-500"
                  />
                )}

                {/* Data Points */}
                {trendPoints.map((pt, idx) => {
                  const isHovered = hoveredTrendIdx === idx
                  return (
                    <g key={idx}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 7 : 4}
                        fill="#ffffff"
                        stroke={trendMetric === 'meals' ? '#10b981' : '#0284c7'}
                        strokeWidth={isHovered ? 3.5 : 2.5}
                        className="transition-all duration-200 cursor-pointer"
                        onMouseEnter={() => setHoveredTrendIdx(idx)}
                        onMouseLeave={() => setHoveredTrendIdx(null)}
                      />
                      {/* X-axis Month Label */}
                      <text
                        x={pt.x}
                        y={chartHeight - 12}
                        textAnchor="middle"
                        className="text-[10px] font-medium fill-gray-500"
                      >
                        {pt.item.monthLabel}
                      </text>
                    </g>
                  )
                })}
              </svg>

              {/* Tooltip on Active Point */}
              {hoveredTrendIdx !== null && trendPoints[hoveredTrendIdx] && (
                <div
                  className="absolute bg-gray-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full border border-gray-800"
                  style={{
                    left: `${(trendPoints[hoveredTrendIdx].x / chartWidth) * 100}%`,
                    top: `${(trendPoints[hoveredTrendIdx].y / chartHeight) * 100 - 8}%`
                  }}
                >
                  <p className="font-semibold text-gray-300">{trendPoints[hoveredTrendIdx].item.monthLabel}</p>
                  <p className="text-emerald-400 font-bold text-sm">
                    {trendPoints[hoveredTrendIdx].item.meals.toLocaleString()} meals rescued
                  </p>
                  <p className="text-gray-400 text-[11px]">
                    {trendPoints[hoveredTrendIdx].item.donations} listings ({trendPoints[hoveredTrendIdx].item.delivered} completed)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right (1 col): Colorful Donation Funnel & Fulfillment Status */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Fulfillment Funnel</h3>
                <p className="text-xs text-gray-500">Live operational throughput</p>
              </div>
            </div>

            {/* Funnel Column Graph Bars */}
            <div className="mt-6 space-y-4">
              {/* Metric 1 */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Available Surplus Listings
                  </span>
                  <span className="font-mono font-bold text-gray-900">{data.availableDonations} (50%)</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full w-1/2" />
                </div>
              </div>

              {/* Metric 2 */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                    Delivered & Transferred
                  </span>
                  <span className="font-mono font-bold text-gray-900">{data.deliveredDonations} (50%)</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full w-1/2" />
                </div>
              </div>

              {/* Metric 3: Success Ratio */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/80 to-teal-50/80 border border-emerald-200/80 mt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">Fulfillment Efficiency</span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-700">100.0%</span>
                  <span className="text-xs text-emerald-800 font-medium">Claim-to-Delivery Rate</span>
                </div>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Every surplus batch claimed by partner NGOs completed verified handover without expiry losses.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Ranked Regional Rescue Hubs / Geographic Distribution */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-gray-200/80 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Top Regional Distribution Hubs</h3>
              <p className="text-xs text-gray-500">Leading cities across India ranked by verified partner capacity</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            50+ Cities Active
          </span>
        </div>

        {/* Horizontal Progress Bar Ranking Grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {data.topCities.map((item, idx) => {
            const colors = [
              'from-emerald-500 to-teal-400',
              'from-teal-500 to-cyan-400',
              'from-cyan-500 to-sky-400',
              'from-sky-500 to-blue-400',
              'from-blue-500 to-indigo-400',
              'from-indigo-500 to-purple-400',
              'from-purple-500 to-fuchsia-400',
              'from-fuchsia-500 to-pink-400',
              'from-pink-500 to-rose-400',
              'from-rose-500 to-amber-400',
            ]
            const barGradient = colors[idx % colors.length]
            const maxCityCount = data.topCities[0]?.count || 1

            return (
              <div key={item.city} className="space-y-1.5 p-2 rounded-xl hover:bg-gray-50/60 transition-colors">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 font-bold flex items-center justify-center text-[10px]">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-gray-900">{item.city}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-gray-900">{item.count}</span>
                    <span className="text-gray-400">organizations ({item.percentage.toFixed(1)}%)</span>
                  </div>
                </div>

                {/* Colorful Horizontal Gradient Bar */}
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${barGradient} rounded-full transition-all duration-700`}
                    style={{ width: `${(item.count / maxCityCount) * 100}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

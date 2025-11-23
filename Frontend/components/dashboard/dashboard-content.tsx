'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, IndianRupee, Wrench, Package, Calendar, Users } from 'lucide-react'
import { DashboardService } from '@/lib/services/dashboard-service'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { ReportsContent } from '@/components/reports/reports-content'
import { apiFetch } from '@/lib/api'
import { toast } from '@/hooks/use-toast'

export function DashboardContent() {
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sendingPush, setSendingPush] = useState(false)
  const pmCarouselRef = useRef<HTMLDivElement>(null)
  const [pmPaused, setPmPaused] = useState(false)
  const assetImages = ['/biesse.png', '/hotpress.png', '/vitap.png']

  const computePmProgress = (task: any) => {
    try {
      const due = new Date(task.dueDate).getTime()
      const now = Date.now()
      const period = 14 * 24 * 60 * 60 * 1000 // assume 14-day cycle for visualization
      const remaining = Math.max(0, due - now)
      const elapsed = Math.min(period, Math.max(0, period - remaining))
      const pct = Math.round((elapsed / period) * 100)
      return Math.min(100, Math.max(5, pct))
    } catch {
      return 25
    }
  }

  const scrollPm = (dir: number) => {
    const node = pmCarouselRef.current
    if (!node) return
    const cardWidth = 380 // px approximate per card including gap
    node.scrollBy({ left: dir * cardWidth, behavior: 'smooth' })
  }

  // Auto-advance carousel
  useEffect(() => {
    const node = pmCarouselRef.current
    if (!node) return
    // respect reduced motion
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }
    if (pmPaused) return

    const interval = setInterval(() => {
      if (!pmCarouselRef.current) return
      const el = pmCarouselRef.current
      const nearEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
      if (nearEnd) {
        el.scrollTo({ left: 0, behavior: 'auto' })
      } else {
        scrollPm(1)
      }
    }, 7000)

    return () => clearInterval(interval)
  }, [pmPaused, dashboardData?.preventiveMaintenance?.length])

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true)
      const data = await DashboardService.getDashboardData()
      setDashboardData(data)
      setIsLoading(false)
    }

    loadDashboardData()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const kpiCards = [
    {
      title: 'Active Work Orders',
      value: dashboardData?.activeWorkOrders || 0,
      change: '+12%',
      trend: 'up',
      icon: Wrench,
      color: 'text-blue-700',
      bg: 'bg-gradient-to-br from-blue-300 to-blue-400 border border-blue-400',
      ring: 'ring-1 ring-blue-400',
      iconBg: 'bg-blue-300'
    },
    {
      title: 'Total Assets',
      value: dashboardData?.totalAssets || 0,
      change: '+5%',
      trend: 'up',
      icon: Package,
      color: 'text-emerald-700',
      bg: 'bg-gradient-to-br from-emerald-300 to-green-400 border border-emerald-400',
      ring: 'ring-1 ring-emerald-400',
      iconBg: 'bg-emerald-300'
    },
    {
      title: 'Maintenance Due',
      value: dashboardData?.maintenanceDue || 0,
      change: '+3',
      trend: 'up',
      icon: Calendar,
      color: 'text-rose-700',
      bg: 'bg-gradient-to-br from-rose-300 to-rose-400 border border-rose-400',
      ring: 'ring-1 ring-rose-400',
      iconBg: 'bg-rose-300'
    },
    {
      title: 'Operators',
      value: dashboardData?.totalOperators || 0,
      change: '+1',
      trend: 'up',
      icon: Users,
      color: 'text-violet-700',
      bg: 'bg-gradient-to-br from-violet-300 to-purple-400 border border-violet-400',
      ring: 'ring-1 ring-violet-400',
      iconBg: 'bg-violet-300'
    }
  ]

  return (
    <>
    <div className="space-y-6">
      {/* Page Header */}
      <div className="rounded-xl p-5 bg-gradient-to-r from-indigo-100 via-sky-100 to-emerald-100 border border-slate-300">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-600 mt-1">
          Welcome back! Here's what's happening with your maintenance operations.
        </p>
        {/* Removed test push button */}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card, index) => (
          <Card key={index} className={`relative overflow-hidden card-hover ${card.bg} ${card.ring} shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.iconBg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-slate-900">{card.value}</div>
              <div className="flex items-center text-xs text-slate-600 mt-1">
                {card.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                )}
                <span className={card.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                  {card.change}
                </span>
                <span className="ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reports & Analytics section embedded below KPIs */}
      <div className="mt-6">
        <ReportsContent embedded />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Work Orders */}
        <Card className="bg-gradient-to-br from-violet-200 to-purple-300 border border-violet-400 ring-1 ring-violet-400 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="p-2 rounded-lg bg-blue-100">
                <Wrench className="h-5 w-5 text-blue-700" />
              </div>
              Recent Work Orders
            </CardTitle>
            <CardDescription>A summary of recently updated work orders.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56 overflow-hidden relative">
              <div className="space-y-4 absolute w-full scrolling-list moving">
                {dashboardData?.recentActivity?.map((activity: any, index: number) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gradient-to-r from-slate-200 to-sky-300 border border-sky-300 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-16 h-12 rounded-md overflow-hidden bg-slate-100">
                      <img src={assetImages[index % assetImages.length]} alt="asset" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{activity.title}</p>
                      <p className="text-xs text-slate-600">{activity.description}</p>
                      <p className="text-[11px] text-slate-500 mt-1">{formatDate(activity.timestamp)}</p>
                    </div>
                  </div>
                ))}
                {/* Duplicate the list to create a seamless loop */}
                {dashboardData?.recentActivity?.map((activity: any, index: number) => (
                  <div key={`duplicate-${index}`} className="flex items-start gap-3 p-3 bg-gradient-to-r from-slate-200 to-sky-300 border border-sky-300 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-16 h-12 rounded-md overflow-hidden bg-slate-100">
                      <img src={assetImages[index % assetImages.length]} alt="asset" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{activity.title}</p>
                      <p className="text-xs text-slate-600">{activity.description}</p>
                      <p className="text-[11px] text-slate-500 mt-1">{formatDate(activity.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preventive Maintenance */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="p-2 rounded-lg bg-violet-100">
                <Calendar className="h-5 w-5 text-violet-700" />
              </div>
              Preventive Maintenance
            </CardTitle>
            <CardDescription>Upcoming preventive maintenance tasks.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pb-2" ref={pmCarouselRef} onMouseEnter={() => setPmPaused(true)} onMouseLeave={() => setPmPaused(false)}>
                {dashboardData?.preventiveMaintenance?.map((task: any, index: number) => {
                  const pct = computePmProgress(task)
                  return (
                    <div key={index} className="min-w-[320px] md:min-w-[380px] lg:min-w-[420px] snap-start">
                      <div className="flex rounded-xl border border-violet-300 bg-gradient-to-br from-violet-100 to-purple-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                        <div className="w-1/2 h-32 md:h-36 lg:h-40 bg-slate-100">
                          <img src={assetImages[index % assetImages.length]} alt={task.asset} className="w-full h-full object-cover" />
                        </div>
                        <div className="w-1/2 p-4 flex flex-col justify-center">
                          <h3 className="text-sm font-semibold text-slate-900 truncate">{task.asset}</h3>
                          <p className="text-[11px] text-slate-500 mb-2">Due: {formatDate(task.dueDate)}</p>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-teal-400" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-[11px] text-slate-500">Progress</span>
                            <span className="text-[11px] text-slate-600 font-medium">{pct}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Controls */}
              <button aria-label="Previous" onClick={() => scrollPm(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur shadow hover:bg-white">
                <ArrowLeft className="h-4 w-4 text-slate-700" />
              </button>
              <button aria-label="Next" onClick={() => scrollPm(1)} className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur shadow hover:bg-white">
                <ArrowRight className="h-4 w-4 text-slate-700" />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts & Notifications */}
      <Card className="bg-gradient-to-br from-orange-200 to-amber-300 border border-orange-400">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Alerts & Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dashboardData?.alerts?.map((alert: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-br from-orange-200 to-amber-300 border border-orange-400 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className={`${alert.priority === 'high' ? 'bg-red-400' : alert.priority === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'} w-1 rounded-full self-stretch`} />
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{alert.title}</p>
                    <p className="text-xs text-slate-600">{alert.description}</p>
                  </div>
                </div>
                <Badge variant={alert.priority === 'high' ? 'destructive' : 'secondary'}>
                  {alert.priority}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
    <style jsx>{`
      .moving { animation: scroll-vert 22s linear infinite; }
      .moving:hover { animation-play-state: paused; }
      @keyframes scroll-vert { 0% { transform: translateY(0); } 100% { transform: translateY(-50%); } }
      @media (prefers-reduced-motion: reduce) { .moving { animation: none !important; } }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      .no-scrollbar::-webkit-scrollbar { display: none; }
    `}</style>
    </>
  )
}

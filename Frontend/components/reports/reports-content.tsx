'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BarChart3, TrendingUp, Download, Calendar, IndianRupee, Wrench, Package } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, LabelList } from 'recharts'
import { ReportsService } from '@/lib/services/reports-service'
import { formatCurrency } from '@/lib/utils'

export function ReportsContent({ embedded = false }: { embedded?: boolean }) {
  const [reportData, setReportData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('monthly')

  const getCategoryColor = (name: string) => {
    switch (name) {
      case 'Preventive':
        return 'bg-violet-600'
      case 'Corrective':
        return 'bg-emerald-600'
      case 'Emergency':
        return 'bg-rose-600'
      case 'Inspection':
        return 'bg-sky-600'
      default:
        return 'bg-blue-600'
    }
  }

  const formatINRShort = (value: number) => {
    if (value >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(1)}Cr`
    if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(1)}L`
    if (value >= 1000) return `₹${Math.round(value / 1000)}k`
    return `₹${value}`
  }

  useEffect(() => {
    const loadReportData = async () => {
      setIsLoading(true)
      const data = await ReportsService.getReportData(selectedPeriod)
      setReportData(data)
      setIsLoading(false)
    }

    loadReportData()
  }, [selectedPeriod])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-slate-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-slate-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-8 bg-slate-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-slate-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      {!embedded && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
            <p className="text-sm text-slate-600 mt-1">
              Analyze maintenance performance and costs
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <Button className="btn-hover">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden card-hover bg-gradient-to-br from-amber-200 to-orange-300 border border-orange-300 ring-1 ring-orange-300 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-slate-700">Total Maintenance Cost</CardTitle>
            <div className="p-2 rounded-lg bg-orange-100">
              <IndianRupee className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-slate-900">
              {formatCurrency(reportData?.totalMaintenanceCost || 0)}
            </div>
            <div className="flex items-center text-xs text-slate-600 mt-1">
              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              <span className="text-green-600">+5.2%</span>
              <span className="ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden card-hover bg-gradient-to-br from-blue-200 to-sky-300 border border-blue-300 ring-1 ring-blue-300 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-slate-700">Work Orders Completed</CardTitle>
            <div className="p-2 rounded-lg bg-blue-100">
              <Wrench className="h-5 w-5 text-blue-700" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-slate-900">
              {reportData?.completedWorkOrders || 0}
            </div>
            <div className="flex items-center text-xs text-slate-600 mt-1">
              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              <span className="text-green-600">+12%</span>
              <span className="ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>


        <Card className="relative overflow-hidden card-hover bg-gradient-to-br from-violet-200 to-purple-300 border border-violet-300 ring-1 ring-violet-300 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-slate-700">Preventive Tasks</CardTitle>
            <div className="p-2 rounded-lg bg-violet-100">
              <Calendar className="h-5 w-5 text-violet-700" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-slate-900">
              {reportData?.preventiveTasks || 0}
            </div>
            <div className="flex items-center text-xs text-slate-600 mt-1">
              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              <span className="text-green-600">+8%</span>
              <span className="ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Maintenance Cost Trend */}
        <Card className="bg-gradient-to-br from-amber-200 to-orange-300 border border-orange-300 ring-1 ring-orange-300 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5" />
              Maintenance Cost Trend
            </CardTitle>
            <CardDescription className="text-xs">Monthly maintenance expenses over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-white/70 rounded-lg p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData?.maintenanceCostTrend || []} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 12 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={{ stroke: '#cbd5e1' }} />
                  <YAxis tickFormatter={(v) => `₹${Math.round(v/1000)}k`} tick={{ fill: '#475569', fontSize: 12 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={{ stroke: '#cbd5e1' }} />
                  <Tooltip cursor={{ fill: 'rgba(148,163,184,0.15)' }} formatter={(value) => formatCurrency(Number(value))} contentStyle={{ borderRadius: 8 }} />
                  <Bar dataKey="cost" name="Cost" fill="#fb923c" radius={[6,6,0,0]}>
                    <LabelList dataKey="cost" position="top" formatter={(value: any) => formatINRShort(Number(value)) as any} fill="#334155" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Work Order Status */}
        <Card className="bg-gradient-to-br from-emerald-200 to-green-300 border border-emerald-300 ring-1 ring-emerald-300 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Work Order Status Distribution</CardTitle>
            <CardDescription className="text-xs">Current status of all work orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-white/60 rounded-lg p-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Completed', value: reportData?.workOrderStatus?.completed || 0, color: '#22c55e' },
                      { name: 'In Progress', value: reportData?.workOrderStatus?.inProgress || 0, color: '#3b82f6' },
                      { name: 'Pending', value: reportData?.workOrderStatus?.pending || 0, color: '#f59e0b' },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={80}
                    paddingAngle={4}
                    labelLine={false}
                    label={({ name, value }) => `${value}`}
                  >
                    {[
                      { name: 'Completed', color: '#22c55e' },
                      { name: 'In Progress', color: '#3b82f6' },
                      { name: 'Pending', color: '#f59e0b' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}`, 'Count']} contentStyle={{ borderRadius: 8 }} />
                  <Legend verticalAlign="bottom" height={24} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>


        {/* Maintenance Categories */}
        <Card className="bg-gradient-to-br from-violet-200 to-purple-300 border border-violet-300 ring-1 ring-violet-300 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Maintenance by Category</CardTitle>
            <CardDescription className="text-xs">Breakdown of maintenance activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData?.maintenanceCategories?.map((category: any, index: number) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{category.name}</span>
                    <span className="font-medium">{category.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getCategoryColor(category.name)}`}
                      style={{ width: `${category.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

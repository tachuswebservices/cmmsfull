'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Calendar, Clock, AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react'
import { MaintenanceService } from '@/lib/services/maintenance-service'
import { formatDate, formatDateOnly } from '@/lib/utils'

export function MaintenanceContent() {
  const [maintenanceTasks, setMaintenanceTasks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const loadMaintenanceTasks = async () => {
      setIsLoading(true)
      const data = await MaintenanceService.getMaintenanceTasks()
      setMaintenanceTasks(data)
      setIsLoading(false)
    }

    loadMaintenanceTasks()
  }, [])

  const filteredTasks = maintenanceTasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.asset.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getTaskStatus = (nextDue: Date) => {
    const now = new Date()
    const due = new Date(nextDue)
    const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysUntilDue < 0) {
      return { status: 'overdue', color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: AlertTriangle }
    } else if (daysUntilDue <= 7) {
      return { status: 'due-soon', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', icon: Clock }
    } else {
      return { status: 'scheduled', color: 'text-green-600', bg: 'bg-green-50 border-green-200', icon: CheckCircle }
    }
  }

  const getFrequencyBadge = (frequency: string) => {
    const variants: Record<string, any> = {
      'daily': 'default',
      'weekly': 'secondary',
      'monthly': 'outline',
      'quarterly': 'outline',
      'annually': 'outline'
    }
    return variants[frequency] || 'outline'
  }

  const overdueTasks = maintenanceTasks.filter(task => {
    const now = new Date()
    const due = new Date(task.nextDue)
    return due < now
  })

  const dueSoonTasks = maintenanceTasks.filter(task => {
    const now = new Date()
    const due = new Date(task.nextDue)
    const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilDue >= 0 && daysUntilDue <= 7
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-slate-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-slate-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[...Array(3)].map((_, i) => (
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
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-200 rounded w-full"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold ">Preventive Maintenance</h1>
          <p className="text-sm text-slate-600 mt-1">
            Schedule and track recurring maintenance tasks
          </p>
        </div>
        <Button className="btn-hover">
          <Plus className="h-4 w-4 mr-2" />
          Schedule Task
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-600">
              Total Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-slate-900">{maintenanceTasks.length}</div>
            <p className="text-xs text-slate-600 mt-1">Scheduled maintenance tasks</p>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-600">
              Due Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-orange-600">{dueSoonTasks.length}</div>
            <p className="text-xs text-slate-600 mt-1">Tasks due within 7 days</p>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-600">
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-600">{overdueTasks.length}</div>
            <p className="text-xs text-slate-600 mt-1">Tasks past due date</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search maintenance tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Tasks */}
      <div className="grid gap-4">
        {filteredTasks.map((task) => {
          const taskStatus = getTaskStatus(task.nextDue)
          const StatusIcon = taskStatus.icon
          
          return (
            <Card key={task.id} className="card-hover cursor-pointer">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <RotateCcw className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 mb-1 text-base">
                          {task.title}
                        </h3>
                        <p className="text-xs text-slate-600 mb-2">
                          {task.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                          <span>Asset: {task.asset}</span>
                          <span>Assigned: {task.assignedTo}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col lg:items-end gap-3">
                    {/* Task Status */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${taskStatus.bg}`}>
                      <StatusIcon className={`h-4 w-4 ${taskStatus.color}`} />
                      <div>
                        <p className={`text-xs font-medium ${taskStatus.color}`}>
                          {taskStatus.status === 'overdue' ? 'Overdue' : 
                           taskStatus.status === 'due-soon' ? 'Due Soon' : 'Scheduled'}
                        </p>
                        <p className="text-[11px] text-slate-600">
                          Next: {formatDateOnly(task.nextDue)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Badge variant={getFrequencyBadge(task.frequency)}>
                        {task.frequency}
                      </Badge>
                      <Badge variant="outline">
                        {task.category}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-slate-500">
                      Last done: {formatDateOnly(task.lastCompleted)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredTasks.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <RotateCcw className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-base font-medium text-slate-900 mb-2">
              No maintenance tasks found
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms to see more results.'
                : 'Get started by scheduling your first maintenance task.'}
            </p>
            <Button className="btn-hover">
              <Plus className="h-4 w-4 mr-2" />
              Schedule Task
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

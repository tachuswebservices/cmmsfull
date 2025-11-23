'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WorkOrderForm } from './work-order-form'
import { WorkOrderDetails } from './work-order-details'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search, Filter, Calendar, User, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react'
import { WorkOrderService } from '@/lib/services/work-order-service'
import { formatDate, formatDateOnly } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useHasAny } from '@/hooks/use-permissions'

export function WorkOrdersContent() {
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [isDetailsVisible, setIsDetailsVisible] = useState(false)
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const { toast } = useToast()
  const canCreateOrRequest = useHasAny(['workOrders.create','workOrders.request'])

  const loadWorkOrders = async () => {
    setIsLoading(true)
    try {
      const data = await WorkOrderService.getWorkOrders()
      setWorkOrders(data)
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Failed to load work orders'
      toast({ title: 'Error', description: msg, variant: 'destructive' as any })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadWorkOrders()
  }, [])

  const handleSaveWorkOrder = (workOrder: any) => {
    if (selectedWorkOrder) {
      // Update existing work order
      setWorkOrders(prev => prev.map(wo => wo.id === workOrder.id ? workOrder : wo))
    } else {
      // Add new work order
      setWorkOrders(prev => [workOrder, ...prev])
    }
    setIsFormVisible(false)
    setSelectedWorkOrder(null)
  }

  const handleCardClick = (order: any) => {
    setSelectedWorkOrder(order)
    setIsDetailsVisible(true)
  }

  const handleEditClick = () => {
    setIsDetailsVisible(false)
    setIsFormVisible(true)
  }

  const filteredWorkOrders = workOrders.filter(order => {
    const matchesSearch = order.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || order.priority === priorityFilter
    
    return matchesSearch && matchesStatus && matchesPriority
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'in-progress':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-orange-600" />
      default:
        return <Clock className="h-4 w-4 text-slate-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'completed': 'default',
      'in-progress': 'secondary',
      'pending': 'destructive'
    }
    return variants[status] || 'outline'
  }

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, any> = {
      'high': 'destructive',
      'medium': 'secondary',
      'low': 'outline'
    }
    return variants[priority] || 'outline'
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-slate-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-slate-200 rounded w-32 animate-pulse"></div>
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
          <h1 className="text-2xl font-bold ">Work Orders</h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage and track maintenance work orders
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadWorkOrders} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canCreateOrRequest && (
            <Dialog open={isFormVisible} onOpenChange={setIsFormVisible}>
              <DialogTrigger asChild>
                <Button className="btn-hover" onClick={() => setSelectedWorkOrder(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Work Order
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[800px]">
                <WorkOrderForm
                  onSave={handleSaveWorkOrder}
                  onCancel={() => setIsFormVisible(false)}
                  workOrder={selectedWorkOrder}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={isDetailsVisible} onOpenChange={setIsDetailsVisible}>
        <DialogContent className="sm:max-w-[800px]">
          <WorkOrderDetails
            workOrder={selectedWorkOrder}
            onEdit={handleEditClick}
            onClose={() => setIsDetailsVisible(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search work orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Work Orders List */}
      <div className="grid gap-4">
        {filteredWorkOrders.map((order) => (
          <Card key={order.id} className="card-hover cursor-pointer" onClick={() => handleCardClick(order)}>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div className="bg-purple-100 p-3 rounded-lg">
                      {getStatusIcon(order.status)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 mb-1 text-base">
                        {order.title}
                      </h3>
                      <p className="text-slate-600 text-xs mb-2">
                        {order.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {order.assignedTo || 'Unassigned'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Due: {order.dueDate ? formatDateOnly(order.dueDate) : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col lg:items-end gap-2">
                  <div className="flex gap-2">
                    <Badge variant={getStatusBadge(order.status)}>
                      {order.status.replace('-', ' ')}
                    </Badge>
                    <Badge variant={getPriorityBadge(order.priority)}>
                      {order.priority} priority
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    Created: {order.createdAt ? formatDate(order.createdAt) : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredWorkOrders.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-base font-medium text-slate-900 mb-2">
              No work orders found
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : (canCreateOrRequest ? 'Get started by creating your first work order.' : 'No work orders to show.')}
            </p>
            {canCreateOrRequest && (
              <Button className="btn-hover" onClick={() => { setSelectedWorkOrder(null); setIsFormVisible(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Create Work Order
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

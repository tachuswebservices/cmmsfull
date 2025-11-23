'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Boxes, AlertTriangle, TrendingDown, IndianRupee, Building } from 'lucide-react'
import { InventoryService } from '@/lib/services/inventory-service'
import { formatCurrency } from '@/lib/utils'
import { AddInventoryItemForm } from './add-inventory-item-form'
import { InventoryItemDetails } from './inventory-item-details'
import { useToast } from '@/hooks/use-toast'
import { useHasAny } from '@/hooks/use-permissions'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function InventoryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [inventory, setInventory] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const canManageInventory = useHasAny(['inventory.manage'])

  const refreshInventory = async () => {
    setIsLoading(true)
    try {
      const items = await InventoryService.getInventory()
      setInventory(items)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveItem = (_itemData: any) => {
    // Always reload from backend so UI reflects server state only
    setIsAddModalOpen(false)
    setIsEditMode(false)
    setSelectedItem(null)
    refreshInventory()
  }

  const handleViewItemDetails = (item: any) => {
    // Navigate to full-page details like Assets
    router.push(`/inventory/${item.id}`)
  }

  const handleEditItem = () => {
    setIsEditMode(true);
    setIsDetailsModalOpen(false);
    setIsAddModalOpen(true);
  }

  const openAddNewModal = () => {
    setIsEditMode(false);
    setSelectedItem(null);
    setIsAddModalOpen(true);
  }

  useEffect(() => {
    refreshInventory()
  }, [])

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.supplier.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStockStatus = (quantity: number, reorderPoint: number) => {
    if (quantity === 0) {
      return { status: 'out-of-stock', color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: AlertTriangle }
    } else if (quantity <= reorderPoint) {
      return { status: 'low-stock', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', icon: TrendingDown }
    } else {
      return { status: 'in-stock', color: 'text-green-600', bg: 'bg-green-50 border-green-200', icon: Boxes }
    }
  }

  const lowStockItems = inventory.filter(item => item.quantity <= item.reorderPoint)
  const outOfStockItems = inventory.filter(item => item.quantity === 0)

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
          {[...Array(6)].map((_, i) => (
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
          <h1 className="text-2xl font-bold ">Inventory Management</h1>
          <p className="text-sm text-slate-600 mt-1">
            Track inventory items, supplies, and maintenance materials
          </p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          {canManageInventory && (
            <DialogTrigger asChild>
              <Button className="btn-hover" onClick={openAddNewModal}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
          )}
          <DialogContent className="w-[95vw] sm:max-w-3xl p-0 max-h-[90vh] overflow-y-auto">
            <AddInventoryItemForm 
              itemToEdit={isEditMode ? selectedItem : null}
              onSave={handleSaveItem} 
              onCancel={() => {
                setIsAddModalOpen(false);
                setIsEditMode(false);
                setSelectedItem(null);
              }} 
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-600">
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-slate-900">{inventory.length}</div>
            <p className="text-xs text-slate-600 mt-1">Active inventory items</p>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-600">
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-orange-600">{lowStockItems.length}</div>
            <p className="text-xs text-slate-600 mt-1">Items need reordering</p>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-600">
              Out of Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-600">{outOfStockItems.length}</div>
            <p className="text-xs text-slate-600 mt-1">Items out of stock</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search inventory by name, part number, or supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Inventory List */}
      <div className="grid gap-4">
        {filteredInventory.map((item) => {
          const stockStatus = getStockStatus(item.quantity, item.reorderPoint)
          const StockIcon = stockStatus.icon
          
          return (
            <Card key={item.id} className="card-hover cursor-pointer" onClick={() => handleViewItemDetails(item)}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Boxes className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 mb-1 text-base">
                          {item.name}
                        </h3>
                        <p className="text-xs text-slate-600 mb-2">
                          Part #: {item.partNumber}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Building className="h-4 w-4" />
                            {item.supplier}
                          </div>
                          <div className="flex items-center gap-1">
                            <IndianRupee className="h-4 w-4" />
                            {formatCurrency(item.unitCost)} per unit
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col lg:items-end gap-3">
                    {/* Stock Status */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${stockStatus.bg}`}>
                      <StockIcon className={`h-4 w-4 ${stockStatus.color}`} />
                      <div>
                        <p className={`text-xs font-medium ${stockStatus.color}`}>
                          {item.quantity} units
                        </p>
                        <p className="text-[11px] text-slate-600">
                          Reorder at: {item.reorderPoint}
                        </p>
                      </div>
                    </div>
                    
                    {/* Category Badge */}
                    <Badge variant="outline">
                      {item.category}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredInventory.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Boxes className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-base font-medium text-slate-900 mb-2">
              No inventory items found
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms to see more results.'
                : 'Get started by adding your first inventory item.'}
            </p>
            {canManageInventory && (
              <Button className="btn-hover" onClick={openAddNewModal}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-2xl p-0">
          <InventoryItemDetails 
            item={selectedItem} 
            onEdit={handleEditItem}
            onCancel={() => setIsDetailsModalOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

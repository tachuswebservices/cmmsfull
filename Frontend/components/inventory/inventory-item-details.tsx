'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { Boxes, Building, IndianRupee, Pencil, X, Tag, Image as ImageIcon } from 'lucide-react'
import { API_BASE } from '@/lib/api'
import { useHasAny } from '@/hooks/use-permissions'

interface InventoryItemDetailsProps {
  item: any;
  onEdit: () => void;
  onCancel: () => void;
}

export function InventoryItemDetails({ item, onEdit, onCancel }: InventoryItemDetailsProps) {
  if (!item) return null
  const canManageInventory = useHasAny(['inventory.manage'])

  const resolveImageUrl = (src?: string | null) => {
    if (!src) return null
    if (src.startsWith('http://') || src.startsWith('https://')) return src
    return `${API_BASE}${src}`
  }
  const imageUrl = resolveImageUrl(item.image)

  return (
    <div className="flex flex-col h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Boxes className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl text-slate-900">{item.name}</CardTitle>
              <CardDescription>Part #: {item.partNumber}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-6 pt-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
        {imageUrl ? (
          <div className="w-full h-48 bg-slate-100 rounded-lg flex items-center justify-center">
            <img src={imageUrl} alt={item.name} className="w-full h-full object-contain rounded-lg" />
          </div>
        ) : (
          <div className="w-full h-48 bg-slate-100 rounded-lg flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-slate-400" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Stock Status</p>
            <p className="font-medium">{item.quantity > 0 ? `${item.quantity} units in stock` : 'Out of Stock'}</p>
          </div>
          <div>
            <p className="text-slate-500">Reorder Point</p>
            <p className="font-medium">{item.reorderPoint} units</p>
          </div>
          <div>
            <p className="text-slate-500">Unit Cost</p>
            <p className="font-medium">{formatCurrency(item.unitCost)}</p>
          </div>
          <div>
            <p className="text-slate-500">Category</p>
            <p className="font-medium">{item.category}</p>
          </div>
          <div>
            <p className="text-slate-500">Supplier</p>
            <p className="font-medium">{item.supplier}</p>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Location</p>
            <p className="font-medium">{item.location || '-'}</p>
          </div>
          <div>
            <p className="text-slate-500">Supplier details</p>
            <p className="font-medium whitespace-pre-line">{item.supplier || '-'}</p>
          </div>
        </div>
      </CardContent>
      <div className="flex justify-end gap-2 p-4 bg-slate-50 border-t">
        {canManageInventory && (
          <Button onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>
    </div>
  )
}

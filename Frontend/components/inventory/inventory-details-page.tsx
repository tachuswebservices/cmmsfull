'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { InventoryService } from '@/lib/services/inventory-service'
import { formatCurrency } from '@/lib/utils'
import { Boxes, Building, IndianRupee, Info, MapPin, Pencil, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export function InventoryDetailsPage({ id }: { id: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [item, setItem] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const reload = async () => {
    setIsLoading(true)
    try {
      const it = await InventoryService.getInventoryById(id)
      setItem(it)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 rounded w-48 animate-pulse"></div>
        <Card className="animate-pulse">
          <CardContent className="p-6 h-64" />
        </Card>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="space-y-4">
        <p className="text-slate-600">Item not found.</p>
        <Button onClick={() => router.push('/inventory')}>Back to Inventory</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{item.name}</h1>
          <p className="text-sm text-slate-600">Part #: {item.partNumber || '-'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{item.category || 'Uncategorized'}</Badge>
          <Button variant="outline" onClick={() => router.push('/inventory')}>Back</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Image */}
            <div className="w-full h-56 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
              {item.image ? (
                // item.image is absolute from service
                <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
              ) : (
                <Boxes className="h-12 w-12 text-slate-400" />
              )}
            </div>

            <Separator />

            {/* Basic Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-slate-600" />
                <h3 className="text-lg font-semibold">Item Information</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-semibold">Supplier:</span> {item.supplier || '-'}</div>
                <div><span className="font-semibold">Category:</span> {item.category || '-'}</div>
                <div><span className="font-semibold">Location:</span> {item.location || '-'}</div>
                <div><span className="font-semibold">Unit Cost:</span> {formatCurrency(item.unitCost)}</div>
              </div>
            </div>

            <Separator />

            {/* Stock */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-slate-600" />
                <h3 className="text-lg font-semibold">Stock</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-semibold">Quantity:</span> {item.quantity}</div>
                <div><span className="font-semibold">Reorder Point:</span> {item.reorderPoint}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button onClick={() => router.push('/inventory') /* placeholder, could open edit form later */}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit Item
        </Button>
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isDeleting}>
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this item?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the inventory item
                {item?.name ? ` "${item.name}"` : ''}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeleting}
                onClick={async () => {
                  if (!item) return
                  try {
                    setIsDeleting(true)
                    await InventoryService.deleteInventoryItem(item.id)
                    toast({ title: 'Item deleted', description: 'The inventory item was removed.' })
                    setConfirmOpen(false)
                    const nameParam = item.name ? `&name=${encodeURIComponent(item.name)}` : ''
                    router.push(`/inventory?deleted=1${nameParam}`)
                  } catch (err: any) {
                    const msg = typeof err?.message === 'string' ? err.message : 'Failed to delete item.'
                    toast({ title: 'Delete failed', description: msg })
                  } finally {
                    setIsDeleting(false)
                  }
                }}
              >
                Confirm Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

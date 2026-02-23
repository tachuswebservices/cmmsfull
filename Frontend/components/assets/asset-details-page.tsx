'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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
import { AssetService } from '@/lib/services/asset-service'
import { formatDateOnly } from '@/lib/utils'
import { Info, MapPin, Wrench, Calendar, Pencil, FileText } from 'lucide-react'
import { AddAssetForm } from '@/components/assets/add-asset-form'
import { PreventiveService } from '@/lib/services/preventive-service'
import { API_BASE } from '@/lib/api'
import { useCan } from '@/hooks/use-permissions'

export function AssetDetailsPage({ assetId }: { assetId: string }) {
  const router = useRouter()
  const [asset, setAsset] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [attachments, setAttachments] = useState<{ photos: any[]; documents: any[] }>({ photos: [], documents: [] })
  const [pmTasks, setPmTasks] = useState<any[]>([])
  const canEditAssets = useCan('assets.edit')

  const reload = async () => {
    setIsLoading(true)
    const a = await AssetService.getAssetById(assetId)
    setAsset(a)
    try {
      const files = await AssetService.getAttachments(assetId)
      setAttachments(files)
    } catch {
      setAttachments({ photos: [], documents: [] })
    }
    try {
      const tasks = await PreventiveService.list({ assetId })
      setPmTasks(tasks)
    } catch {
      setPmTasks([])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId])

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

  if (!asset) {
    return (
      <div className="space-y-4">
        <p className="text-slate-600">Asset not found.</p>
        <Button onClick={() => router.push('/assets')}>Back to Assets</Button>
      </div>
    )
  }

  const statusVariant = asset.status === 'operational' ? 'default' : asset.status === 'decommissioned' ? 'destructive' : 'secondary'
  const statusLabel = asset.status === 'under-maintenance' ? 'under maintenance' : asset.status

  const handleConfirmDelete = async () => {
    await AssetService.deleteAsset(asset.id)
    router.push('/assets')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{asset.name}</h1>
          <p className="text-sm text-slate-600">ID: {asset.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant as any}>{statusLabel}</Badge>
          <Button variant="outline" onClick={() => router.push('/assets')}>Back</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Asset Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-slate-600" />
                <h3 className="text-lg font-semibold">Asset Information</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="font-semibold">Category:</span> {asset.category}</div>
                <div className="col-span-2"><span className="font-semibold">Description:</span> {asset.description || '-'}</div>
                <div><span className="font-semibold">Purchase Date:</span> {formatDateOnly(asset.purchaseDate)}</div>
              </div>
            </div>

            <Separator />

            {/* Location Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-slate-600" />
                <h3 className="text-lg font-semibold">Location Details</h3>
              </div>
              <div className="grid grid-cols-1">
                <div><span className="font-semibold">Location:</span> {asset.location}</div>
              </div>
            </div>

            <Separator />

            {/* Technical Specifications */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-slate-600" />
                <h3 className="text-lg font-semibold">Technical Specifications</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="font-semibold">Manufacturer:</span> {asset.manufacturer}</div>
                <div><span className="font-semibold">Model:</span> {asset.model}</div>
                <div><span className="font-semibold">Serial Number:</span> {asset.serialNumber}</div>
                <div><span className="font-semibold">Installation Date:</span> {formatDateOnly(asset.installationDate)}</div>
              </div>
            </div>

            <Separator />

            {/* Maintenance */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-slate-600" />
                <h3 className="text-lg font-semibold">Maintenance</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="font-semibold">Last Maintenance:</span> {formatDateOnly(asset.lastMaintenance)}</div>
              </div>
            </div>

            <Separator />

            {/* Preventive Maintenance Tasks */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-slate-600" />
                <h3 className="text-lg font-semibold">Preventive Maintenance</h3>
              </div>
              {pmTasks.length === 0 ? (
                <p className="text-sm text-slate-600">No preventive maintenance tasks.</p>
              ) : (
                <div className="space-y-3">
                  {pmTasks.map((t: any) => {
                    const next = t.nextDue ? new Date(t.nextDue) : null
                    const last = t.lastCompleted ? new Date(t.lastCompleted) : null
                    const upcoming = next ? next.getTime() > Date.now() : false
                    return (
                      <div key={t.id} className="border rounded-md p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="font-medium">{t.title}</div>
                            {t.description ? (
                              <div className="text-sm text-slate-700">{t.description}</div>
                            ) : null}
                            <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                              <span>Frequency: {String(t.frequency || '').toLowerCase()}</span>
                              {t.category ? <span>Category: {t.category}</span> : null}
                              {t.assignedToName ? (
                                <span>Assigned: {t.assignedToName}</span>
                              ) : null}
                            </div>
                            <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                              <span>Last Done: {last ? last.toLocaleDateString() : '-'}</span>
                              <span>Next Due: {next ? next.toLocaleDateString() : '-'}</span>
                            </div>
                          </div>
                          <div className={`text-xs font-semibold ${upcoming ? 'text-green-600' : 'text-red-600'}`}>
                            {upcoming ? 'Upcoming' : 'Overdue'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <Separator />

            {/* Attachments */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-600" />
                <h3 className="text-lg font-semibold">Attachments</h3>
              </div>
              {attachments.photos.length === 0 && attachments.documents.length === 0 ? (
                <p className="text-sm text-slate-600">No attachments.</p>
              ) : (
                <div className="space-y-4">
                  {attachments.photos.length > 0 && (
                    <div>
                      <p className="font-semibold mb-2">Photos</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {attachments.photos.map((p, i) => (
                          <div key={`photo-${i}`} className="border rounded-md overflow-hidden">
                            <img src={`${API_BASE}${p.path}`} alt={p.filename || `photo-${i}`} className="h-32 w-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {attachments.documents.length > 0 && (
                    <div>
                      <p className="font-semibold mb-2">Documents</p>
                      <ul className="space-y-2">
                        {attachments.documents.map((d, i) => (
                          <li key={`doc-${i}`} className="text-sm">
                            <a className="text-blue-600 hover:underline" href={`${API_BASE}${d.path}`} target="_blank" rel="noreferrer">
                              {d.filename || `document-${i}`}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </CardContent>
      </Card>

      {canEditAssets && (
        <>
          <AlertDialog>
            <div className="flex justify-end gap-2">
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  Delete Asset
                </Button>
              </AlertDialogTrigger>
              <Button onClick={() => setIsEditOpen(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Asset
              </Button>
            </div>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete asset?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the asset and its related preventive maintenance tasks.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleConfirmDelete}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AddAssetForm
            onAssetAdded={reload}
            assetToEdit={asset}
            open={isEditOpen}
            onOpenChange={setIsEditOpen}
          >
            <></>
          </AddAssetForm>
        </>
      )}
    </div>
  )
}


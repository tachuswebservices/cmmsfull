'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Package, MapPin, Calendar, QrCode, Eye, Shuffle, AlertTriangle, X, Trash2 } from 'lucide-react'
import { AssetService } from '@/lib/services/asset-service'
import { PreventiveService } from '@/lib/services/preventive-service'
import { BreakdownService } from '@/lib/services/breakdown-service'
import { API_BASE } from '@/lib/api'
import { formatDateOnly } from '@/lib/utils'
import { AddAssetForm } from './add-asset-form'
import { QRCodeCanvas } from 'qrcode.react'
import { toast } from '@/components/ui/use-toast'
 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useCan } from '@/hooks/use-permissions'

export function AssetsContent() {
  const router = useRouter()
  const [assets, setAssets] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [tasks, setTasks] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false)
  const [assetToEdit, setAssetToEdit] = useState<any>(null)
  const qrCodeRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  const canCreateAsset = useCan('assets.create')
  const canEditAssets = useCan('assets.edit')
  // Keep all breakdowns in a stable state for counts
  const [allBreakdowns, setAllBreakdowns] = useState<any[]>([])

  // Breakdown modal state
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false)
  const [breakdownAsset, setBreakdownAsset] = useState<any | null>(null)
  const [breakdownItems, setBreakdownItems] = useState<any[]>([])
  const [isLoadingBreakdown, setIsLoadingBreakdown] = useState(false)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const downloadQRCode = (assetId: string) => {
    const canvas = qrCodeRefs.current[assetId]?.querySelector('canvas');
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream");
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `${assetId}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  }

  const handleDeleteBreakdown = async (id: string) => {
    if (!id) return
    setIsDeletingId(id)
    try {
      await BreakdownService.delete(id)
      // Remove from modal list
      setBreakdownItems((prev) => prev.filter((r: any) => r.id !== id))
      // Remove from global list to update counts
      setAllBreakdowns((prev) => prev.filter((r: any) => r.id !== id))
      toast({
        title: 'Breakdown deleted',
        description: 'The breakdown report and its media were removed.',
      })
      // Close confirm dialog after successful delete
      setConfirmDeleteId(null)
    } catch (e) {
      console.error(e)
      toast({
        title: 'Failed to delete breakdown',
        description: 'Please try again or contact support if the issue persists.',
        variant: 'destructive',
      })
    } finally {
      setIsDeletingId(null)
    }
  }
  const confirmDelete = () => {
    if (confirmDeleteId) {
      void handleDeleteBreakdown(confirmDeleteId)
    }
  }
  

  const handleView = (asset: any) => {
    router.push(`/assets/${asset.id}`)
  };

  const handleEdit = (asset: any) => {
    setAssetToEdit(asset);
    setIsAddAssetOpen(true);
  };

  const handleStatusChange = async (asset: any, status: 'operational' | 'under-maintenance' | 'decommissioned') => {
    await AssetService.updateAssetStatus(asset.id, status)
    setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, status } : a))
  }

  const loadData = async () => {
    setIsLoading(true)
    try {
      const data = await AssetService.getAssets()
      let t: any[] = []
      let b: any[] = []
      try {
        // Try to load all tasks in one call (if backend supports it)
        t = await PreventiveService.list()
      } catch {
        t = []
      }
      try {
        // Try to load all breakdowns in one call (if backend supports it)
        b = await BreakdownService.list()
      } catch {
        b = []
      }
      // Fallback: some backends require assetId; fetch per-asset and merge
      if (!Array.isArray(t) || t.length === 0) {
        const perAsset = await Promise.all(
          data.map(async (a: any) => {
            try {
              return await PreventiveService.list({ assetId: a.id })
            } catch {
              return []
            }
          })
        )
        t = perAsset.flat()
      }
      if (!Array.isArray(b) || b.length === 0) {
        const perAssetB = await Promise.all(
          data.map(async (a: any) => {
            try {
              return await BreakdownService.list({ assetId: a.id })
            } catch {
              return []
            }
          })
        )
        b = perAssetB.flat()
      }
      setAssets(data)
      setTasks(t)
      setAllBreakdowns(b)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredAssets = assets.filter(asset =>
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.location.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const openBreakdownModal = async (asset: any) => {
    setBreakdownAsset(asset)
    setIsBreakdownOpen(true)
    setIsLoadingBreakdown(true)
    try {
      // Use already loaded items; if none found, fetch on demand
      let items = allBreakdowns.filter((r: any) => r.assetId === asset.id)
      if (items.length === 0) {
        items = await BreakdownService.list({ assetId: asset.id })
      }
      setBreakdownItems(items)
    } finally {
      setIsLoadingBreakdown(false)
    }
  }


  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-slate-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-slate-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <h1 className="text-2xl font-bold ">Asset Management</h1>
          <p className="text-sm text-slate-600 mt-1">
            Track and manage your industrial assets and equipment
          </p>
        </div>
        {canCreateAsset && (
          <Button className="btn-hover" onClick={() => { setAssetToEdit(null); setIsAddAssetOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </Button>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search assets by name, ID, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Assets List */}
      <div className="grid gap-4">
        {filteredAssets.map((asset) => {
          const pmTasks = (asset.preventiveMaintenance && asset.preventiveMaintenance.length > 0)
            ? asset.preventiveMaintenance
            : tasks.filter((t: any) => t.assetId === asset.id)
          const now = new Date()
          const total = pmTasks.length
          const completed = pmTasks.filter((t: any) => t.nextDue && new Date(t.nextDue) > now).length
          const bdCount = allBreakdowns.filter((r: any) => r.assetId === asset.id).length
          const hasBreakdown = bdCount > 0

          const statusLabel = asset.status === 'under-maintenance' ? 'under maintenance' : asset.status

          return (
            <Card key={asset.id} className="card-hover">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className={`${hasBreakdown ? 'bg-red-100' : 'bg-blue-100'} p-3 rounded-lg`} aria-label={hasBreakdown ? 'Breakdown reported' : 'No breakdowns'}>
                        <Package className={`h-6 w-6 ${hasBreakdown ? 'text-red-600' : 'text-blue-600'}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 mb-1 text-base">
                          {asset.name}
                        </h3>
                        <p className="text-slate-600 text-xs mb-2">
                          ID: {asset.id}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {asset.location}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Purchased: {formatDateOnly(asset.purchaseDate)}
                          </div>
                        </div>
                        <div className="mt-3 text-[11px] text-slate-600">
                          {total > 0 ? (
                            <span>Preventive maintenance: ({completed}/{total}) completed</span>
                          ) : (
                            <span>No preventive maintenance</span>
                          )}
                          {bdCount > 0 && (
                            <div className="mt-1">
                              <button
                                type="button"
                                onClick={() => openBreakdownModal(asset)}
                                className="inline-flex items-center gap-1.5 text-red-600 hover:underline"
                                aria-label={`View ${bdCount} breakdown${bdCount>1?'s':''} for ${asset.name}`}
                              >
                                <AlertTriangle className="h-5 w-5" />
                                <span className="font-medium">{bdCount}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col lg:items-end gap-2">
                    <div className="flex gap-2">
                      <Button onClick={() => handleView(asset)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      {canEditAssets && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                              <Shuffle className="h-4 w-4 mr-2" />
                              {statusLabel}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Change status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleStatusChange(asset, 'operational')}>Operational</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(asset, 'under-maintenance')}>Under Maintenance</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(asset, 'decommissioned')}>Decommissioned</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <div ref={el => { qrCodeRefs.current[asset.id] = el; }} className="hidden">
                        <QRCodeCanvas
                          value={asset.id}
                          size={128}
                        />
                      </div>
                      <Button variant="outline" size="icon" onClick={() => downloadQRCode(asset.id)} aria-label="Download QR">
                        <QrCode className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredAssets.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-base font-medium text-slate-900 mb-2">
              No assets found
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms to see more results.'
                : 'Get started by adding your first asset.'}
            </p>
            {canCreateAsset && (
              <Button className="btn-hover" onClick={() => { setAssetToEdit(null); setIsAddAssetOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <AddAssetForm
        onAssetAdded={loadData}
        assetToEdit={assetToEdit}
        open={isAddAssetOpen}
        onOpenChange={setIsAddAssetOpen}
      >
        {/* This is a dialog, so no trigger is needed here */}
        <></>
      </AddAssetForm>

      {/* Breakdown details modal */}
      <Dialog open={isBreakdownOpen} onOpenChange={setIsBreakdownOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] overflow-y-auto p-0">
          <DialogHeader className="sticky top-0 z-10 bg-white/80 backdrop-blur supports-backdrop-filter:bg-white/60 px-6 py-3 border-b">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle>Breakdowns{breakdownAsset ? ` — ${breakdownAsset.name}` : ''}</DialogTitle>
                {breakdownItems && breakdownItems.length > 0 ? (
                  <div className="text-xs text-slate-600 mt-1">
                    {(() => {
                      const p = breakdownItems.reduce((acc: number, r: any) => acc + (r.mediaFiles?.filter((m: any) => m.type === 'PHOTO').length || 0), 0)
                      const v = breakdownItems.reduce((acc: number, r: any) => acc + (r.mediaFiles?.filter((m: any) => m.type === 'VIDEO').length || 0), 0)
                      const a = breakdownItems.reduce((acc: number, r: any) => acc + (r.mediaFiles?.filter((m: any) => m.type === 'AUDIO').length || 0), 0)
                      return `Photos: ${p} • Videos: ${v} • Audio: ${a}`
                    })()}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setIsBreakdownOpen(false)}
                className="inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-700 focus:outline-none"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>
          {isLoadingBreakdown ? (
            <div className="p-6 text-sm text-slate-600">Loading...</div>
          ) : (
            <div className="p-4 space-y-3">
              {breakdownItems.length === 0 ? (
                <div className="text-sm text-slate-600">No breakdowns reported for this asset.</div>
              ) : (
                breakdownItems.map((r: any) => {
                  const when = r.createdAt ? new Date(r.createdAt) : null
                  const photos = (r.mediaFiles || []).filter((m: any) => m.type === 'PHOTO')
                  const videos = (r.mediaFiles || []).filter((m: any) => m.type === 'VIDEO')
                  const audio = (r.mediaFiles || []).filter((m: any) => m.type === 'AUDIO')
                  return (
                    <div key={r.id} className="border rounded-md p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="font-medium text-slate-900">{r.title || 'Breakdown'}</div>
                          {r.description ? (
                            <div className="text-sm text-slate-700">{r.description}</div>
                          ) : null}
                          <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                            <span>Date: {when ? when.toLocaleString() : '-'}</span>
                            <span>Photos: {photos.length}</span>
                            <span>Videos: {videos.length}</span>
                            <span>Audio: {audio.length}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(r.id)}
                          className="inline-flex items-center justify-center rounded-md text-red-600 hover:text-red-700 disabled:opacity-50"
                          aria-label="Delete breakdown"
                          disabled={isDeletingId === r.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {(photos.length > 0) && (
                        <div className="mt-3">
                          <div className="text-xs font-semibold text-slate-700 mb-1">Photos</div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {photos.map((p: any, i: number) => (
                              <a
                                key={`p-${i}`}
                                href={`${API_BASE}${p.path}`}
                                target="_blank"
                                rel="noreferrer"
                                className="block rounded-md overflow-hidden bg-slate-100"
                              >
                                <img src={`${API_BASE}${p.path}`} alt={`photo-${i}`} className="w-full h-auto object-cover" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      {(videos.length > 0) && (
                        <div className="mt-3">
                          <div className="text-xs font-semibold text-slate-700 mb-1">Videos</div>
                          <ul className="space-y-1 text-sm">
                            {videos.map((v: any, i: number) => (
                              <li key={`v-${i}`}>
                                <a className="text-blue-600 hover:underline" href={`${API_BASE}${v.path}`} target="_blank" rel="noreferrer">Video {i+1}</a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {(audio.length > 0) && (
                        <div className="mt-3">
                          <div className="text-xs font-semibold text-slate-700 mb-1">Audio</div>
                          <ul className="space-y-1">
                            {audio.map((a: any, i: number) => (
                              <li key={`a-${i}`} className="flex items-center gap-2">
                                <audio controls src={`${API_BASE}${a.path}`} className="w-full" />
                                <a className="text-blue-600 hover:underline text-xs" href={`${API_BASE}${a.path}`} target="_blank" rel="noreferrer">Open</a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm delete dialog */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => { if (!open && !isDeletingId) setConfirmDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete breakdown?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the selected breakdown report and all of its attached media.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!isDeletingId}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={!!isDeletingId}>
              {isDeletingId && confirmDeleteId === isDeletingId ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-4 w-4 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                  Deleting...
                </span>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}

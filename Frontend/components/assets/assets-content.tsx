'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Package, MapPin, Calendar, QrCode, Eye, Shuffle } from 'lucide-react'
import { AssetService } from '@/lib/services/asset-service'
import { MaintenanceService } from '@/lib/services/maintenance-service'
import { formatDateOnly } from '@/lib/utils'
import { AddAssetForm } from './add-asset-form'
import { QRCodeCanvas } from 'qrcode.react'
import { StepCircles } from '@/components/ui/step-circles'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  };

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
    const [data, t] = await Promise.all([
      AssetService.getAssets(),
      MaintenanceService.getMaintenanceTasks(),
    ])
    setAssets(data)
    setTasks(t)
    setIsLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredAssets = assets.filter(asset =>
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.location.toLowerCase().includes(searchTerm.toLowerCase())
  )


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
          // Preventive maintenance tasks for this asset: match by name or id
          const labels = [asset.name, asset.id]
          const pmTasks = (asset.preventiveMaintenance && asset.preventiveMaintenance.length > 0)
            ? asset.preventiveMaintenance
            : tasks.filter((t) => labels.includes(t.asset))
          const now = new Date()
          // A task is considered done if its next due date is in the future
          const steps: boolean[] = pmTasks.map((t: any) => new Date(t.nextDue) > now)

          const statusLabel = asset.status === 'under-maintenance' ? 'under maintenance' : asset.status

          return (
            <Card key={asset.id} className="card-hover">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <Package className="h-6 w-6 text-blue-600" />
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
                        {/* Preventive Maintenance status */}
                        <div className="mt-3">
                          <StepCircles statuses={steps} ariaLabel={`Preventive maintenance for ${asset.name}`} />
                          <div className="mt-2 text-[11px] text-slate-500">
                            {pmTasks.length > 0 ? (
                              <>
                                PM: {pmTasks.map((t: any) => `${t.title} (${t.frequency || '-'})`).join(' • ')}
                              </>
                            ) : (
                              <span>No preventive maintenance</span>
                            )}
                          </div>
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

    </div>
  )
}

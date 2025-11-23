'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Info, MapPin, Wrench, Trash2, Plus, Pencil, X, FileText, Crosshair, Check } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader as ADHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { AssetService } from '@/lib/services/asset-service'
import { API_BASE } from '@/lib/api'
import { PreventiveService } from '@/lib/services/preventive-service'
import { UserService } from '@/lib/services/user-service'
import { QRCodeCanvas } from 'qrcode.react'
import { useToast } from '@/hooks/use-toast'

interface AddAssetFormProps {
  children: React.ReactNode
  onAssetAdded: () => void
  assetToEdit?: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddAssetForm({ children, onAssetAdded, assetToEdit, open, onOpenChange }: AddAssetFormProps) {
  const [showQrCode, setShowQrCode] = useState(false)
  const [newAsset, setNewAsset] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const [assetName, setAssetName] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('operational')
  const [building, setBuilding] = useState('')
  const [floor, setFloor] = useState('')
  const [room, setRoom] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [model, setModel] = useState('')
  const [serial, setSerial] = useState('')
  const [installationDate, setInstallationDate] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [locLoading, setLocLoading] = useState(false)
  const { toast } = useToast()

  // Preventive Maintenance state
  const [preventiveEnabled, setPreventiveEnabled] = useState(false)
  const [pmRows, setPmRows] = useState<{ title: string; description: string; assignedTo: string; frequency: string; startDate?: string; isExisting?: boolean; existingId?: string; dirty?: boolean }[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [uploads, setUploads] = useState<{ file: File; url?: string }[]>([])
  const [pmSaved, setPmSaved] = useState<{ title: string; description: string; assignedTo: string; frequency: string; startDate?: string; isExisting?: boolean; existingId?: string; dirty?: boolean }[]>([])
  const [existingAttachments, setExistingAttachments] = useState<{ filename: string; path: string; mimeType: string }[]>([])
  const [deletePmIndex, setDeletePmIndex] = useState<number | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  useEffect(() => {
    if (assetToEdit) {
      setAssetName(assetToEdit.name || '')
      setCategory(assetToEdit.category || '')
      setStatus(assetToEdit.status || 'operational')
      const locationParts = assetToEdit.location?.split(', ') || ['', '', '']
      setBuilding(locationParts[0] || '')
      setFloor(locationParts[1] || '')
      setRoom(locationParts[2] || '')
      // Prefill lat/long if present on the asset
      const latNum = typeof assetToEdit.latitude === 'number' ? assetToEdit.latitude : Number(assetToEdit.latitude)
      const lonNum = typeof assetToEdit.longitude === 'number' ? assetToEdit.longitude : Number(assetToEdit.longitude)
      setLatitude(Number.isFinite(latNum) ? latNum.toFixed(6) : '')
      setLongitude(Number.isFinite(lonNum) ? lonNum.toFixed(6) : '')
      setManufacturer(assetToEdit.manufacturer || '')
      setModel(assetToEdit.model || '')
      setSerial(assetToEdit.serialNumber || '')
      setInstallationDate(assetToEdit.installationDate ? new Date(assetToEdit.installationDate).toISOString().split('T')[0] : '')
      // Reset PM state when editing, then load existing PM tasks for this asset
      setPreventiveEnabled(false)
      setPmRows([])
      setPmSaved([])
      ;(async () => {
        try {
          const list = await PreventiveService.list({ assetId: assetToEdit.id })
          const mapped = list.map((t: any) => ({
            title: t.title,
            description: t.description || '',
            assignedTo: t.assignedToName || '',
            frequency: String(t.frequency || '').toLowerCase(),
            isExisting: true,
            existingId: t.id,
            dirty: false,
          }))
          if (mapped.length > 0) {
            setPreventiveEnabled(true)
            setPmSaved(mapped)
          }
        } catch (e) {
          // no-op for now
        }
        // Load existing attachments
        try {
          const files = await AssetService.getAttachments(assetToEdit.id)
          const all = [
            ...(files.photos || []).map((f: any) => ({ filename: f.filename, path: f.path, mimeType: f.mimeType })),
            ...(files.documents || []).map((f: any) => ({ filename: f.filename, path: f.path, mimeType: f.mimeType })),
          ]
          setExistingAttachments(all)
        } catch {}
      })()
    } else {
      setAssetName('')
      setCategory('')
      setStatus('operational')
      setBuilding('')
      setFloor('')
      setRoom('')
      setLatitude('')
      setLongitude('')
      setManufacturer('')
      setModel('')
      setSerial('')
      setInstallationDate('')
      // Reset PM state on new
      setPreventiveEnabled(false)
      setPmRows([])
      setPmSaved([])
      setExistingAttachments([])
    }
  }, [assetToEdit, open])

  // Load users for Assigned To dropdown
  useEffect(() => {
    const loadUsers = async () => {
      const u = await UserService.getUsers()
      setUsers(u)
    }
    loadUsers()
  }, [])

  // When enabling Preventive Maintenance, auto-add a blank row to make it quicker to start
  useEffect(() => {
    if (preventiveEnabled && pmRows.length === 0 && pmSaved.length === 0) {
      setPmRows([{ title: '', description: '', assignedTo: '', frequency: '', startDate: new Date().toISOString().split('T')[0], isExisting: false }])
    }
  }, [preventiveEnabled])

  // Reset previews when dialog closes to avoid stale previews and free memory
  useEffect(() => {
    if (!open && uploads.length) {
      uploads.forEach(u => { if (u.url) URL.revokeObjectURL(u.url) })
      setUploads([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleFilesAdd = (files: File[]) => {
    if (!files || files.length === 0) return
    const accepted = files.filter(f => f.type.startsWith('image/') || f.type === 'application/pdf')
    if (!accepted.length) return
    const next = accepted.map(f => ({ file: f, url: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined }))
    setUploads(prev => {
      const sig = (f: File) => `${f.name}_${f.size}_${f.lastModified}`
      const existing = new Set(prev.map(u => sig(u.file)))
      const additions = next.filter(u => !existing.has(sig(u.file)))
      return [...prev, ...additions]
    })
  }

  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : []
    handleFilesAdd(files)
    event.currentTarget.value = ''
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const files = Array.from(event.dataTransfer?.files || [])
    handleFilesAdd(files)
  }

  const removeUpload = (index: number) => {
    setUploads(prev => {
      const item = prev[index]
      if (item?.url) URL.revokeObjectURL(item.url)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async () => {
    const assetData = {
      name: assetName,
      category,
      status,
      location: `${building}, ${floor}, ${room}`,
      purchaseDate: new Date(),
      cost: 0, // Default value, can be updated later
      warrantyExpiry: new Date(), // Default value
      lastMaintenance: new Date(), // Default value
      manufacturer,
      model,
      serialNumber: serial,
      installationDate: installationDate ? new Date(installationDate) : null,
      latitude,
      longitude,
    }

    if (assetToEdit) {
      const result = await AssetService.updateAsset(assetToEdit.id, assetData)
      if (result.success) {
        // Upload attachments if any new files selected
        if (uploads.length > 0) {
          try {
            await AssetService.uploadAttachments(assetToEdit.id, uploads.map(u => u.file))
          } catch (e) {
            // ignore for now; could surface toast
          }
        }
        // On update: create new tasks and update edited existing ones
        if (preventiveEnabled) {
          const combined = [...pmSaved, ...pmRows]
          const newOnly = combined.filter(t => !t.isExisting)
          // Validate new tasks before creating
          const invalid = newOnly.filter(row => !row.title?.trim() || !row.description?.trim() || !row.frequency || !(row.startDate && row.startDate.trim()))
          if (invalid.length > 0) {
            toast({ title: 'Preventive tasks incomplete', description: 'Fill Title, Description, Frequency, and Start Date for all preventive tasks.', variant: 'destructive' })
            return
          }
          const editedExisting = combined.filter(t => t.isExisting && t.dirty && t.existingId)
          if (newOnly.length > 0) {
            await Promise.all(
              newOnly.map(row => {
                const assignee = users.find(u => u.name === row.assignedTo)
                return PreventiveService.create({
                  assetId: assetToEdit.id,
                  title: row.title,
                  description: row.description,
                  assignedToName: row.assignedTo,
                  assignedToId: assignee?.id,
                  frequency: String(row.frequency || '').toUpperCase(),
                  category: 'Preventive',
                  startDate: row.startDate,
                })
              })
            )
          }
          if (editedExisting.length > 0) {
            await Promise.all(
              editedExisting.map(row => {
                const assignee = users.find(u => u.name === row.assignedTo)
                return PreventiveService.update(row.existingId as string, {
                  title: row.title,
                  description: row.description,
                  assignedToName: row.assignedTo,
                  assignedToId: assignee?.id,
                  frequency: String(row.frequency || '').toUpperCase() as any,
                })
              })
            )
          }
        }
        // Clear local previews
        uploads.forEach(u => { if (u.url) URL.revokeObjectURL(u.url) })
        setUploads([])
        onAssetAdded()
        onOpenChange(false)
      }
    } else {
      const result = await AssetService.createAsset(assetData)
      if (result.success) {
        // Upload attachments if any files selected
        if (uploads.length > 0) {
          try {
            await AssetService.uploadAttachments(result.id, uploads.map(u => u.file))
          } catch (e) {
            // ignore for now; could surface toast
          }
        }
        // Create preventive tasks if enabled (saved list + any remaining rows)
        if (preventiveEnabled) {
          const allTasks = [...pmSaved, ...pmRows]
          if (allTasks.length > 0) {
            const invalid = allTasks.filter(row => !row.title?.trim() || !row.description?.trim() || !row.frequency || !(row.startDate && row.startDate.trim()))
            if (invalid.length > 0) {
              toast({ title: 'Preventive tasks incomplete', description: 'Fill Title, Description, Frequency, and Start Date for all preventive tasks.', variant: 'destructive' })
              return
            }
            await Promise.all(
              allTasks.map(row => {
                const assignee = users.find(u => u.name === row.assignedTo)
                return PreventiveService.create({
                  assetId: result.id,
                  title: row.title,
                  description: row.description,
                  assignedToName: row.assignedTo,
                  assignedToId: assignee?.id,
                  frequency: String(row.frequency || '').toUpperCase(),
                  category: 'Preventive',
                  startDate: row.startDate,
                })
              })
            )
          }
        }
        setNewAsset({ ...assetData, id: result.id })
        // Clear local previews
        uploads.forEach(u => { if (u.url) URL.revokeObjectURL(u.url) })
        setUploads([])
        onAssetAdded()
        onOpenChange(false)
        // small delay to avoid dialog animation flicker
        setTimeout(() => setShowQrCode(true), 200)
      }
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {children && <DialogTrigger asChild>{children}</DialogTrigger>}
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{assetToEdit ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
            <DialogDescription>
              Enter the details of the new asset below. Click save when you're done.
            </DialogDescription>
          </DialogHeader>

          {/* WorkOrderForm-like scrolling container (no ScrollArea) */}
          <div className="max-h-[70vh] overflow-y-auto px-2">
            <div className="space-y-6 py-4">
              {/* Asset Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-slate-600" />
                  <h3 className="text-lg font-semibold">Asset Information</h3>
                </div>

                {/* Delete confirmation dialog for saved preventive tasks */}
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogContent>
                    <ADHeader>
                      <AlertDialogTitle>Delete preventive task?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. The selected preventive task will be permanently deleted.
                      </AlertDialogDescription>
                    </ADHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={async () => {
                          const idx = deletePmIndex
                          if (idx == null) { setDeleteDialogOpen(false); return }
                          const item = pmSaved[idx]
                          try {
                            if (item?.isExisting && item.existingId) {
                              await PreventiveService.delete(item.existingId)
                            }
                            setPmSaved(s => s.filter((_, i2) => i2 !== idx))
                            toast({ title: 'Deleted', description: 'Preventive task deleted successfully.' })
                          } catch (e) {
                            toast({ title: 'Failed to delete', description: 'Please try again later.', variant: 'destructive' })
                          } finally {
                            setDeleteDialogOpen(false)
                            setDeletePmIndex(null)
                          }
                        }}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="asset-name">Asset Name*</Label>
                    <Input id="asset-name" placeholder="e.g., HVAC Unit #3" value={assetName} onChange={e => setAssetName(e.target.value)} />
                  </div>
                  {/* Asset ID is auto-generated by backend; removed manual entry field */}
                  <div className="space-y-2">
                    <Label htmlFor="category">Category*</Label>
                    <Select onValueChange={setCategory} value={category}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select from dropdown" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hvac">HVAC</SelectItem>
                        <SelectItem value="electrical">Electrical</SelectItem>
                        <SelectItem value="plumbing">Plumbing</SelectItem>
                        <SelectItem value="machinery">Machinery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select onValueChange={setStatus} value={status}>
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="operational">Operational</SelectItem>
                        <SelectItem value="under-maintenance">Under Maintenance</SelectItem>
                        <SelectItem value="decommissioned">Decommissioned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Location Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-slate-600" />
                  <h3 className="text-lg font-semibold">Location Details</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="building">Building/Facility*</Label>
                    <Input id="building" placeholder="e.g., Building A" value={building} onChange={e => setBuilding(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="floor">Floor/Level</Label>
                    <Input id="floor" placeholder="e.g., 3rd Floor" value={floor} onChange={e => setFloor(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="room">Room/Area</Label>
                    <Input id="room" placeholder="e.g., Server Room" value={room} onChange={e => setRoom(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>GPS Coordinates (Optional)</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={locLoading}
                        onClick={() => {
                          if (!('geolocation' in navigator)) {
                            toast({ title: 'Geolocation not available', description: 'Your browser does not support location.', variant: 'destructive' })
                            return
                          }
                          setLocLoading(true)
                          navigator.geolocation.getCurrentPosition(
                            (pos) => {
                              const lat = Number(pos.coords.latitude)
                              const lng = Number(pos.coords.longitude)
                              setLatitude(Number.isFinite(lat) ? lat.toFixed(6) : '')
                              setLongitude(Number.isFinite(lng) ? lng.toFixed(6) : '')
                              setLocLoading(false)
                            },
                            (err) => {
                              setLocLoading(false)
                              const msg = err?.code === 1
                                ? 'Permission denied. Please allow location access.'
                                : err?.code === 2
                                  ? 'Position unavailable.'
                                  : err?.code === 3
                                    ? 'Location request timed out.'
                                    : 'Unable to fetch location.'
                              toast({ title: 'Could not get location', description: msg, variant: 'destructive' })
                            },
                            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
                          )
                        }}
                      >
                        <Crosshair className="h-4 w-4" aria-hidden />
                        <span className="sr-only">{locLoading ? 'Fetching location' : 'Use current location'}</span>
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input placeholder="Latitude" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
                      <Input placeholder="Longitude" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

               <Separator />
              
              {/* Preventive Maintenance */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Preventive Maintenance</h3>
                  <div className="flex items-center gap-2">
                    <Checkbox id="preventive-enabled" checked={preventiveEnabled} onCheckedChange={(v) => setPreventiveEnabled(Boolean(v))} />
                    <Label htmlFor="preventive-enabled">Enable Preventive Maintenance</Label>
                  </div>
                </div>

                {preventiveEnabled && (
                  <div className="space-y-3">
                    {pmRows.map((row, idx) => (
                      <div key={idx} className="border rounded-md p-3 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor={`pm-title-${idx}`}>Title</Label>
                            <Input id={`pm-title-${idx}`} value={row.title} onChange={e => {
                              const v = e.target.value; setPmRows(r => r.map((it, i) => i===idx ? { ...it, title: v, dirty: it.isExisting ? true : it.dirty } : it))
                            }} placeholder="e.g., Motor Lubrication" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`pm-assigned-${idx}`}>Assigned To</Label>
                            <Select value={row.assignedTo} onValueChange={(val) => setPmRows(r => r.map((it,i)=> i===idx ? { ...it, assignedTo: val, dirty: it.isExisting ? true : it.dirty } : it))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a user" />
                              </SelectTrigger>
                              <SelectContent>
                                {users.map(u => (
                                  <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`pm-desc-${idx}`}>Description</Label>
                          <Textarea id={`pm-desc-${idx}`} value={row.description} onChange={e => {
                            const v = e.target.value; setPmRows(r => r.map((it, i) => i===idx ? { ...it, description: v, dirty: it.isExisting ? true : it.dirty } : it))
                          }} placeholder="Task details..." />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                          <div className="space-y-2">
                            <Label htmlFor={`pm-frequency-${idx}`}>Frequency</Label>
                            <Select value={row.frequency} onValueChange={(val) => setPmRows(r => r.map((it,i)=> i===idx ? { ...it, frequency: val, dirty: it.isExisting ? true : it.dirty } : it))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="quarterly">Quarterly</SelectItem>
                                <SelectItem value="yearly">Yearly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`pm-start-${idx}`}>Start Date</Label>
                            <Input id={`pm-start-${idx}`} type="date" value={row.startDate || ''} onChange={e => {
                              const v = e.target.value; setPmRows(r => r.map((it, i) => i===idx ? { ...it, startDate: v, dirty: it.isExisting ? true : it.dirty } : it))
                            }} />
                          </div>
                          <div className="md:col-start-4 flex justify-end gap-2">
                            <Button
                              type="button"
                              size="icon"
                              onClick={() => {
                                // Basic validation: require title & description
                                if (!row.title.trim() || !row.description.trim() || !row.frequency || !(row.startDate && row.startDate.trim())) {
                                  toast({
                                    title: 'Missing required fields',
                                    description: 'Please fill Title, Description, Frequency, and Start Date for this task.',
                                    variant: 'destructive',
                                  })
                                  return
                                }
                                setPmSaved(s => [...s, { ...row }])
                                setPmRows(r => r.filter((_, i) => i !== idx))
                              }}
                            >
                              <Check className="h-4 w-4" />
                              <span className="sr-only">Save</span>
                            </Button>
                            <Button type="button" size="icon" variant="outline" onClick={() => setPmRows(r => r.filter((_, i) => i !== idx))} aria-label="Delete row">
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete row</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button type="button" size="icon" variant="secondary" onClick={() => setPmRows(r => [...r, { title: '', description: '', assignedTo: '', frequency: '', startDate: new Date().toISOString().split('T')[0], isExisting: false }])} aria-label="Add row">
                      <Plus className="h-4 w-4" />
                      <span className="sr-only">Add row</span>
                    </Button>

                    {/* Saved PM tasks list */}
                    {pmSaved.length > 0 && (
                      <div className="space-y-2 pt-2">
                        {pmSaved.map((item, i) => (
                          <div key={`${item.title}-${i}`} className="flex items-start justify-between border rounded-md p-3">
                            <div className="pr-3">
                              <p className="font-semibold">{i + 1}. {item.title || 'Untitled'}</p>
                              <p className="text-sm text-slate-600 whitespace-pre-line">{item.description || '-'}</p>
                              <p className="text-xs text-slate-500 mt-1">{item.assignedTo ? `Assigned: ${item.assignedTo}` : ''} {item.frequency ? `• ${item.frequency}` : ''}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  // Move to editable rows
                                  setPmRows(r => [...r, { ...item }])
                                  setPmSaved(s => s.filter((_, idx) => idx !== i))
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => { setDeletePmIndex(i); setDeleteDialogOpen(true) }}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Existing Attachments (Edit Mode) */}
              {assetToEdit && existingAttachments.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Existing Attachments</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {existingAttachments.map((f, i) => {
                      const isImage = f.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(f.filename)
                      const isPdf = f.mimeType === 'application/pdf' || /\.pdf$/i.test(f.filename)
                      const src = `${API_BASE}${f.path}`
                      return (
                        <div key={`${f.filename}-${i}`} className="border rounded-md overflow-hidden relative">
                          {isImage ? (
                            <img src={src} alt={f.filename} className="h-32 w-full object-cover" />
                          ) : (
                            <div className="h-32 w-full flex items-center justify-center bg-slate-50">
                              <div className="flex flex-col items-center text-slate-600">
                                <FileText className="h-8 w-8 mb-2" />
                                <span className="text-xs">PDF</span>
                              </div>
                            </div>
                          )}
                          <div className="p-2 text-xs">
                            <p className="truncate font-medium">{f.filename}</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={async () => {
                              try {
                                await AssetService.deleteAttachment(assetToEdit.id, f.filename)
                                setExistingAttachments(prev => prev.filter((x, idx) => idx !== i))
                              } catch {}
                            }}
                            className="absolute top-2 right-2"
                            aria-label="Delete attachment"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Upload Files */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Upload Files</h3>
                </div>
                <div
                  className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:bg-slate-50'}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragEnter={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  <p className="text-sm text-slate-600">Click to upload or drag and drop files</p>
                  <p className="text-xs text-slate-500 mt-1">PNG, JPG, JPEG, WEBP, PDF — multiple files</p>
                </div>
                <Input
                  ref={fileInputRef}
                  type="file"
                  id="asset-files-upload"
                  className="hidden"
                  onChange={handleFilesChange}
                  accept="image/*,application/pdf"
                  multiple
                />
                {uploads.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {uploads.map((u, i) => {
                      const isImage = u.file.type.startsWith('image/')
                      const isPdf = u.file.type === 'application/pdf' || u.file.name.toLowerCase().endsWith('.pdf')
                      return (
                        <div key={`${u.file.name}-${u.file.lastModified}-${i}`} className="border rounded-md overflow-hidden relative">
                          {isImage ? (
                            <img src={u.url} alt={u.file.name} className="h-32 w-full object-cover" />
                          ) : (
                            <div className="h-32 w-full flex items-center justify-center bg-slate-50">
                              <div className="flex flex-col items-center text-slate-600">
                                <FileText className="h-8 w-8 mb-2" />
                                <span className="text-xs">PDF</span>
                              </div>
                            </div>
                          )}
                          <div className="p-2 text-xs">
                            <p className="truncate font-medium">{u.file.name}</p>
                            <p className="text-slate-500">{(u.file.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <Button type="button" variant="outline" size="icon" onClick={() => removeUpload(i)} className="absolute top-2 right-2" aria-label="Remove file">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </div>

              <Separator />

              {/* Technical Specifications */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-slate-600" />
                  <h3 className="text-lg font-semibold">Technical Specifications</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="manufacturer">Manufacturer</Label>
                    <Input id="manufacturer" placeholder="e.g., Carrier" value={manufacturer} onChange={e => setManufacturer(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input id="model" placeholder="e.g., 30HXC1006" value={model} onChange={e => setModel(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serial">Serial Number</Label>
                    <Input id="serial" placeholder="e.g., SN123456789" value={serial} onChange={e => setSerial(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="installation-date">Installation Date</Label>
                    <Input id="installation-date" type="date" value={installationDate} onChange={e => setInstallationDate(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleSubmit}>{assetToEdit ? 'Save Changes' : 'Save Asset'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showQrCode} onOpenChange={setShowQrCode}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asset QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code to view asset details.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-4">
            {newAsset && (
              <>
                <QRCodeCanvas
                  value={JSON.stringify({
                    id: newAsset.id,
                    name: newAsset.name,
                    location: newAsset.location,
                  })}
                  size={200}
                />
                <div className="mt-4 text-center">
                  <p className="font-bold">{newAsset.name}</p>
                  <p className="text-sm text-slate-500">{newAsset.id}</p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowQrCode(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

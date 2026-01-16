'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Upload, Calendar as CalendarIcon, File as FileIcon, X } from 'lucide-react'
import { WorkOrderService } from '@/lib/services/work-order-service'
import { UserService } from '@/lib/services/user-service'
import { AssetService } from '@/lib/services/asset-service'
import { formatDateOnly } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface User {
  id: string;
  name: string;
}

interface WorkOrderFormProps {
  onSave: (newWorkOrder: any) => void
  onCancel: () => void
  workOrder?: any
}

export function WorkOrderForm({ onSave, onCancel, workOrder }: WorkOrderFormProps) {
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date())
  const [priority, setPriority] = useState('medium')
  const [status, setStatus] = useState('pending')
  const [workType, setWorkType] = useState('breakdown')
  const [assignedToId, setAssignedToId] = useState<string>('')
  const [assignedToName, setAssignedToName] = useState<string>('')
  const [users, setUsers] = useState<User[]>([])
  const [assets, setAssets] = useState<Array<{ id: string; name: string }>>([])
  const [assetId, setAssetId] = useState<string>('')
  const [assetName, setAssetName] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<{ url: string; type: string; name: string; size: number }[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchUsers = async () => {
      const fetchedUsers = await UserService.getUsers()
      setUsers(fetchedUsers)
    }
    const fetchAssets = async () => {
      try {
        const fetchedAssets = await AssetService.getAssets()
        // keep only id and name for selector
        setAssets(fetchedAssets.map((a: any) => ({ id: a.id, name: a.name })))
      } catch {
        setAssets([])
      }
    }
    fetchUsers()
    fetchAssets()

    if (workOrder) {
      setSubject(workOrder.title || '')
      setDescription(workOrder.description || '')
      setDueDate(workOrder.dueDate ? new Date(workOrder.dueDate) : new Date())
      setPriority(workOrder.priority || 'medium')
      setStatus(workOrder.status || 'pending')
      setWorkType(workOrder.type || 'breakdown')
      // Prefill assignee if present
      setAssignedToId(workOrder.assignedToId || '')
      setAssignedToName(workOrder.assignedTo || workOrder.assignedToName || '')
      // Prefill asset if present
      setAssetId(workOrder.assetId || '')
      setAssetName(workOrder.asset || workOrder.assetName || '')
    }
  }, [workOrder])

  // After users/assets load, if we have names but missing IDs, resolve them so Selects prefill
  useEffect(() => {
    if (workOrder) {
      if (!assignedToId && assignedToName && users.length > 0) {
        const u = users.find(u => (u.name || '').trim().toLowerCase() === assignedToName.trim().toLowerCase())
        if (u) setAssignedToId(u.id)
      }
      if (!assetId && assetName && assets.length > 0) {
        const a = assets.find(a => (a.name || '').trim().toLowerCase() === assetName.trim().toLowerCase())
        if (a) setAssetId(a.id)
      }
    }
  }, [users, assets, assignedToName, assetName, workOrder])

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  // Merge unique files by name+size+lastModified to avoid duplicates
  const mergeUniqueFiles = (existing: File[], incoming: File[]) => {
    const key = (f: File) => `${f.name}-${f.size}-${f.lastModified}`
    const map = new Map(existing.map(f => [key(f), f] as const))
    for (const f of incoming) map.set(key(f), f)
    return Array.from(map.values())
  }

  const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
  const isSupportedType = (f: File) => {
    if (f.type.startsWith('image/') || f.type.startsWith('video/') || f.type.startsWith('audio/')) return true
    const docTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
    ]
    return docTypes.includes(f.type)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const list = event.target.files ? Array.from(event.target.files) : []
    if (list.length) {
      const tooBig = list.filter(f => f.size > MAX_SIZE)
      const badType = list.filter(f => !isSupportedType(f))
      if (tooBig.length) {
        toast({ title: 'File too large', description: `Each file must be <= 10 MB. Skipped ${tooBig.length} file(s).`, variant: 'destructive' as any })
      }
      if (badType.length) {
        toast({ title: 'Unsupported file type', description: 'Only images, videos, and audio files are allowed.', variant: 'destructive' as any })
      }
      const ok = list.filter(f => f.size <= MAX_SIZE && isSupportedType(f))
      if (ok.length) setFiles(prev => mergeUniqueFiles(prev, ok))
    }
    // allow selecting the same file again later
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const dtFiles = Array.from(e.dataTransfer.files || [])
    if (!dtFiles.length) return
    const tooBig = dtFiles.filter(f => f.size > MAX_SIZE)
    const badType = dtFiles.filter(f => !isSupportedType(f))
    if (tooBig.length) {
      toast({ title: 'File too large', description: `Each file must be <= 10 MB. Skipped ${tooBig.length} file(s).`, variant: 'destructive' as any })
    }
    if (badType.length) {
      toast({ title: 'Unsupported file type', description: 'Only images, videos, and audio files are allowed.', variant: 'destructive' as any })
    }
    const ok = dtFiles.filter(f => f.size <= MAX_SIZE && isSupportedType(f))
    if (ok.length) setFiles(prev => mergeUniqueFiles(prev, ok))
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const removeFileAt = (idx: number) => {
    setFiles((curr) => curr.filter((_, i) => i !== idx))
    setPreviews((curr) => {
      const copy = [...curr]
      const [removed] = copy.splice(idx, 1)
      if (removed) URL.revokeObjectURL(removed.url)
      return copy
    })
  }

  // Rebuild previews whenever files change, and clean up old URLs
  useEffect(() => {
    const next = files.map((f) => ({
      url: URL.createObjectURL(f),
      type: f.type,
      name: f.name,
      size: f.size,
    }))
    setPreviews((old) => {
      old.forEach((p) => URL.revokeObjectURL(p.url))
      return next
    })
    return () => {
      next.forEach((p) => URL.revokeObjectURL(p.url))
    }
  }, [files])


  const handleSubmit = async () => {
    // Basic validation
    if (!subject.trim()) {
      toast({ title: 'Subject required', description: 'Please enter a subject for the work order.', variant: 'destructive' as any })
      return
    }
    setIsSubmitting(true)
    try {
      const baseData = {
        title: subject.trim(),
        description: description.trim(),
        status: status,
        priority,
        // Keep backwards compatibility for any consumers
        assignedTo: assignedToName || '',
        // For create we'll allow nulls; for update we'll strip empties below
        assignedToId: assignedToId || null,
        assignedToName: assignedToName || null,
        dueDate: dueDate || null,
        createdAt: workOrder?.createdAt ? new Date(workOrder.createdAt) : new Date(),
        type: workType,
        assetId: assetId || null,
        asset: assetName || null,
      }

      if (workOrder) {
        // Avoid clearing fields unintentionally: if no selection made, send undefined
        const updateData = {
          ...baseData,
          assignedToId: assignedToId ? assignedToId : undefined,
          assignedToName: assignedToName ? assignedToName : undefined,
          assetId: assetId ? assetId : undefined,
          asset: assetName ? assetName : undefined,
        }
        const result = await WorkOrderService.updateWorkOrder(workOrder.id, updateData)
        if (result.success) {
          let attachments: any[] = []
          if (files.length > 0) {
            try {
              const uploaded = await WorkOrderService.uploadIssueFiles(workOrder.id, files, description)
              const normalize = (arr: any[], kind: 'photo'|'video'|'audio') => (arr || []).map(f => ({
                url: f.path || f.url,
                mimeType: f.mimeType,
                filename: f.filename,
                kind,
              }))
              attachments = [
                ...normalize(uploaded.files?.photos, 'photo'),
                ...normalize(uploaded.files?.videos, 'video'),
                ...normalize(uploaded.files?.audio, 'audio'),
              ]
            } catch (e) {
              // Upload failure shouldn't block saving
              console.error(e)
              toast({ title: 'Attachments upload failed', description: 'The work order was saved but files could not be uploaded.', variant: 'destructive' as any })
            }
          }
          onSave({ ...baseData, id: workOrder.id, attachments })
          setFiles([])
          setPreviews([])
          toast({ title: 'Work order updated' })
        }
      } else {
        const result = await WorkOrderService.createWorkOrder(baseData)
        if (result.success) {
          let attachments: any[] = []
          if (files.length > 0) {
            try {
              const uploaded = await WorkOrderService.uploadIssueFiles(result.id, files, description)
              const normalize = (arr: any[], kind: 'photo'|'video'|'audio') => (arr || []).map(f => ({
                url: f.path || f.url,
                mimeType: f.mimeType,
                filename: f.filename,
                kind,
              }))
              attachments = [
                ...normalize(uploaded.files?.photos, 'photo'),
                ...normalize(uploaded.files?.videos, 'video'),
                ...normalize(uploaded.files?.audio, 'audio'),
              ]
            } catch (e) {
              console.error(e)
              toast({ title: 'Attachments upload failed', description: 'The work order was created but files could not be uploaded.', variant: 'destructive' as any })
            }
          }
          onSave({ ...baseData, id: result.id, attachments })
          setFiles([])
          setPreviews([])
          toast({ title: 'Work order created' })
        }
      }
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Failed to save work order'
      toast({ title: 'Error', description: msg, variant: 'destructive' as any })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl">{workOrder ? 'Edit Work Order' : 'New Work Order'}</DialogTitle>
        <DialogDescription className="text-sm">Fill out the details to create a new work order.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-2">
        <div className="space-y-1">
          <Label htmlFor="subject" className="text-xs">Subject</Label>
          <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Conveyor Belt Motor Maintenance" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="description" className="text-xs">Description</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add a detailed description..." />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Add Photo or Video</Label>
          <Input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,video/*,audio/*"
            multiple
            className="hidden"
          />
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative w-full rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors cursor-pointer ${isDragging ? 'border-teal-500 bg-teal-500/5' : 'border-slate-300 hover:border-slate-400'}`}
            onClick={handleFileSelect}
          >
            <div className="flex flex-col items-center gap-2 text-slate-600">
              <Upload className="h-6 w-6 text-teal-600" />
              <p className="text-sm">Drag and drop files here, or <span className="text-teal-600 font-medium">Browse</span></p>
              <p className="text-xs text-slate-500">Images, videos or audio up to 10 MB each</p>
            </div>
          </div>

          {previews.length > 0 && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {previews.map((file, idx) => (
                <div key={file.url} className="group relative rounded-md overflow-hidden border bg-slate-50">
                  {file.type.startsWith('image/') ? (
                    <Image src={file.url} alt={file.name} width={320} height={180} className="h-28 w-full object-cover" />
                  ) : (
                    <div className="h-28 w-full flex items-center justify-center text-slate-500">
                      <FileIcon className="h-8 w-8" />
                    </div>
                  )}
                  <button
                    type="button"
                    aria-label="Remove file"
                    onClick={(e) => { e.stopPropagation(); removeFileAt(idx) }}
                    className="absolute top-1 right-1 inline-flex items-center justify-center rounded-full bg-red-600 text-white p-1.5 text-[10px] shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <div className="px-2 py-1 text-[10px] truncate text-slate-700">{file.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Assigned User</Label>
            <Select
              value={assignedToId}
              onValueChange={(val) => {
                setAssignedToId(val)
                const u = users.find(u => u.id === val)
                setAssignedToName(u?.name || '')
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" sideOffset={4} className="max-h-56 overflow-auto z-[2000]">
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Asset</Label>
            <Select
              value={assetId}
              onValueChange={(val) => {
                setAssetId(val)
                const a = assets.find(a => a.id === val)
                setAssetName(a?.name || '')
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an asset" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" sideOffset={4} className="max-h-56 overflow-auto z-[2000]">
                {assets.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Due Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dueDate ? formatDateOnly(dueDate) : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
            </PopoverContent>
          </Popover>
          <Button variant="link" className="p-0 h-auto text-xs">Add Start Date</Button>
        </div>
        <div>
          <h3 className="text-base font-medium mb-2">Other Information</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Type of Work</Label>
                <Select value={workType} onValueChange={setWorkType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakdown">Breakdown</SelectItem>
                    <SelectItem value="failure">Failure</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="calibration">Calibration</SelectItem>
                    <SelectItem value="legalization">Legalization</SelectItem>
                    <SelectItem value="autonomous-maintenance">Autonomous Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
      </DialogFooter>

    </>
  )
}

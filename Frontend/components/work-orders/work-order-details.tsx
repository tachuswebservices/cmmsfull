'use client'

import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, User, Tag, MapPin, Type, ChevronsRight } from 'lucide-react'
import { formatDateOnly } from '@/lib/utils'
import { API_BASE } from '@/lib/api'
import { useHasAny } from '@/hooks/use-permissions'

interface WorkOrderDetailsProps {
  workOrder: any
  onEdit: () => void
  onClose: () => void
}

export function WorkOrderDetails({ workOrder, onEdit, onClose }: WorkOrderDetailsProps) {
  if (!workOrder) return null
  const attachments: Array<{ url?: string; mimeType?: string; filename?: string; kind?: 'photo'|'video'|'audio' }> = workOrder.attachments || []
  const toAbsoluteUrl = (u?: string) => {
    if (!u) return ''
    return u.startsWith('http') ? u : `${API_BASE}${u}`
  }
  const canManageWorkOrder = useHasAny(['workOrders.create','workOrders.approve','workOrders.assign','workOrders.close'])

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center">
          {workOrder.title}
          <Badge variant={workOrder.priority === 'high' ? 'destructive' : 'secondary'} className="ml-4">
            {workOrder.priority}
          </Badge>
        </DialogTitle>
        <DialogDescription>
          Work Order #{workOrder.id}
        </DialogDescription>
      </DialogHeader>
      <div className="max-h-[70vh] overflow-y-auto pr-6">
        <div className="space-y-6 py-4">
          <div>
            <h4 className="font-semibold mb-1 text-sm">Description</h4>
            <p className="text-sm text-slate-600">{workOrder.description}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-1 flex items-center gap-2 text-sm"><User className="h-4 w-4" /> Assigned To</h4>
              <p className="text-sm text-slate-600">{workOrder.assignedTo || 'Unassigned'}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-1 flex items-center gap-2 text-sm"><Calendar className="h-4 w-4" /> Due Date</h4>
              <p className="text-sm text-slate-600">{workOrder.dueDate ? formatDateOnly(workOrder.dueDate) : 'N/A'}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-1 flex items-center gap-2 text-sm"><Type className="h-4 w-4" /> Type of Work</h4>
              <p className="text-sm text-slate-600">{workOrder.type}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-1 flex items-center gap-2 text-sm"><MapPin className="h-4 w-4" /> Asset / Location</h4>
              <p className="text-sm text-slate-600">{workOrder.asset}</p>
            </div>
          </div>
          {attachments.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">Attachments</h4>
              <div className="space-y-4">
                {/* Photos */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {attachments.filter(a => a.kind === 'photo' || (a.mimeType || '').startsWith('image/')).map((a, idx) => (
                    <a href={toAbsoluteUrl(a.url)} target="_blank" rel="noreferrer" key={`ph-${idx}`} className="block">
                      <img src={toAbsoluteUrl(a.url)} alt={a.filename || 'photo'} className="w-full h-28 object-cover rounded border" />
                    </a>
                  ))}
                </div>
                {/* Videos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {attachments.filter(a => a.kind === 'video' || (a.mimeType || '').startsWith('video/')).map((a, idx) => (
                    <video key={`vd-${idx}`} src={toAbsoluteUrl(a.url)} controls className="w-full rounded border" />
                  ))}
                </div>
                {/* Audio */}
                <div className="space-y-2">
                  {attachments.filter(a => a.kind === 'audio' || (a.mimeType || '').startsWith('audio/')).map((a, idx) => (
                    <audio key={`au-${idx}`} src={toAbsoluteUrl(a.url)} controls className="w-full" />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Close</Button>
        {canManageWorkOrder && (
          <Button onClick={onEdit}>Edit</Button>
        )}
      </DialogFooter>
    </DialogContent>
  )
}

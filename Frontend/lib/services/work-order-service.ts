import { apiFetch } from '@/lib/api'
import { API_BASE, getAccessToken } from '@/lib/api'

// Helpers to map backend enums to frontend strings
function mapPriority(p?: string) {
  switch ((p || '').toUpperCase()) {
    case 'HIGH': return 'high'
    case 'LOW': return 'low'
    default: return 'medium'
  }
}

function mapStatus(s?: string) {
  switch ((s || '').toUpperCase()) {
    case 'IN_PROGRESS': return 'in-progress'
    case 'PAUSED': return 'paused'
    case 'COMPLETED': return 'completed'
    default: return 'pending'
  }
}

export class WorkOrderService {
  static async getWorkOrders() {
    const res = await apiFetch('/work-orders', { method: 'GET' })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `Failed to load work orders (${res.status})`)
    }
    const data = await res.json()
    const items = Array.isArray(data?.items) ? data.items : []
    return items.map((it: any) => ({
      id: it.id,
      title: it.title,
      description: it.description || '',
      priority: mapPriority(it.priority),
      status: mapStatus(it.status),
      assignedTo: it.assignedToName || '',
      assignedToId: it.assignedToId || '',
      dueDate: it.dueDate ? new Date(it.dueDate) : null,
      createdAt: it.createdAt ? new Date(it.createdAt) : null,
      asset: it.assetName || undefined,
      assetId: it.assetId || '',
    }))
  }

  static async createWorkOrder(workOrder: any) {
    const payload = {
      title: workOrder.title,
      description: workOrder.description,
      priority: workOrder.priority,
      status: workOrder.status,
      assignedToId: workOrder.assignedToId || null,
      assignedToName: workOrder.assignedToName || workOrder.assignedTo || null,
      dueDate: workOrder.dueDate ? new Date(workOrder.dueDate).toISOString() : null,
      assetId: workOrder.assetId || null,
      assetName: workOrder.asset || null,
    }
    const res = await apiFetch('/work-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `Failed to create work order (${res.status})`)
    }
    const data = await res.json()
    return { success: true, id: data?.id as string }
  }

  static async updateWorkOrder(id: string, updates: any) {
    const payload: any = {}
    if (updates.title !== undefined) payload.title = updates.title
    if (updates.description !== undefined) payload.description = updates.description
    if (updates.priority !== undefined) payload.priority = updates.priority
    if (updates.status !== undefined) payload.status = updates.status
    if (updates.assignedToId !== undefined) payload.assignedToId = updates.assignedToId
    if (updates.assignedToName !== undefined || updates.assignedTo !== undefined) payload.assignedToName = updates.assignedToName ?? updates.assignedTo
    if (updates.dueDate !== undefined) payload.dueDate = updates.dueDate ? new Date(updates.dueDate).toISOString() : null
    if (updates.assetId !== undefined) payload.assetId = updates.assetId
    if (updates.asset !== undefined) payload.assetName = updates.asset

    const res = await apiFetch(`/work-orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `Failed to update work order (${res.status})`)
    }
    const data = await res.json()
    return { success: true, id: data?.id as string }
  }

  // Upload attachments to an issue endpoint for a work order
  static async uploadIssueFiles(workOrderId: string, files: File[], description?: string) {
    const form = new FormData()
    for (const f of files) {
      if (f.type.startsWith('image/')) form.append('photos', f)
      else if (f.type.startsWith('video/')) form.append('videos', f)
      else if (f.type.startsWith('audio/')) form.append('audio', f)
      else form.append('photos', f) // fallback: treat unknown as photo to upload
    }
    if (description) form.append('description', description)

    const token = getAccessToken()
    const res = await fetch(`${API_BASE}/work-orders/${workOrderId}/issues`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } as any : undefined,
      body: form,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `Failed to upload attachments (${res.status})`)
    }
    const data = await res.json()
    return data as { id: string, workOrderId: string, description?: string, files: { photos: any[], audio: any[], videos: any[] } }
  }
}

import { apiFetch } from '@/lib/api'

export type MissedPmDTO = {
  id: string
  taskId: string
  assetId: string
  title: string
  description?: string
  assignedToName?: string
  assignedToId?: string
  frequency: string
  scheduledDate: string
  status: 'MISSED' | 'COMPLETED_LATE'
  createdAt: string
  resolvedAt?: string
  asset?: {
    id: string
    name: string
    location?: string
  }
  task?: {
    id: string
    title: string
    frequency: string
  }
}

export class MissedPmService {
  static async list(params?: {
    assetId?: string
    from?: string
    to?: string
    status?: string
    assignedToId?: string
  }): Promise<MissedPmDTO[]> {
    const qs = new URLSearchParams()
    if (params?.assetId) qs.set('assetId', params.assetId)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.status) qs.set('status', params.status)
    if (params?.assignedToId) qs.set('assignedToId', params.assignedToId)
    const query = qs.toString() ? `?${qs.toString()}` : ''
    const res = await apiFetch(`/missed-pm${query}`)
    if (!res.ok) throw new Error('Failed to load missed preventive tasks')
    return res.json()
  }

  static async resolve(id: string): Promise<MissedPmDTO> {
    const res = await apiFetch(`/missed-pm/${id}/resolve`, { method: 'PATCH' })
    if (!res.ok) throw new Error('Failed to resolve missed record')
    return res.json()
  }
}

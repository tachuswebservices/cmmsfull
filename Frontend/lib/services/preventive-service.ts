import { apiFetch } from '@/lib/api'

export type PreventiveTaskDTO = {
  id: string
  assetId: string
  title: string
  description?: string
  assignedToName?: string
  assignedToId?: string
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
  category?: string
  lastCompleted?: string
  nextDue?: string
  createdAt?: string
}

export class PreventiveService {
  static async list(params?: { assetId?: string }): Promise<PreventiveTaskDTO[]> {
    const qs = params?.assetId ? `?assetId=${encodeURIComponent(params.assetId)}` : ''
    const res = await apiFetch(`/preventive-tasks${qs}`)
    if (!res.ok) throw new Error('Failed to load preventive tasks')
    return res.json()
  }

  static async create(input: {
    assetId: string
    title: string
    description?: string
    assignedToName?: string
    assignedToId?: string
    frequency: string
    category?: string
    nextDue?: string
    startDate?: string
  }): Promise<PreventiveTaskDTO> {
    const res = await apiFetch('/preventive-tasks', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error('Failed to create preventive task')
    return res.json()
  }

  static async update(id: string, updates: Partial<Omit<PreventiveTaskDTO, 'id' | 'createdAt'>>): Promise<PreventiveTaskDTO> {
    const res = await apiFetch(`/preventive-tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error('Failed to update preventive task')
    return res.json()
  }

  static async delete(id: string): Promise<void> {
    const res = await apiFetch(`/preventive-tasks/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok && res.status !== 204) throw new Error('Failed to delete preventive task')
  }
}

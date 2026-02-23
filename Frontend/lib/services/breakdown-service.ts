import { apiFetch } from '@/lib/api'

export type BreakdownMedia = {
  id: string
  type: 'PHOTO' | 'VIDEO' | 'AUDIO'
  path: string
  mimeType?: string
}

export type BreakdownReport = {
  id: string
  title?: string | null
  description?: string | null
  assetId?: string | null
  reportedById?: string | null
  createdAt?: string
  mediaFiles?: BreakdownMedia[]
}

export class BreakdownService {
  static async list(params?: { assetId?: string }): Promise<BreakdownReport[]> {
    const qs = params?.assetId ? `?assetId=${encodeURIComponent(params.assetId)}` : ''
    const res = await apiFetch(`/breakdown-reports${qs}`)
    if (!res.ok) throw new Error('Failed to load breakdown reports')
    const data = await res.json()
    const items = Array.isArray(data?.items) ? data.items : []
    return items
  }

  static async delete(id: string): Promise<void> {
    const res = await apiFetch(`/breakdown-reports/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    if (!res.ok && res.status !== 204) throw new Error('Failed to delete breakdown report')
  }
}

import { apiFetch } from '@/lib/api'
import { API_BASE, getAccessToken } from '@/lib/api'

function mapStatusToFrontend(s?: string) {
  switch ((s || '').toUpperCase()) {
    case 'UNDER_MAINTENANCE': return 'under-maintenance'
    case 'DECOMMISSIONED': return 'decommissioned'
    case 'INACTIVE': return 'inactive'
    case 'ACTIVE': return 'active'
    default: return 'operational'
  }
}

export class AssetService {
  static async getAssets() {
    const res = await apiFetch('/assets', { method: 'GET' })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `Failed to load assets (${res.status})`)
    }
    const data = await res.json()
    const items = Array.isArray(data?.items) ? data.items : []
    return items.map((it: any) => ({
      ...it,
      status: mapStatusToFrontend(it.status),
      purchaseDate: it.purchaseDate ? new Date(it.purchaseDate) : null,
      warrantyExpiry: it.warrantyExpiry ? new Date(it.warrantyExpiry) : null,
      lastMaintenance: it.lastMaintenance ? new Date(it.lastMaintenance) : null,
      installationDate: it.installationDate ? new Date(it.installationDate) : null,
    }))
  }

  static async getAssetById(id: string) {
    const res = await apiFetch(`/assets/${id}`, { method: 'GET' })
    if (!res.ok) {
      if (res.status === 404) return null
      const text = await res.text().catch(() => '')
      throw new Error(text || `Failed to load asset (${res.status})`)
    }
    const it = await res.json()
    return {
      ...it,
      status: mapStatusToFrontend(it.status),
      purchaseDate: it.purchaseDate ? new Date(it.purchaseDate) : null,
      warrantyExpiry: it.warrantyExpiry ? new Date(it.warrantyExpiry) : null,
      lastMaintenance: it.lastMaintenance ? new Date(it.lastMaintenance) : null,
      installationDate: it.installationDate ? new Date(it.installationDate) : null,
    }
  }

  static async createAsset(asset: any) {
    const payload: any = {
      id: asset.id || undefined,
      name: asset.name,
      description: asset.description || undefined,
      location: asset.location || undefined,
      purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString() : undefined,
      cost: asset.cost != null ? asset.cost : undefined,
      warrantyExpiry: asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toISOString() : undefined,
      status: asset.status,
      lastMaintenance: asset.lastMaintenance ? new Date(asset.lastMaintenance).toISOString() : undefined,
      installationDate: asset.installationDate ? new Date(asset.installationDate).toISOString() : undefined,
      category: asset.category || undefined,
      manufacturer: asset.manufacturer || undefined,
      model: asset.model || undefined,
      serialNumber: asset.serialNumber || undefined,
      manualUrl: asset.manualUrl || undefined,
      latitude: asset.latitude != null && asset.latitude !== '' && Number.isFinite(Number(asset.latitude)) ? Number(asset.latitude) : undefined,
      longitude: asset.longitude != null && asset.longitude !== '' && Number.isFinite(Number(asset.longitude)) ? Number(asset.longitude) : undefined,
    }
    const res = await apiFetch('/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `Failed to create asset (${res.status})`)
    }
    const data = await res.json()
    return { success: true, id: data?.id as string }
  }

  static async updateAsset(id: string, updates: any) {
    const payload: any = {}
    if (updates.name !== undefined) payload.name = updates.name
    if (updates.description !== undefined) payload.description = updates.description
    if (updates.location !== undefined) payload.location = updates.location
    if (updates.purchaseDate !== undefined) payload.purchaseDate = updates.purchaseDate ? new Date(updates.purchaseDate).toISOString() : null
    if (updates.cost !== undefined) payload.cost = updates.cost
    if (updates.warrantyExpiry !== undefined) payload.warrantyExpiry = updates.warrantyExpiry ? new Date(updates.warrantyExpiry).toISOString() : null
    if (updates.status !== undefined) payload.status = updates.status
    if (updates.lastMaintenance !== undefined) payload.lastMaintenance = updates.lastMaintenance ? new Date(updates.lastMaintenance).toISOString() : null
    if (updates.installationDate !== undefined) payload.installationDate = updates.installationDate ? new Date(updates.installationDate).toISOString() : null
    if (updates.category !== undefined) payload.category = updates.category
    if (updates.manufacturer !== undefined) payload.manufacturer = updates.manufacturer
    if (updates.model !== undefined) payload.model = updates.model
    if (updates.serialNumber !== undefined) payload.serialNumber = updates.serialNumber
    if (updates.manualUrl !== undefined) payload.manualUrl = updates.manualUrl
    if (updates.latitude !== undefined) payload.latitude = updates.latitude === '' || updates.latitude == null ? null : Number(updates.latitude)
    if (updates.longitude !== undefined) payload.longitude = updates.longitude === '' || updates.longitude == null ? null : Number(updates.longitude)

    const res = await apiFetch(`/assets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `Failed to update asset (${res.status})`)
    }
    const data = await res.json()
    return { success: true, id: data?.id as string }
  }

  static async updateAssetStatus(id: string, status: 'operational' | 'under-maintenance' | 'decommissioned' | 'active' | 'inactive') {
    const res = await apiFetch(`/assets/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `Failed to update asset status (${res.status})`)
    }
    const data = await res.json()
    return { success: true, id: data?.id as string, status: mapStatusToFrontend(data?.status) }
  }

  static async getAttachments(id: string): Promise<{ photos: any[]; documents: any[] }> {
    const res = await apiFetch(`/assets/${id}/attachments`, { method: 'GET' })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `Failed to load attachments (${res.status})`)
    }
    const data = await res.json()
    const files = data?.files || { photos: [], documents: [] }
    return files
  }

  static async uploadAttachments(id: string, files: File[]) {
    if (!files || files.length === 0) return { success: true }
    const form = new FormData()
    for (const f of files) {
      if (f.type.startsWith('image/')) form.append('photos', f)
      else if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) form.append('documents', f)
      else form.append('documents', f)
    }
    const token = getAccessToken()
    const res = await fetch(`${API_BASE}/assets/${id}/attachments`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } as any : undefined,
      body: form,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `Failed to upload attachments (${res.status})`)
    }
    const data = await res.json()
    return { success: true, ...data }
  }

  static async deleteAttachment(id: string, filename: string) {
    const res = await apiFetch(`/assets/${id}/attachments/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `Failed to delete attachment (${res.status})`)
    }
    return { success: true }
  }
}

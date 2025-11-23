import { apiFetch, API_BASE } from '@/lib/api'

export class InventoryService {
  static async getInventory() {
    const res = await apiFetch('/inventory', { method: 'GET' })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `Failed to load inventory (${res.status})`)
    }
    const data = await res.json()
    const items = Array.isArray(data?.items) ? data.items : []
    return items.map((it: any) => {
      const img = it.image || null
      const imageUrl = img && typeof img === 'string'
        ? (img.startsWith('http://') || img.startsWith('https://') ? img : `${API_BASE}${img}`)
        : null
      return {
        id: it.id,
        name: it.name,
        partNumber: it.partNumber || '',
        quantity: it.quantity ?? 0,
        reorderPoint: it.reorderPoint ?? 0,
        unitCost: it.unitCost ? Number(it.unitCost) : 0,
        supplier: it.supplier || '',
        category: it.category || '',
        location: it.location || '',
        image: imageUrl,
        assetId: it.assetId || null,
      }
    })
  }

  static async getInventoryById(id: string) {
    const res = await apiFetch(`/inventory/${id}`, { method: 'GET' })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `Failed to load inventory item (${res.status})`)
    }
    const it = await res.json()
    const img = it.image || null
    const imageUrl = img && typeof img === 'string'
      ? (img.startsWith('http://') || img.startsWith('https://') ? img : `${API_BASE}${img}`)
      : null
    return {
      id: it.id,
      name: it.name,
      partNumber: it.partNumber || '',
      quantity: it.quantity ?? 0,
      reorderPoint: it.reorderPoint ?? 0,
      unitCost: it.unitCost ? Number(it.unitCost) : 0,
      supplier: it.supplier || '',
      category: it.category || '',
      location: it.location || '',
      image: imageUrl,
      assetId: it.assetId || null,
    }
  }

  static async createInventoryItem(item: any) {
    // POST to backend to create SparePart
    const { apiFetch } = await import('@/lib/api')
    const res = await apiFetch('/inventory', {
      method: 'POST',
      body: JSON.stringify({
        name: item.name,
        partNumber: item.partNumber || null,
        quantity: item.quantity ?? 0,
        reorderPoint: item.reorderPoint ?? 0,
        unitCost: item.unitCost ?? 0,
        category: item.category || null,
        supplier: item.supplier || null,
        location: item.location || null,
        image: item.image || null,
        assetId: item.assetId || null,
      }),
    })

    if (!res.ok) {
      const message = await res.text().catch(() => res.statusText)
      throw new Error(`Failed to create spare part: ${res.status} ${message}`)
    }
    const data = await res.json()
    return { success: true, id: data.id }
  }

  static async updateInventoryItem(id: string, updates: any) {
    const payload: any = {}
    if (updates.name !== undefined) payload.name = updates.name
    if (updates.partNumber !== undefined) payload.partNumber = updates.partNumber
    if (updates.quantity !== undefined) payload.quantity = updates.quantity
    if (updates.reorderPoint !== undefined) payload.reorderPoint = updates.reorderPoint
    if (updates.unitCost !== undefined) payload.unitCost = updates.unitCost
    if (updates.category !== undefined) payload.category = updates.category
    if (updates.supplier !== undefined) payload.supplier = updates.supplier
    if (updates.location !== undefined) payload.location = updates.location
    if (updates.image !== undefined) payload.image = updates.image
    if (updates.assetId !== undefined) payload.assetId = updates.assetId

    const res = await apiFetch(`/inventory/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `Failed to update spare part (${res.status})`)
    }
    const data = await res.json()
    return { success: true, id: data?.id as string }
  }

  static async uploadInventoryImage(id: string, file: File) {
    const form = new FormData()
    form.append('image', file)
    const res = await apiFetch(`/inventory/${id}/image`, { method: 'POST', body: form })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `Failed to upload image (${res.status})`)
    }
    return res.json()
  }

  static async deleteInventoryItem(id: string) {
    const res = await apiFetch(`/inventory/${id}`, { method: 'DELETE' })
    if (!res.ok && res.status !== 204) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `Failed to delete inventory item (${res.status})`)
    }
    return { success: true }
  }
}

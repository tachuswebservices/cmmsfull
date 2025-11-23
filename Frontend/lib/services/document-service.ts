import { apiFetch, API_BASE } from '@/lib/api'

export type Unsubscribe = () => void

export type Attachment = { id: string; name: string; size: number; url: string }
export type Doc = { id: string; name: string; description?: string; createdAt: string; attachments: Attachment[] }

export class DocumentService {
  static getDocuments(): Doc[] { return docsCache.slice() }

  static subscribe(cb: (docs: Doc[]) => void): Unsubscribe {
    listeners.add(cb)
    // Initial emit
    try { cb(DocumentService.getDocuments()) } catch {}
    // Kick off fetch if cache empty
    if (docsCache.length === 0 && !isLoading) void DocumentService.refresh()
    return () => { listeners.delete(cb) }
  }

  static async refresh() {
    isLoading = true
    try {
      const res = await apiFetch('/documents', { method: 'GET' })
      if (!res.ok) throw new Error(await res.text().catch(() => res.statusText))
      const data = await res.json()
      const items = Array.isArray(data?.items) ? data.items : []
      docsCache = items.map((it: any) => normalizeDoc(it))
      notify()
    } finally {
      isLoading = false
    }
  }

  static async create(params: { description?: string; files: File[]; name?: string }) {
    const form = new FormData()
    if (params.description) form.append('description', params.description)
    if (params.name) form.append('name', params.name)
    params.files.forEach((f) => form.append('files', f))
    const res = await apiFetch('/documents', { method: 'POST', body: form })
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText)
      throw new Error(msg || 'Failed to create document')
    }
    const created = normalizeDoc(await res.json())
    docsCache = [created, ...docsCache]
    notify()
    return created
  }

  static async updateDescription(id: string, description: string) {
    const res = await apiFetch(`/documents/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    })
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText)
      throw new Error(msg || 'Failed to update document')
    }
    const updated = normalizeDoc(await res.json())
    docsCache = docsCache.map(d => d.id === id ? updated : d)
    notify()
    return updated
  }

  static async remove(id: string) {
    const res = await apiFetch(`/documents/${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!res.ok && res.status !== 204) {
      const msg = await res.text().catch(() => res.statusText)
      throw new Error(msg || 'Failed to delete document')
    }
    docsCache = docsCache.filter(d => d.id !== id)
    notify()
  }
}

function notify() { listeners.forEach(l => { try { l(DocumentService.getDocuments()) } catch {} }) }

let docsCache: Doc[] = []
let isLoading = false
const listeners = new Set<(docs: Doc[]) => void>()

function normalizeDoc(it: any): Doc {
  return {
    id: String(it.id),
    name: String(it.name || it.id || 'Document'),
    description: typeof it.description === 'string' ? it.description : undefined,
    createdAt: String(it.createdAt || new Date().toISOString()),
    attachments: Array.isArray(it.attachments) ? it.attachments.map((a: any) => ({
      id: String(a.id),
      name: String(a.name || a.id || 'file.pdf'),
      size: Number(a.size || 0),
      url: String(a.url?.startsWith('http') ? a.url : `${API_BASE}${a.url}`),
    })) : [],
  }
}

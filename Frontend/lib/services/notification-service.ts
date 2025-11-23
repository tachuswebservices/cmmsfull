import { apiFetch } from '@/lib/api'

export type NotificationItem = {
  id: string
  title: string
  body?: string
  createdAt: string
  readAt?: string | null
}

export class NotificationService {
  static async list(): Promise<{ items: NotificationItem[] }> {
    const res = await apiFetch('/notifications')
    if (!res.ok) throw new Error('Failed to load notifications')
    return res.json()
  }

  static async markRead(id: string): Promise<{ id: string; readAt: string }> {
    const res = await apiFetch(`/notifications/${id}/read`, { method: 'POST' })
    if (!res.ok) throw new Error('Failed to mark notification read')
    return res.json()
  }

  static async markAllRead(): Promise<{ message: string }> {
    const res = await apiFetch('/notifications/read-all', { method: 'POST' })
    if (!res.ok) throw new Error('Failed to mark all notifications read')
    return res.json()
  }
}

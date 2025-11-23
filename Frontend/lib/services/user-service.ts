// Mock service for users - ready for database integration
import { apiFetch } from '@/lib/api'
import { roleLabel } from '@/lib/rbac'

export class UserService {
  static async getUsers() {
    const res = await apiFetch('/users')
    if (!res.ok) throw new Error('Failed to load users')
    const data = await res.json()
    // Normalize to UI shape
    return data.items?.map((u: any) => ({
      id: u.id,
      name: u.name || '',
      email: u.email,
      phone: u.phone || '',
      role: (u.role || 'OPERATOR').toUpperCase(),
      roleLabel: roleLabel((u.role || 'OPERATOR').toUpperCase()),
      status: (u.status || 'ACTIVE').toLowerCase(),
      designation: u.designation || '',
      department: u.department || '',
      joinedDate: u.joinedDate || new Date().toISOString(),
      avatar: u.avatarUrl || '/placeholder.svg?height=48&width=48',
    })) || []
  }

  static async deactivateUser(id: string) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400))
    
    console.log('Deactivating user:', id)
    return { success: true }
  }

  static async addUser(user: any) {
    // Create user via backend
    const payload = {
      email: user.email,
      passwordHash: 'pbkdf2$demo$demo', // placeholder hash; backend will accept in scaffold
      name: user.name,
      role: (user.role || 'OPERATOR').toUpperCase(),
      phone: user.phone,
      designation: user.designation || 'New User',
      department: user.department,
      status: user.status?.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      avatarUrl: user.avatar,
      joinedDate: user.joinedDate,
    }
    const res = await apiFetch('/users', { method: 'POST', body: JSON.stringify(payload) })
    if (!res.ok) throw new Error('Failed to add user')
    const data = await res.json()
    return { id: data.id, ...user, role: payload.role }
  }

  static async updateUser(id: string, updates: any) {
    const payload: any = {
      name: updates.name,
      role: (updates.role || 'OPERATOR').toUpperCase(),
      phone: updates.phone,
      designation: updates.designation,
      department: updates.department,
      status: updates.status?.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      avatarUrl: updates.avatar,
      joinedDate: updates.joinedDate,
    }
    const res = await apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
    if (!res.ok) throw new Error('Failed to update user')
    return { success: true }
  }

  // Permission overrides API
  static async getUserPermissions(id: string): Promise<{ allow: string[]; deny: string[] }> {
    const res = await apiFetch(`/users/${id}/permissions`)
    if (!res.ok) throw new Error('Failed to load user permissions')
    const data = await res.json()
    return { allow: data.allow || [], deny: data.deny || [] }
  }

  static async updateUserPermissions(id: string, overrides: { allow: string[]; deny: string[] }) {
    const res = await apiFetch(`/users/${id}/permissions`, { method: 'PUT', body: JSON.stringify(overrides) })
    if (!res.ok) throw new Error('Failed to update user permissions')
    return await res.json()
  }

  static async deleteUser(id: string) {
    const res = await apiFetch(`/users/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete user')
    return { success: true }
  }
}

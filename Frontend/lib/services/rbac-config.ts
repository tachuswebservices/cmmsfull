import { apiFetch } from '@/lib/api'

export type RbacConfig = {
  roles: Record<string, string[]>
}

export class RbacConfigService {
  static async getRoles(): Promise<Array<{ id: string; name: string; permissions: string[] }>> {
    const res = await apiFetch('/rbac/roles')
    if (!res.ok) throw new Error('Failed to load roles')
    const data = await res.json()
    return (data?.roles || []) as Array<{ id: string; name: string; permissions: string[] }>
  }
  static async getPermissions(): Promise<string[]> {
    const res = await apiFetch('/rbac/permissions')
    if (!res.ok) throw new Error('Failed to load permissions')
    const data = await res.json()
    return (data?.permissions || []).map((p: any) => p.key)
  }

  static async getConfig(): Promise<RbacConfig> {
    const res = await apiFetch('/rbac/roles')
    if (!res.ok) throw new Error('Failed to load roles')
    const data = await res.json()
    const roles: Record<string, string[]> = {}
    for (const r of data?.roles || []) roles[r.name] = r.permissions || []
    return { roles }
  }

  static async updateConfig(next: RbacConfig): Promise<{ success: boolean }> {
    // Upsert roles and replace permissions
    const currentRes = await apiFetch('/rbac/roles')
    const current = currentRes.ok ? await currentRes.json() : { roles: [] }
    const byName: Record<string, any> = {}
    for (const r of current.roles || []) byName[r.name] = r

    // Create missing roles
    for (const name of Object.keys(next.roles)) {
      if (!byName[name]) {
        const r = await apiFetch('/rbac/roles', { method: 'POST', body: JSON.stringify({ name }) })
        if (r.ok) {
          const created = await r.json()
          byName[name] = created
        }
      }
    }
    // Replace permissions for each role
    for (const [name, keys] of Object.entries(next.roles)) {
      const id = (byName[name]?.id) as string | undefined
      if (!id) continue
      await apiFetch(`/rbac/roles/${id}/permissions`, { method: 'PUT', body: JSON.stringify({ permissionKeys: keys }) })
    }
    return { success: true }
  }

  static async addRole(name: string): Promise<{ success: boolean; role?: { id: string; name: string }; message?: string }> {
    const res = await apiFetch('/rbac/roles', { method: 'POST', body: JSON.stringify({ name }) })
    if (res.ok) {
      const role = await res.json()
      return { success: true, role }
    }
    let message = 'Failed to create role'
    try {
      const data = await res.json()
      if (data?.message) message = data.message
    } catch {}
    return { success: false, message }
  }

  static async removeRoleById(id: string) {
    const res = await apiFetch(`/rbac/roles/${id}`, { method: 'DELETE' })
    return { success: res.ok }
  }
}

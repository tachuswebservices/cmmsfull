"use client"

import { useEffect, useState } from 'react'
import { roleLabel, can, type Role } from '@/lib/rbac'
import { Check, X } from 'lucide-react'
import { UserService } from '@/lib/services/user-service'

const tabs = [
  { name: 'Dashboard', anyOf: ['kpi.viewTeam', 'kpi.viewGlobal'] as const },
  { name: 'Work Orders', anyOf: ['workOrders.request','workOrders.viewAll','workOrders.create','workOrders.approve','workOrders.assign','workOrders.close'] as const },
  { name: 'Assets', anyOf: ['assets.view','assets.edit'] as const },
  { name: 'Inventory', anyOf: ['inventory.request','inventory.manage'] as const },
  { name: 'Guide', anyOf: ['guide.view'] as const },
  { name: 'Reports', anyOf: ['downtime.analyzeTeam','downtime.analyzeCompany'] as const },
  { name: 'Users', anyOf: ['users.manageTeam','users.manageAll'] as const },
  { name: 'Settings', anyOf: ['users.manageTeam','users.manageAll'] as const },
]

export function UserPermissionsSummary({ role, userId }: { role: Role | string | undefined; userId?: string }) {
  const r = (role || '').toUpperCase() as Role | string
  const [allow, setAllow] = useState<string[]>([])
  const [deny, setDeny] = useState<string[]>([])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!userId) return
      try {
        const o = await UserService.getUserPermissions(userId)
        if (mounted) {
          setAllow(o.allow || [])
          setDeny(o.deny || [])
        }
      } catch {
        // ignore, show role-only
      }
    }
    load()
    return () => { mounted = false }
  }, [userId])

  const effective = (perms: readonly string[]) => {
    if (perms.length === 0) return true
    // Deny wins
    if (perms.some(p => deny.includes(p))) return false
    // Allow overrides
    if (perms.some(p => allow.includes(p))) return true
    // Role
    return perms.some((p) => can(r as any, p as any))
  }
  return (
    <div className="rounded-lg border bg-card">
      <div className="px-4 py-3 border-b">
        <div className="text-sm font-medium">Access & Permissions</div>
        <div className="text-xs text-muted-foreground">Role: {roleLabel(r as any)}</div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 text-sm">
        {tabs.map((t) => {
          const allowed = effective(t.anyOf)
          return (
            <div key={t.name} className="flex items-center gap-2">
              {allowed ? (
                <Check className="h-4 w-4 text-blue-600" />
              ) : (
                <X className="h-4 w-4 text-red-600" />
              )}
              <span className={allowed ? 'text-blue-700' : 'text-slate-600'}>{t.name}</span>
            </div>
          )
        })}
      </div>
      <div className="px-4 pb-3 text-xs text-muted-foreground">
        Blue = effective access. Red = no access. Inherited from role plus any saved overrides.
      </div>
    </div>
  )
}

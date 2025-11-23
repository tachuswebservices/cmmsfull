"use client"

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { XCircle, ShieldCheck } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { UserService } from '@/lib/services/user-service'
import { useAuth } from '@/components/providers/auth-provider'
import { can, type Role } from '@/lib/rbac'

type Mode = 'inherit' | 'allow' | 'deny'
type ModeGroup = { access?: Mode; add?: Mode; edit?: Mode }

// Align with Roles & Permissions and AddUserForm
const TAB_CFG: Record<string, { access?: string[]; accessAllowKey?: string; add?: string[]; edit?: string[] }> = {
  Dashboard: { access: ['kpi.viewTeam', 'kpi.viewGlobal'], accessAllowKey: 'kpi.viewTeam' },
  'Work Orders': { access: ['workOrders.request','workOrders.viewAll'], accessAllowKey: 'workOrders.viewAll', add: ['workOrders.create'], edit: ['workOrders.approve','workOrders.assign','workOrders.close'] },
  Assets: { access: ['assets.view'], add: ['assets.edit'], edit: ['assets.edit'] },
  Inventory: { access: ['inventory.request'], add: ['inventory.manage'], edit: ['inventory.manage'] },
  Guide: { access: ['guide.view'] },
  Reports: { access: ['downtime.analyzeTeam','downtime.analyzeCompany'] },
  Users: { access: ['users.manageTeam'], add: ['users.manageAll'], edit: ['users.manageAll'] },
  Settings: { access: ['users.manageTeam'], add: ['users.manageAll'], edit: ['users.manageAll'] },
}

export function UserPermissionsEditor({ userId, baseRole, onRegisterOverridesGetter }: { userId?: string; baseRole: Role | string | undefined, onRegisterOverridesGetter?: (fn: () => { allow: string[]; deny: string[] }) => void }) {
  const { toast } = useToast()
  const { user: current } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modes, setModes] = useState<Record<string, ModeGroup>>({})

  const isHighRole = (current?.role || '').toUpperCase() === 'MD' || (current?.role || '').toUpperCase() === 'COO'

  useEffect(() => {
    const init = async () => {
      try {
        // If userId is not provided (Add User form), start with inherit everywhere
        if (!userId) {
          const next: Record<string, ModeGroup> = {}
          Object.keys(TAB_CFG).forEach((tab) => (next[tab] = { access: 'inherit', add: 'inherit', edit: 'inherit' }))
          setModes(next)
          return
        }
        const { allow, deny } = await UserService.getUserPermissions(userId)
        // Build modes from overrides per category
        const next: Record<string, ModeGroup> = {}
        Object.entries(TAB_CFG).forEach(([tab, cfg]) => {
          const group: ModeGroup = {}
          // access
          const accessKeys = cfg.access || []
          const accessAllowKey = cfg.accessAllowKey
          const accessAllowHit = accessAllowKey ? allow.includes(accessAllowKey) : accessKeys.some(p => allow.includes(p))
          const accessDenyHit = accessKeys.some(p => deny.includes(p))
          group.access = accessDenyHit ? 'deny' : accessAllowHit ? 'allow' : 'inherit'
          // add
          const addKeys = cfg.add || []
          const addAllowHit = addKeys.some(p => allow.includes(p))
          const addDenyHit = addKeys.some(p => deny.includes(p))
          if (addKeys.length > 0) group.add = addDenyHit ? 'deny' : addAllowHit ? 'allow' : 'inherit'
          // edit
          const editKeys = cfg.edit || []
          const editAllowHit = editKeys.some(p => allow.includes(p))
          const editDenyHit = editKeys.some(p => deny.includes(p))
          if (editKeys.length > 0) group.edit = editDenyHit ? 'deny' : editAllowHit ? 'allow' : 'inherit'
          next[tab] = group
        })
        setModes(next)
      } catch (e: any) {
        // ignore loading error, defaults to inherit
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [userId])

  const onChange = (tab: string, key: keyof ModeGroup, val: Mode) => setModes(prev => ({ ...prev, [tab]: { ...(prev[tab] || {}), [key]: val } }))

  const toOverrides = (): { allow: string[]; deny: string[] } => {
    const allow: string[] = []
    const deny: string[] = []
    Object.entries(modes).forEach(([tab, group]) => {
      const cfg = TAB_CFG[tab]
      if (!cfg) return
      // Access
      const accessKeys = cfg.access || []
      const accessAllowKey = cfg.accessAllowKey
      const mAccess = group.access || 'inherit'
      if (mAccess === 'allow') {
        if (accessAllowKey) allow.push(accessAllowKey)
        else allow.push(...accessKeys)
      } else if (mAccess === 'deny') {
        deny.push(...accessKeys)
      }
      // Add
      const addKeys = cfg.add || []
      const mAdd = group.add || 'inherit'
      if (mAdd === 'allow') allow.push(...addKeys)
      else if (mAdd === 'deny') deny.push(...addKeys)
      // Edit
      const editKeys = cfg.edit || []
      const mEdit = group.edit || 'inherit'
      if (mEdit === 'allow') allow.push(...editKeys)
      else if (mEdit === 'deny') deny.push(...editKeys)
    })
    return { allow, deny }
  }

  // Expose a getter to the parent so it can save together with profile
  useEffect(() => {
    if (onRegisterOverridesGetter) {
      onRegisterOverridesGetter(() => toOverrides())
    }
    // it's okay to re-register when modes change
  }, [modes, onRegisterOverridesGetter])

  const reset = async () => {
    setSaving(true)
    try {
      if (userId) {
        await UserService.updateUserPermissions(userId, { allow: [], deny: [] })
      }
      // Reset UI to inherit
      const next: Record<string, ModeGroup> = {}
      Object.keys(TAB_CFG).forEach((tab) => (next[tab] = { access: 'inherit', add: 'inherit', edit: 'inherit' }))
      setModes(next)
      toast({ title: 'Overrides cleared', description: 'All tabs are now inherited from role.' })
    } catch (e: any) {
      toast({ title: 'Reset failed', description: String(e?.message || e), variant: 'destructive' as any })
    } finally {
      setSaving(false)
    }
  }

  if (!isHighRole) return null
  if (loading) return <Card><CardContent className="p-4 text-sm text-slate-600">Loading permissions…</CardContent></Card>

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Permissions Overrides</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">Choose how this user accesses each tab: inherit from role, force allow, or force deny. Now with Access, Add, Edit granularity.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(TAB_CFG).map(([tab, cfg]) => {
            const group = modes[tab] || {}
            const accessKeys = cfg.access || []
            const addKeys = cfg.add || []
            const editKeys = cfg.edit || []
            const inheritedAccess = accessKeys.length === 0 ? false : accessKeys.some((p) => can(baseRole as any, p as any))
            const inheritedAdd = addKeys.length === 0 ? false : addKeys.some((p) => can(baseRole as any, p as any))
            const inheritedEdit = editKeys.length === 0 ? false : editKeys.some((p) => can(baseRole as any, p as any))
            const effAccess = (group.access || 'inherit') === 'deny' ? false : (group.access || 'inherit') === 'allow' ? true : inheritedAccess
            const effAdd = (group.add || 'inherit') === 'deny' ? false : (group.add || 'inherit') === 'allow' ? true : inheritedAdd
            const effEdit = (group.edit || 'inherit') === 'deny' ? false : (group.edit || 'inherit') === 'allow' ? true : inheritedEdit

            return (
              <div key={tab} className="flex items-center justify-between gap-3 border rounded-md p-3">
                <div className="flex items-center gap-2">
                  {(effAccess || effAdd || effEdit) ? (
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <div className="text-sm font-medium">{tab}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={effAccess}
                      disabled={accessKeys.length === 0}
                      onCheckedChange={(checked) => {
                        if (accessKeys.length === 0) return
                        const isChecked = Boolean(checked)
                        if (isChecked) {
                          if (inheritedAccess) onChange(tab, 'access', 'inherit')
                          else onChange(tab, 'access', 'allow')
                        } else {
                          if (inheritedAccess) onChange(tab, 'access', 'deny')
                          else onChange(tab, 'access', 'inherit')
                        }
                      }}
                    />
                    <span className={`text-xs ${effAccess ? 'text-blue-700' : 'text-slate-500'}`}>Access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={effAdd}
                      disabled={addKeys.length === 0}
                      onCheckedChange={(checked) => {
                        if (addKeys.length === 0) return
                        const isChecked = Boolean(checked)
                        if (isChecked) {
                          if (inheritedAdd) onChange(tab, 'add', 'inherit')
                          else onChange(tab, 'add', 'allow')
                        } else {
                          if (inheritedAdd) onChange(tab, 'add', 'deny')
                          else onChange(tab, 'add', 'inherit')
                        }
                      }}
                    />
                    <span className={`text-xs ${effAdd ? 'text-blue-700' : 'text-slate-500'}`}>Add</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={effEdit}
                      disabled={editKeys.length === 0}
                      onCheckedChange={(checked) => {
                        if (editKeys.length === 0) return
                        const isChecked = Boolean(checked)
                        if (isChecked) {
                          if (inheritedEdit) onChange(tab, 'edit', 'inherit')
                          else onChange(tab, 'edit', 'allow')
                        } else {
                          if (inheritedEdit) onChange(tab, 'edit', 'deny')
                          else onChange(tab, 'edit', 'inherit')
                        }
                      }}
                    />
                    <span className={`text-xs ${effEdit ? 'text-blue-700' : 'text-slate-500'}`}>Edit</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={reset} disabled={saving}>Reset to Inherit</Button>
        </div>
      </CardContent>
    </Card>
  )
}

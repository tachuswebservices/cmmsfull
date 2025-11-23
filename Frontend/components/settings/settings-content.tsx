'use client'

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Settings, Bell, Shield, Building, Save, Users, Trash2, Plus } from 'lucide-react'
import { SettingsService } from '@/lib/services/settings-service'
import { apiFetch } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { Checkbox } from '@/components/ui/checkbox'
import { RbacConfigService } from '@/lib/services/rbac-config'
import { setRolePermissionsMap } from '@/lib/rbac'

export function SettingsContent() {
  const [settings, setSettings] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("general")
  const { toast } = useToast()
  // Roles & Permissions (dynamic RBAC)
  const [roles, setRoles] = useState<Array<{ id: string; name: string; permissions: string[] }>>([])
  const [allPermissions, setAllPermissions] = useState<string[]>([])
  const [filter, setFilter] = useState('')
  const [newRoleName, setNewRoleName] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true)
      const data = await SettingsService.getSettings()
      setSettings(data)
      // Load RBAC config
      try {
        const [perms, rolesData] = await Promise.all([
          RbacConfigService.getPermissions(),
          RbacConfigService.getRoles(),
        ])
        setAllPermissions(perms)
        setRoles(rolesData)
      } catch {}
      setIsLoading(false)
    }

    loadSettings()
  }, [])

  const handleSave = async (section: string, data: any) => {
    setIsSaving(true)
    try {
      await SettingsService.updateSettings(section, data)
      toast({
        title: "Settings Updated",
        description: "Your settings have been saved successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    }
    setIsSaving(false)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 rounded w-48 animate-pulse"></div>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-slate-200 rounded w-1/3"></div>
            <div className="h-4 bg-slate-200 rounded w-2/3"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                  <div className="h-10 bg-slate-200 rounded"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold ">Settings</h1>
        <p className="text-sm text-slate-600 mt-1">
          Configure system preferences and company settings
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="flex overflow-x-auto gap-1 sm:gap-2 p-1 -mx-1 sm:mx-0 scrollbar-thin">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Roles & Permissions
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building className="h-5 w-5" />
                Company Information
              </CardTitle>
              <CardDescription className="text-xs">
                Basic company details and system preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    defaultValue={settings?.general?.companyName || ""}
                    placeholder="Enter company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select defaultValue={settings?.general?.industry || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="automotive">Automotive</SelectItem>
                      <SelectItem value="textile">Textile</SelectItem>
                      <SelectItem value="chemical">Chemical</SelectItem>
                      <SelectItem value="pharmaceutical">Pharmaceutical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select defaultValue={settings?.general?.timezone || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                      <SelectItem value="Asia/Mumbai">Asia/Mumbai (IST)</SelectItem>
                      <SelectItem value="Asia/Delhi">Asia/Delhi (IST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select defaultValue={settings?.general?.currency || "INR"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">Indian Rupee (₹)</SelectItem>
                      <SelectItem value="USD">US Dollar ($)</SelectItem>
                      <SelectItem value="EUR">Euro (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-base font-medium">System Preferences</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs">Auto-assign Work Orders</Label>
                      <p className="text-xs text-slate-600">
                        Automatically assign work orders to available technicians
                      </p>
                    </div>
                    <Switch defaultChecked={settings?.general?.autoAssign || false} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs">Enable Preventive Maintenance Alerts</Label>
                      <p className="text-xs text-slate-600">
                        Send alerts for upcoming preventive maintenance tasks
                      </p>
                    </div>
                    <Switch defaultChecked={settings?.general?.preventiveAlerts || true} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs">Inventory Low Stock Alerts</Label>
                      <p className="text-xs text-slate-600">
                        Notify when inventory items reach reorder point
                      </p>
                    </div>
                    <Switch defaultChecked={settings?.general?.inventoryAlerts || true} />
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => handleSave('general', settings?.general)} 
                className="btn-hover"
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription className="text-xs">
                Configure how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-base font-medium">Email Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs">Work Order Updates</Label>
                      <p className="text-xs text-slate-600">
                        Receive emails when work orders are created or updated
                      </p>
                    </div>
                    <Switch defaultChecked={settings?.notifications?.workOrderEmails || true} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs">Maintenance Reminders</Label>
                      <p className="text-xs text-slate-600">
                        Email reminders for upcoming maintenance tasks
                      </p>
                    </div>
                    <Switch defaultChecked={settings?.notifications?.maintenanceEmails || true} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs">Inventory Alerts</Label>
                      <p className="text-xs text-slate-600">
                        Email alerts for low stock and inventory issues
                      </p>
                    </div>
                    <Switch defaultChecked={settings?.notifications?.inventoryEmails || true} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-base font-medium">Push Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs">Urgent Work Orders</Label>
                      <p className="text-xs text-slate-600">
                        Immediate notifications for high-priority work orders
                      </p>
                    </div>
                    <Switch defaultChecked={settings?.notifications?.urgentPush || true} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs">Asset Failures</Label>
                      <p className="text-xs text-slate-600">
                        Push notifications for asset breakdowns and failures
                      </p>
                    </div>
                    <Switch defaultChecked={settings?.notifications?.assetFailurePush || true} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-base font-medium">Notification Schedule</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Daily Summary Time</Label>
                    <Select defaultValue={settings?.notifications?.dailySummaryTime || "09:00"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="08:00">8:00 AM</SelectItem>
                        <SelectItem value="09:00">9:00 AM</SelectItem>
                        <SelectItem value="10:00">10:00 AM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Weekly Report Day</Label>
                    <Select defaultValue={settings?.notifications?.weeklyReportDay || "monday"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monday">Monday</SelectItem>
                        <SelectItem value="tuesday">Tuesday</SelectItem>
                        <SelectItem value="wednesday">Wednesday</SelectItem>
                        <SelectItem value="thursday">Thursday</SelectItem>
                        <SelectItem value="friday">Friday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => handleSave('notifications', settings?.notifications)} 
                className="btn-hover"
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription className="text-xs">
                Manage security preferences and access controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-base font-medium">Password Policy</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs">Require Strong Passwords</Label>
                      <p className="text-xs text-slate-600">
                        Enforce minimum 8 characters with mixed case and numbers
                      </p>
                    </div>
                    <Switch defaultChecked={settings?.security?.strongPasswords || true} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs">Password Expiry</Label>
                      <p className="text-xs text-slate-600">
                        Require users to change passwords every 90 days
                      </p>
                    </div>
                    <Switch defaultChecked={settings?.security?.passwordExpiry || false} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-base font-medium">Session Management</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Session Timeout (minutes)</Label>
                    <Select defaultValue={settings?.security?.sessionTimeout || "60"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select timeout" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                        <SelectItem value="240">4 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Max Login Attempts</Label>
                    <Select defaultValue={settings?.security?.maxLoginAttempts || "5"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select attempts" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 attempts</SelectItem>
                        <SelectItem value="5">5 attempts</SelectItem>
                        <SelectItem value="10">10 attempts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-base font-medium">Access Control</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs">Two-Factor Authentication</Label>
                      <p className="text-xs text-slate-600">
                        Require 2FA for all admin users
                      </p>
                    </div>
                    <Switch defaultChecked={settings?.security?.twoFactorAuth || false} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs">IP Restriction</Label>
                      <p className="text-xs text-slate-600">
                        Restrict access to specific IP addresses
                      </p>
                    </div>
                    <Switch defaultChecked={settings?.security?.ipRestriction || false} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs">Audit Logging</Label>
                      <p className="text-xs text-slate-600">
                        Log all user actions for security auditing
                      </p>
                    </div>
                    <Switch defaultChecked={settings?.security?.auditLogging || true} />
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => handleSave('security', settings?.security)} 
                className="btn-hover"
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles & Permissions (Dynamic) */}
        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5" />
                Manage Roles & Permissions
              </CardTitle>
              <CardDescription className="text-xs">
                Choose a role and manage its access/edit permissions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 sm:space-y-6">
              {/* Role selector and add role */}
              <div className="flex flex-col md:flex-row gap-3 md:items-end">
                <div className="flex-1 min-w-0">
                  <Label className="text-xs">Select Role</Label>
                  <Select onValueChange={(id) => setSelectedId(id)} value={selectedId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <div>
                    <Label className="text-xs">New Role Name</Label>
                    <Input placeholder="e.g. QUALITY_MANAGER" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value.toUpperCase())} />
                  </div>
                  <Button
                    onClick={async () => {
                      const name = newRoleName.trim().toUpperCase()
                      if (!name) return
                      if (roles.some(r => r.name === name)) { toast({ title: 'Role exists', description: `${name} already exists` }); return }
                      setIsCreating(true)
                      try {
                        const res = await RbacConfigService.addRole(name)
                        if (res.success) {
                          const fresh = await RbacConfigService.getRoles()
                          setRoles(fresh)
                          setNewRoleName('')
                          const createdId = res.role?.id || (fresh.find(r => r.name === name)?.id || '')
                          if (createdId) setSelectedId(createdId)
                          toast({ title: 'Role created', description: `${name} added.` })
                        } else {
                          toast({ title: 'Add role failed', description: res.message || 'Could not create role', variant: 'destructive' })
                        }
                      } catch (e) {
                        toast({ title: 'Add role failed', description: 'Unexpected error', variant: 'destructive' })
                      } finally {
                        setIsCreating(false)
                      }
                    }}
                    disabled={isCreating}
                  >
                    <Plus className="h-4 w-4 mr-2" /> {isCreating ? 'Adding…' : 'Add Role'}
                  </Button>
                </div>
              </div>

              {/* Aligned with Add User: tab rows with Access/Add/Edit */}
              {(() => {
                const role = roles.find(r => r.id === selectedId)
                if (!role) {
                  return (
                    <Card className="border-dashed">
                      <CardContent className="p-6 text-sm text-slate-600">Select a role to manage its permissions.</CardContent>
                    </Card>
                  )
                }

                const TAB_CFG: Array<{ name: string; access?: string | string[]; add?: string | string[]; edit?: string | string[] }> = [
                  { name: 'Dashboard', access: ['kpi.viewTeam', 'kpi.viewGlobal'] },
                  { name: 'Work Orders', access: ['workOrders.request', 'workOrders.viewAll'], add: 'workOrders.create', edit: ['workOrders.approve','workOrders.assign','workOrders.close'] },
                  { name: 'Assets', access: 'assets.view', add: 'assets.create', edit: 'assets.edit' },
                  { name: 'Inventory', access: 'inventory.request', add: 'inventory.create', edit: 'inventory.manage' },
                  { name: 'Guide', access: 'guide.view' },
                  { name: 'Reports', access: ['downtime.analyzeTeam','downtime.analyzeCompany'] },
                  { name: 'Users', access: 'users.manageTeam', add: 'users.create', edit: 'users.manageAll' },
                  { name: 'Settings', access: 'users.manageTeam', add: 'users.create', edit: 'users.manageAll' },
                ]

                const hasAny = (keys?: string | string[]) => {
                  if (!keys) return false
                  const arr = Array.isArray(keys) ? keys : [keys]
                  return arr.some(k => role.permissions.includes(k))
                }
                const setKeys = (keys: string | string[] | undefined, on: boolean) => {
                  if (!keys) return
                  const arr = Array.isArray(keys) ? keys : [keys]
                  setRoles(prev => prev.map(r => {
                    if (r.id !== role.id) return r
                    const set = new Set(r.permissions)
                    if (on) arr.forEach(k => set.add(k)); else arr.forEach(k => set.delete(k))
                    return { ...r, permissions: Array.from(set) }
                  }))
                }

                return (
                  <div className="overflow-auto border rounded-md">
                    <table className="min-w-[720px] w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left px-3 py-2">Name</th>
                          <th className="text-center px-3 py-2">Access</th>
                          <th className="text-center px-3 py-2">Add</th>
                          <th className="text-center px-3 py-2">Edit</th>
                          <th className="text-center px-3 py-2">Clear</th>
                        </tr>
                      </thead>
                      <tbody>
                        {TAB_CFG.map((m) => (
                          <tr key={m.name} className="border-t">
                            <td className="px-3 py-2">{m.name}</td>
                            <td className="px-3 py-2 text-center">
                              {m.access ? (
                                <Checkbox checked={hasAny(m.access)} onCheckedChange={(v) => setKeys(m.access, Boolean(v))} />
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {m.add ? (
                                <Checkbox checked={hasAny(m.add)} onCheckedChange={(v) => setKeys(m.add, Boolean(v))} />
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {m.edit ? (
                                <Checkbox checked={hasAny(m.edit)} onCheckedChange={(v) => setKeys(m.edit, Boolean(v))} />
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Button variant="outline" size="sm" onClick={() => { setKeys(m.access, false); setKeys(m.add, false); setKeys(m.edit, false) }}>Clear</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })()}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    const id = selectedId; if (!id) return
                    try {
                      await RbacConfigService.removeRoleById(id)
                      setRoles((prev) => prev.filter((x) => x.id !== id))
                      setSelectedId('')
                    } catch {}
                  }}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Role
                </Button>

                <Button
                  onClick={async () => {
                    const id = selectedId; if (!id) return
                    const role = roles.find(r => r.id === id); if (!role) return
                    try {
                      await apiFetch(`/rbac/roles/${id}/permissions`, { method: 'PUT', body: JSON.stringify({ permissionKeys: role.permissions }) })
                      // Update runtime map
                      const mapByName: Record<string, string[]> = {}
                      roles.forEach((r) => { mapByName[r.name] = r.permissions })
                      setRolePermissionsMap(mapByName as any)
                      toast({ title: 'Role updated', description: 'Permissions saved.' })
                    } catch (e) {
                      toast({ title: 'Save failed', description: 'Could not save role.', variant: 'destructive' })
                    }
                  }}
                  className="btn-hover w-full sm:w-auto"
                >
                  <Save className="h-4 w-4 mr-2" /> Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helpers for grouping and labels
function groupPermissions(all: string[], filter: string): Record<string, string[]> {
  const groups: Record<string, string[]> = {}
  const f = filter.trim().toLowerCase()
  for (const p of all) {
    if (f && !p.toLowerCase().includes(f)) continue
    const g = p.split('.')[0] || 'Other'
    if (!groups[g]) groups[g] = []
    groups[g].push(p)
  }
  // keep stable ordering
  return Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.sort()]))
}

function labelForPermission(key: string): string {
  const map: Record<string, string> = {
    'workOrders.request': 'Request Work Orders',
    'workOrders.updateStatus': 'Update Work Order Status',
    'workOrders.addNotes': 'Add Work Order Notes',
    'workOrders.viewAll': 'View All Work Orders',
    'workOrders.create': 'Create Work Orders',
    'workOrders.approve': 'Approve Work Orders',
    'workOrders.assign': 'Assign Work Orders',
    'workOrders.close': 'Close Work Orders',
    'assets.view': 'View Assets',
    'assets.edit': 'Edit Assets',
    'pm.view': 'View Preventive Maintenance',
    'pm.manage': 'Manage Preventive Maintenance',
    'breakdown.report': 'Report Breakdown',
    'breakdown.view': 'View Breakdown',
    'inventory.request': 'Request Inventory',
    'inventory.manage': 'Manage Inventory',
    'downtime.log': 'Log Downtime',
    'downtime.analyzeTeam': 'Analyze Downtime (Team)',
    'downtime.analyzeCompany': 'Analyze Downtime (Company)',
    'kpi.viewTeam': 'View KPIs (Team)',
    'kpi.viewGlobal': 'View KPIs (Global)',
    'budget.view': 'View Budget',
    'budget.approve': 'Approve Budget',
    'budget.inputMaintenanceCosts': 'Input Maintenance Costs',
    'users.manageTeam': 'Manage Users (Team)',
    'users.manageAll': 'Manage Users (All)',
    'audit.view': 'View Audit Logs',
    'audit.maintain': 'Maintain Audit Logs',
  }
  return map[key] || key
}

// Per-role table renderer: Name | Access | Add | Edit | Delete
function renderRoleTable(
  roles: Array<{ id: string; name: string; permissions: string[] }>,
  setRoles: Dispatch<SetStateAction<Array<{ id: string; name: string; permissions: string[] }>>>,
  selectedId: string,
  allPermissions: string[]
) {
  const role = roles.find(r => r.id === selectedId)
  if (!role) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-sm text-slate-600">Select a role to manage its permissions.</CardContent>
      </Card>
    )
  }

  // Align rows exactly with app tabs and include an 'add' capability for create-like actions
  const modules: Array<{ name: string; access?: string | string[]; add?: string | string[]; edit?: string | string[] }> = [
    { name: 'Dashboard', access: ['kpi.viewTeam', 'kpi.viewGlobal'] },
    { name: 'Work Orders', access: ['workOrders.request', 'workOrders.viewAll'], add: 'workOrders.create', edit: ['workOrders.approve','workOrders.assign','workOrders.close'] },
    { name: 'Assets', access: 'assets.view', add: 'assets.create', edit: 'assets.edit' },
    { name: 'Inventory', access: 'inventory.request', add: 'inventory.create', edit: 'inventory.manage' },
    { name: 'Guide', access: 'guide.view' },
    { name: 'Reports', access: ['downtime.analyzeTeam','downtime.analyzeCompany'] },
    { name: 'Users', access: 'users.manageTeam', add: 'users.create', edit: 'users.manageAll' },
    { name: 'Settings', access: 'users.manageTeam', add: 'users.create', edit: 'users.manageAll' },
  ]

  // Show all tab rows regardless of whether permission keys exist
  const rows = modules

  const hasAny = (keys?: string | string[]) => {
    if (!keys) return false
    const arr = Array.isArray(keys) ? keys : [keys]
    return arr.some(k => role.permissions.includes(k))
  }

  const setKeys = (keys: string | string[] | undefined, on: boolean) => {
    if (!keys) return
    const arr = Array.isArray(keys) ? keys : [keys]
    setRoles(prev => prev.map(r => {
      if (r.id !== role.id) return r
      const set = new Set(r.permissions)
      if (on) arr.forEach(k => set.add(k)); else arr.forEach(k => set.delete(k))
      return { ...r, permissions: Array.from(set) }
    }))
  }

  return (
    <div className="overflow-auto border rounded-md">
      <table className="min-w-[720px] w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left px-3 py-2">Name</th>
            <th className="text-center px-3 py-2">Access</th>
            <th className="text-center px-3 py-2">Add</th>
            <th className="text-center px-3 py-2">Edit</th>
            <th className="text-center px-3 py-2">Delete</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(m => (
            <tr key={m.name} className="border-t">
              <td className="px-3 py-2">{m.name}</td>
              <td className="px-3 py-2 text-center">
                {m.access ? (
                  <Checkbox checked={hasAny(m.access)} onCheckedChange={(v) => setKeys(m.access, Boolean(v))} />
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="px-3 py-2 text-center">
                {m.add ? (
                  <Checkbox checked={hasAny(m.add)} onCheckedChange={(v) => setKeys(m.add, Boolean(v))} />
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="px-3 py-2 text-center">
                {m.edit ? (
                  <Checkbox checked={hasAny(m.edit)} onCheckedChange={(v) => setKeys(m.edit, Boolean(v))} />
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="px-3 py-2 text-center">
                <Button variant="outline" size="sm" onClick={() => { setKeys(m.access, false); setKeys(m.add, false); setKeys(m.edit, false) }}>Clear</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Mobile-friendly per-role list renderer (moved to top-level scope)
function renderRoleListMobile(
  roles: Array<{ id: string; name: string; permissions: string[] }>,
  setRoles: Dispatch<SetStateAction<Array<{ id: string; name: string; permissions: string[] }>>>,
  selectedId: string,
  allPermissions: string[]
) {
  const role = roles.find(r => r.id === selectedId)
  if (!role) {
    return (
      <div className="text-sm text-slate-600">Select a role to manage its permissions.</div>
    )
  }

  // Align rows exactly with app tabs
  const modules: Array<{ name: string; access?: string | string[]; add?: string | string[]; edit?: string | string[] }> = [
    { name: 'Dashboard', access: ['kpi.viewTeam', 'kpi.viewGlobal'] },
    { name: 'Work Orders', access: ['workOrders.request', 'workOrders.viewAll'], add: 'workOrders.create', edit: ['workOrders.approve','workOrders.assign','workOrders.close'] },
    { name: 'Assets', access: 'assets.view', add: 'assets.edit', edit: 'assets.edit' },
    { name: 'Inventory', access: 'inventory.request', add: 'inventory.manage', edit: 'inventory.manage' },
    { name: 'Guide', access: 'guide.view' },
    { name: 'Reports', access: ['downtime.analyzeTeam','downtime.analyzeCompany'] },
    { name: 'Users', access: 'users.manageTeam', add: 'users.manageAll', edit: 'users.manageAll' },
    { name: 'Settings', access: 'users.manageTeam', add: 'users.manageAll', edit: 'users.manageAll' },
  ]

  const rows = modules

  const hasAny = (keys?: string | string[]) => {
    if (!keys) return false
    const arr = Array.isArray(keys) ? keys : [keys]
    return arr.some(k => role.permissions.includes(k))
  }

  const setKeys = (keys: string | string[] | undefined, on: boolean) => {
    if (!keys) return
    const arr = Array.isArray(keys) ? keys : [keys]
    setRoles(prev => prev.map(r => {
      if (r.id !== role.id) return r
      const set = new Set(r.permissions)
      if (on) arr.forEach(k => set.add(k)); else arr.forEach(k => set.delete(k))
      return { ...r, permissions: Array.from(set) }
    }))
  }

  return (
    <div className="space-y-3">
      {rows.map(m => (
        <div key={m.name} className="border rounded-md p-3">
          <div className="font-medium mb-2">{m.name}</div>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm">Access</span>
            {m.access ? (
              <Checkbox checked={hasAny(m.access)} onCheckedChange={(v) => setKeys(m.access, Boolean(v))} />
            ) : (
              <span className="text-slate-400 text-xs">Not applicable</span>
            )}
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm">Add</span>
            {m.add ? (
              <Checkbox checked={hasAny(m.add)} onCheckedChange={(v) => setKeys(m.add, Boolean(v))} />
            ) : (
              <span className="text-slate-400 text-xs">Not applicable</span>
            )}
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm">Edit</span>
            {m.edit ? (
              <Checkbox checked={hasAny(m.edit)} onCheckedChange={(v) => setKeys(m.edit, Boolean(v))} />
            ) : (
              <span className="text-slate-400 text-xs">Not applicable</span>
            )}
          </div>
          <div className="pt-2">
            <Button variant="outline" size="sm" className="w-full" onClick={() => { setKeys(m.access, false); setKeys(m.add, false); setKeys(m.edit, false) }}>Clear</Button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ... (rest of the code remains the same)

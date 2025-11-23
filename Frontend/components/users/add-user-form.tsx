'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserService } from '@/lib/services/user-service'
import { useToast } from '@/components/ui/use-toast'
import { ROLE_OPTIONS, setRolePermissionsMap } from '@/lib/rbac'
import { RbacConfigService } from '@/lib/services/rbac-config'
import { UserService as USvc } from '@/lib/services/user-service'
import { API_BASE, getAccessToken } from '@/lib/api'
import { Camera } from 'lucide-react'
import { UserPermissionsEditor } from '@/components/users/user-permissions-editor'

interface AddUserFormProps {
  onUserAdded: (user: any) => void;
  onCancel: () => void;
}

export function AddUserForm({ onUserAdded, onCancel }: AddUserFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [department, setDepartment] = useState('')
  const [role, setRole] = useState('OPERATOR')
  const [status, setStatus] = useState('active')
  const [avatar, setAvatar] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const { toast } = useToast()
  const overridesGetterRef = useRef<(() => { allow: string[]; deny: string[] }) | null>(null)

  // Dynamically loaded roles from backend (fallback to static if API fails)
  const [availableRoles, setAvailableRoles] = useState<string[]>([])

  useEffect(() => {
    let mounted = true
    const loadRoles = async () => {
      try {
        const roles = await RbacConfigService.getRoles()
        const names = roles.map(r => r.name?.toUpperCase?.() || r.name)
        if (!mounted) return
        setAvailableRoles(names)
        // Update runtime RBAC map so 'can()' uses backend configuration
        const mapByName: Record<string, string[]> = {}
        roles.forEach(r => { mapByName[(r.name || '').toUpperCase()] = r.permissions || [] })
        setRolePermissionsMap(mapByName as any)
        // Ensure selected role is valid; default to first role if current not present
        if (names.length > 0 && !names.includes(role.toUpperCase())) {
          setRole(names[0])
        }
      } catch {
        // ignore; will fallback to ROLE_OPTIONS
      }
    }
    loadRoles()
    return () => { mounted = false }
  }, [])

  // Build role options with a consistent, strongly-typed shape for the Select
  const roleOptions: Array<{ value: string; label: string }> =
    availableRoles.length > 0
      ? availableRoles.map((name) => ({ value: name, label: name }))
      : ROLE_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))

  // Permissions overrides will be edited via UserPermissionsEditor and retrieved on submit

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setAvatar(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newUser = {
      name,
      email,
      phone,
      department,
      role,
      status,
      designation: 'New User',
      joinedDate: new Date().toISOString(),
      avatar: avatarPreview || '/placeholder-user.jpg',
    }
    
    const addedUser = await UserService.addUser(newUser)
    // If avatar file present, upload to backend and update the user's avatar URL
    if (avatar && addedUser?.id) {
      try {
        const token = getAccessToken()
        const fd = new FormData()
        fd.append('avatar', avatar)
        const res = await fetch(`${API_BASE}/users/${addedUser.id}/avatar`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } as any : undefined,
          body: fd,
        })
        if (res.ok) {
          const data = await res.json()
          const url = data.url as string
          const absolute = url.startsWith('http') ? url : `${API_BASE}${url}`
          addedUser.avatar = absolute
        }
      } catch {
        // ignore upload failure; user still created
      }
    }
    // Apply permission overrides if any (from editor)
    try {
      const overrides = overridesGetterRef.current ? overridesGetterRef.current() : { allow: [], deny: [] }
      if ((overrides.allow?.length || 0) > 0 || (overrides.deny?.length || 0) > 0) {
        await USvc.updateUserPermissions(addedUser.id, overrides)
      }
    } catch {
      // ignore overrides failure; user still created
    }

    onUserAdded(addedUser)
    toast({
      title: "User Added",
      description: `${name} has been added to the system.`,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-5">
        <div
          className="relative h-24 w-24 rounded-full overflow-hidden group border-2 border-slate-300 ring-2 ring-white hover:ring-blue-500 transition cursor-pointer"
          onClick={() => fileRef.current?.click()}
          aria-label="Upload profile photo"
          title="Upload photo"
        >
          <img src={avatarPreview || "/placeholder-user.jpg"} alt="Avatar" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="text-white text-xs flex items-center gap-1">
              <Camera className="h-4 w-4" />
              Upload
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-sm font-medium">Profile Picture</div>
          <div className="text-xs text-slate-500">Click the photo to upload. JPG/PNG recommended.</div>
          <input ref={fileRef} id="avatar" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Rajesh Kumar" required autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="rajesh.kumar@company.in" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Maintenance" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select onValueChange={setRole} defaultValue={role} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select onValueChange={setStatus} defaultValue={status} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
      {/* Permissions Overrides - same editor as User Details */}
      <UserPermissionsEditor
        baseRole={role}
        onRegisterOverridesGetter={(fn) => { overridesGetterRef.current = fn }}
      />
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save User</Button>
      </div>
    </form>
  )
}

// no helpers

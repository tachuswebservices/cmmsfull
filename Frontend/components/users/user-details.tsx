'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserService } from '@/lib/services/user-service'
import { useToast } from '@/components/ui/use-toast'
import { Edit, Camera, Check, Trash2 } from 'lucide-react'
import { ROLE_OPTIONS, roleLabel, setRolePermissionsMap } from '@/lib/rbac'
import { RbacConfigService } from '@/lib/services/rbac-config'
import { useCan } from '@/hooks/use-permissions'
import { UserPermissionsSummary } from '@/components/users/user-permissions-summary'
import { UserPermissionsEditor } from '@/components/users/user-permissions-editor'
import { API_BASE, getAccessToken } from '@/lib/api'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface UserDetailsProps {
  user: any;
  onBack: () => void;
  onUserUpdated: (user: any) => void;
}

export function UserDetails({ user, onBack, onUserUpdated }: UserDetailsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedUser, setEditedUser] = useState(user)
  const [avatar, setAvatar] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const overridesGetterRef = useRef<(() => { allow: string[]; deny: string[] }) | null>(null)
  const { toast } = useToast()
  // Editing other users should require elevated permission mapped as 'users.manageAll'
  const canEditUsers = useCan('users.manageAll')
  const [isDeleting, setIsDeleting] = useState(false)

  // Roles from backend (fallback to static)
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  useEffect(() => {
    let mounted = true
    const loadRoles = async () => {
      try {
        const roles = await RbacConfigService.getRoles()
        const names = roles.map((r) => r.name?.toUpperCase?.() || r.name)
        if (!mounted) return
        setAvailableRoles(names)
        // Update runtime RBAC map so can() uses backend configuration
        const mapByName: Record<string, string[]> = {}
        roles.forEach((r) => { mapByName[(r.name || '').toUpperCase()] = r.permissions || [] })
        setRolePermissionsMap(mapByName as any)
      } catch {}
    }
    loadRoles()
    return () => { mounted = false }
  }, [])
  const roleOptions: Array<{ value: string; label: string }> =
    availableRoles.length > 0
      ? availableRoles.map((name) => ({ value: name, label: name }))
      : ROLE_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setAvatar(file)
      // Show instant preview
      setAvatarPreview(URL.createObjectURL(file))
      // Upload to backend
      const doUpload = async () => {
        try {
          const token = getAccessToken()
          const fd = new FormData()
          fd.append('avatar', file)
          const res = await fetch(`${API_BASE}/users/${editedUser.id}/avatar`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } as any : undefined,
            body: fd,
          })
          if (!res.ok) throw new Error('Failed to upload avatar')
          const data = await res.json()
          const url = data.url as string
          const absolute = url.startsWith('http') ? url : `${API_BASE}${url}`
          setAvatarPreview(absolute)
          setEditedUser((prev: any) => ({ ...prev, avatar: absolute }))
          toast({ title: 'Photo updated', description: 'Profile picture uploaded successfully.' })
        } catch (err: any) {
          toast({ title: 'Upload failed', description: String(err?.message || err), variant: 'destructive' as any })
        }
      }
      void doUpload()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setEditedUser({ ...editedUser, [id]: value })
  }

  const handleSelectChange = (id: string, value: string) => {
    setEditedUser({ ...editedUser, [id]: value })
  }

  const handleSave = async () => {
    const userToUpdate = { ...editedUser, avatar: avatarPreview }
    await UserService.updateUser(userToUpdate.id, userToUpdate)
    // Save permission overrides, if any
    if (overridesGetterRef.current) {
      const overrides = overridesGetterRef.current()
      try {
        await UserService.updateUserPermissions(userToUpdate.id, overrides)
      } catch (e) {
        // Non-blocking: profile already saved; you may add toast if desired
      }
    }
    onUserUpdated(userToUpdate)
    setIsEditing(false)
    toast({
      title: "User Updated",
      description: `${editedUser.name}'s details have been updated.`,
    })
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      await UserService.deleteUser(editedUser.id)
      toast({ title: 'User deleted', description: `${editedUser.name} has been removed.` })
      onBack()
    } catch (err: any) {
      toast({ title: 'Delete failed', description: String(err?.message || err), variant: 'destructive' as any })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls moved to bottom for better UX */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div className="space-y-2 flex items-center justify-center md:block">
          <div
            className={`relative h-24 w-24 md:h-28 md:w-28 lg:h-32 lg:w-32 rounded-full overflow-hidden group border-2 border-slate-300 ring-2 ring-white hover:ring-blue-500 transition ${isEditing ? 'cursor-pointer' : ''}`}
            onClick={() => {
              if (isEditing) fileInputRef.current?.click()
            }}
            aria-label="Change profile photo"
            title={isEditing ? 'Change photo' : undefined}
          >
            <img src={avatarPreview || "/placeholder.svg"} alt="Avatar" className="h-full w-full object-cover" />
            {isEditing && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="text-white text-xs flex items-center gap-1">
                  <Camera className="h-4 w-4" />
                  Change
                </div>
              </div>
            )}
          </div>
          {/* Hidden file input, triggered by clicking avatar */}
          <input
            ref={fileInputRef}
            id="avatar"
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" value={editedUser.name} onChange={handleInputChange} readOnly={!isEditing} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" value={editedUser.email} onChange={handleInputChange} readOnly={!isEditing} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" value={editedUser.phone} onChange={handleInputChange} readOnly={!isEditing} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input id="department" value={editedUser.department} onChange={handleInputChange} readOnly={!isEditing} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            {isEditing && canEditUsers ? (
              <Select onValueChange={(value) => handleSelectChange('role', value)} defaultValue={editedUser.role}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input id="role" value={roleLabel(editedUser.role)} readOnly />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            {isEditing ? (
              <Select onValueChange={(value) => handleSelectChange('status', value)} defaultValue={editedUser.status}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input id="status" value={editedUser.status} readOnly />
            )}
          </div>
        </div>
      </div>
      {/* Permissions */}
      {!isEditing && (
        <UserPermissionsSummary role={editedUser.role} userId={editedUser.id} />
      )}
      {isEditing && (
        <UserPermissionsEditor
          userId={editedUser.id}
          baseRole={editedUser.role}
          onRegisterOverridesGetter={(fn) => { overridesGetterRef.current = fn }}
        />
      )}

      {/* Bottom controls */}
      {canEditUsers && (
        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          {!isEditing ? (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isDeleting}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete user?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete {editedUser.name}'s account.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>Confirm</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button onClick={handleSave} aria-label="Save changes" title="Save changes">
                <Check className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Role-Based Access Control (RBAC) utilities for the web app (dynamic)
// Centralizes roles, permissions and helpers to check access.
// IMPORTANT: Roles are dynamic and managed from the backend Settings → Roles & Permissions.
// We keep a runtime in-memory mapping that MUST be hydrated via setRolePermissionsMap().

export type Role = string

// Permission keys are dynamic strings managed by backend. Use string type alias for flexibility.
export type Permission = string

// Runtime role -> permissions map. Starts empty and should be hydrated from backend at app startup.
let ROLE_PERMISSIONS: Record<Role, Permission[]> = {}

export function getRolePermissionsMap(): Record<Role, Permission[]> {
  return ROLE_PERMISSIONS
}

export function setRolePermissionsMap(next: Record<string, Permission[]>) {
  ROLE_PERMISSIONS = { ...next }
}

export function can(role: Role | string | undefined | null, permission: Permission): boolean {
  if (!role) return false
  const r = role.toUpperCase()
  const perms = ROLE_PERMISSIONS[r]
  return Array.isArray(perms) ? perms.includes(permission) : false
}

export const ROLE_OPTIONS: { value: Role; label: string }[] = Object.keys(ROLE_PERMISSIONS).map((key) => ({
  value: key,
  label: key
}))

export function roleLabel(role?: string | null) {
  const found = ROLE_OPTIONS.find(r => r.value === role)
  return found ? found.label : (role || 'Unknown')
}

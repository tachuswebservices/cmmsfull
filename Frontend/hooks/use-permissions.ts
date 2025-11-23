'use client'

import { useMemo } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Permission, can } from '@/lib/rbac'

export function useCan(permission: Permission) {
  const { user } = useAuth()
  return useMemo(() => {
    const allow = user?.permissionOverrides?.allow || []
    const deny = user?.permissionOverrides?.deny || []
    if (deny.includes(permission)) return false
    if (allow.includes(permission)) return true
    return can(user?.role, permission)
  }, [user?.role, user?.permissionOverrides, permission])
}

export function useHasAny(permissions: Permission[]) {
  const { user } = useAuth()
  return useMemo(() => {
    const allow = user?.permissionOverrides?.allow || []
    const deny = user?.permissionOverrides?.deny || []
    // If any is allowed and not explicitly denied, grant
    return permissions.some((p) => {
      if (deny.includes(p)) return false
      if (allow.includes(p)) return true
      return can(user?.role, p)
    })
  }, [user?.role, user?.permissionOverrides, permissions])
}

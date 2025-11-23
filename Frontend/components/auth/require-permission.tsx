'use client'

import React from 'react'
import { useHasAny } from '@/hooks/use-permissions'
import type { Permission } from '@/lib/rbac'

export function RequirePermission({ anyOf, children, fallback }: { anyOf: Permission[]; children: React.ReactNode; fallback?: React.ReactNode }) {
  const allowed = useHasAny(anyOf)
  if (!allowed) return <>{fallback ?? null}</>
  return <>{children}</>
}

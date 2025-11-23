'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { API_BASE, getAccessToken } from '@/lib/api'
import { RbacConfigService } from '@/lib/services/rbac-config'
import { setRolePermissionsMap } from '@/lib/rbac'

interface User {
  id: string
  email: string
  name: string
  role: string
  permissionOverrides?: { allow: string[]; deny: string[] }
}

interface AuthContextType {
  user: User | null
  login: (user: User, tokens?: { accessToken: string; refreshToken?: string }) => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [rbacReady, setRbacReady] = useState(false)

  useEffect(() => {
    const init = async () => {
      // Load cached user ASAP for minimal flash
      const storedUser = localStorage.getItem('cmms-user')
      if (storedUser) {
        try { setUser(JSON.parse(storedUser)) } catch {}
      }
      // Hydrate RBAC first so permission checks are accurate on first paint
      try {
        const roles = await RbacConfigService.getRoles()
        const mapByName: Record<string, string[]> = {}
        roles.forEach((r) => { mapByName[(r.name || '').toUpperCase()] = r.permissions || [] })
        setRolePermissionsMap(mapByName as any)
      } catch {
        // ignore; map stays empty if backend unavailable
      } finally {
        setRbacReady(true)
      }

      // Then hydrate user profile if token exists
      const token = getAccessToken()
      if (token) {
        try {
          const res = await fetch(`${API_BASE}/auth/profile`, { headers: { Authorization: `Bearer ${token}` } })
          if (res.ok) {
            const profile = await res.json()
            if (profile && profile.id) {
              const u = { id: profile.id, email: profile.email, name: profile.name, role: profile.role, permissionOverrides: profile.permissionOverrides }
              setUser(u)
              localStorage.setItem('cmms-user', JSON.stringify(u))
            }
          }
        } catch {}
      }

      setIsLoading(false)
    }
    init()
  }, [])

  const login = (userData: User, tokens?: { accessToken: string; refreshToken?: string }) => {
    setUser(userData)
    localStorage.setItem('cmms-user', JSON.stringify(userData))
    try {
      if (tokens?.accessToken) localStorage.setItem('cmms-token', tokens.accessToken)
      if (tokens?.refreshToken) localStorage.setItem('cmms-refresh', tokens.refreshToken)
    } catch {
      // ignore storage errors
    }
    // Re-hydrate RBAC after login to ensure latest permissions map
    ;(async () => {
      try {
        const roles = await RbacConfigService.getRoles()
        const mapByName: Record<string, string[]> = {}
        roles.forEach((r) => { mapByName[(r.name || '').toUpperCase()] = r.permissions || [] })
        setRolePermissionsMap(mapByName as any)
      } catch {}
    })()
  }

  const logout = () => {
    setUser(null)
    try {
      localStorage.removeItem('cmms-user')
      localStorage.removeItem('cmms-token')
      localStorage.removeItem('cmms-refresh')
    } catch {
      // ignore
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {/* Avoid rendering gated UI until RBAC is hydrated at least once */}
      {isLoading || !rbacReady ? null : children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

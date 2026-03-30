'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      // Load cached user ASAP for minimal flash
      const storedUser = localStorage.getItem('cmms-user')
      if (storedUser) {
        try { setUser(JSON.parse(storedUser)) } catch {}
      }

      const token = getAccessToken()
      if (token) {
        // Fetch RBAC roles and user profile in parallel (both require auth)
        try {
          const [roles, profileRes] = await Promise.all([
            RbacConfigService.getRoles(),
            fetch(`${API_BASE}/auth/profile`, { headers: { Authorization: `Bearer ${token}` } }),
          ])
          // Hydrate role → permissions map
          const mapByName: Record<string, string[]> = {}
          roles.forEach((r) => { mapByName[(r.name || '').toUpperCase()] = r.permissions || [] })
          setRolePermissionsMap(mapByName as any)
          // Hydrate user with permissionOverrides from profile
          if (profileRes.ok) {
            const profile = await profileRes.json()
            if (profile && profile.id) {
              const u = { id: profile.id, email: profile.email, name: profile.name, role: profile.role, permissionOverrides: profile.permissionOverrides }
              setUser(u)
              localStorage.setItem('cmms-user', JSON.stringify(u))
            }
          }
        } catch {}
      }

      setRbacReady(true)
      setIsLoading(false)
    }
    init()
  }, [])

  // Listen for forced logout events from api layer
  useEffect(() => {
    const handler = () => {
      logout()
      try {
        router.push('/login')
      } catch {}
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('cmms-auth-logout', handler)
      return () => window.removeEventListener('cmms-auth-logout', handler)
    }
  }, [router])

  const login = (userData: User, tokens?: { accessToken: string; refreshToken?: string }) => {
    // Store tokens first so apiFetch picks them up immediately
    try {
      if (tokens?.accessToken) localStorage.setItem('cmms-token', tokens.accessToken)
      if (tokens?.refreshToken) localStorage.setItem('cmms-refresh', tokens.refreshToken)
    } catch {}
    setUser(userData)
    localStorage.setItem('cmms-user', JSON.stringify(userData))
    // Fetch RBAC roles and full profile (with permissionOverrides) in parallel
    const accessToken = tokens?.accessToken || getAccessToken()
    ;(async () => {
      try {
        const [roles, profileRes] = await Promise.all([
          RbacConfigService.getRoles(),
          fetch(`${API_BASE}/auth/profile`, { headers: { Authorization: `Bearer ${accessToken}` } }),
        ])
        const mapByName: Record<string, string[]> = {}
        roles.forEach((r) => { mapByName[(r.name || '').toUpperCase()] = r.permissions || [] })
        setRolePermissionsMap(mapByName as any)
        if (profileRes.ok) {
          const profile = await profileRes.json()
          if (profile && profile.id) {
            const u = { id: profile.id, email: profile.email, name: profile.name, role: profile.role, permissionOverrides: profile.permissionOverrides }
            setUser(u)
            localStorage.setItem('cmms-user', JSON.stringify(u))
          }
        }
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

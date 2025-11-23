'use client'

// export const API_BASE = 'http://192.168.1.61:5000'
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE

export function getAccessToken(): string | null {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem('cmms-token') : null
  } catch {
    return null
  }
}

function getRefreshToken(): string | null {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem('cmms-refresh') : null
  } catch {
    return null
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken()
  if (!refresh) return null
  try {
    const res = await fetch(`${API_BASE}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const newAccess = data.accessToken as string | undefined
    if (newAccess) {
      localStorage.setItem('cmms-token', newAccess)
      return newAccess
    }
  } catch {
    // ignore
  }
  return null
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  // Build headers with any current token
  let token = getAccessToken()
  let headers = new Headers(options.headers || {})
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  if (!headers.has('Content-Type') && options.body && !isFormData) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  // If unauthorized or missing auth, try refresh once
  if (res.status === 401 || res.status === 403) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      token = refreshed
      headers = new Headers(options.headers || {})
      const isFormDataRetry = typeof FormData !== 'undefined' && options.body instanceof FormData
      if (!headers.has('Content-Type') && options.body && !isFormDataRetry) headers.set('Content-Type', 'application/json')
      headers.set('Authorization', `Bearer ${token}`)
      res = await fetch(`${API_BASE}${path}`, { ...options, headers })
    }
  }

  return res
}


'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Wrench, AlertCircle } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/hooks/use-toast'
import { API_BASE } from '@/lib/api'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { login } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // Create a friendly, user-facing error message based on response
  const toFriendlyLoginError = (status?: number, message?: string) => {
    const msg = (message || '').toLowerCase()
    if (status === 400 || status === 401) return 'Incorrect email or password.'
    if (status === 403 || msg.includes('disabled') || msg.includes('blocked')) return 'Your account is disabled. Please contact support.'
    if (status === 404 || msg.includes('not found') || msg.includes('no user')) return 'Account not found.'
    if (status === 422 || msg.includes('validation')) return 'Please enter a valid email and password.'
    if (status === 429 || msg.includes('too many')) return 'Too many attempts. Please try again in a few minutes.'
    if ((status || 0) >= 500) return 'Server error. Please try again later.'
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed')) return 'Network error. Check your internet connection and try again.'
    // Fallback
    return 'Couldn’t sign you in. Please check your details and try again.'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()

    try {
      // Call backend login
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword })
      })
      if (!res.ok) {
        // Try to parse JSON error first
        let msg = ''
        try {
          const contentType = res.headers.get('content-type') || ''
          if (contentType.includes('application/json')) {
            const j = await res.json()
            msg = j?.message || j?.error || ''
          } else {
            msg = await res.text()
          }
        } catch {
          // ignore
        }
        const friendly = toFriendlyLoginError(res.status, msg)
        throw new Error(friendly)
      }
      const data = await res.json()
      const accessToken: string = data.accessToken
      const refreshToken: string | undefined = data.refreshToken

      // Fetch profile (optional)
      let profile: any = null
      try {
        const p = await fetch(`${API_BASE}/auth/profile`, { headers: { Authorization: `Bearer ${accessToken}` } })
        if (p.ok) profile = await p.json()
      } catch {}

      const user = profile || { id: 'self', email: trimmedEmail, name: 'User', role: 'operator' }
      login(user, { accessToken, refreshToken })

      toast({ title: 'Login Successful', description: 'Welcome to CMMS!' })
      router.push('/dashboard')
    } catch (err: any) {
      const raw = typeof err?.message === 'string' ? err.message : ''
      // Some environments throw TypeError on network issues
      const friendly = raw ? raw : toFriendlyLoginError(undefined, 'network error')
      setError(friendly)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-emerald-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-white p-1 rounded-full">
               <Image src="/IMH.png" alt="Logo" width={48} height={48} className="h-12 w-12 object-contain" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Digital Factory</CardTitle>
          <CardDescription>
            Empowering The Factories Of The Future
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@company.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="password123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            {error && (
              <div role="alert" aria-live="polite" className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full btn-hover" 
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-3 flex gap-2">
            <Button type="button" variant="outline" onClick={() => router.push('/login/reset-password-otp')}>
              Forgot password?
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push('/login/otp')}>
              Login with OTP
            </Button>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
            Enter valid credentials. The server verifies your email and password against the database.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


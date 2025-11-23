'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { API_BASE } from '@/lib/api'
import { useAuth } from '@/components/providers/auth-provider'
import { useRouter } from 'next/navigation'

export default function LoginWithOtpPage() {
  const [contact, setContact] = useState('') // email or phone
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'request'|'verify'>('request')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login } = useAuth()
  const router = useRouter()

  const request = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/auth/request-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contact, type: 'login' })
      })
      if (!res.ok) throw new Error('Failed to request OTP')
      setStep('verify')
    } catch (e: any) {
      setError(e.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contact, type: 'login', code })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Invalid code')
      login({ id: 'otp', email: contact.includes('@') ? contact : `${contact}@example.com`, name: 'User', role: 'operator' }, { accessToken: data.accessToken, refreshToken: data.refreshToken })
      router.push('/dashboard')
    } catch (e: any) {
      setError(e.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-emerald-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login with OTP</CardTitle>
          <CardDescription>Use email or phone</CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'request' ? (
            <form onSubmit={request} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="contact">Email or Phone</Label>
                <Input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="e.g. user@company.in or +91 98765 43210" required />
              </div>
              <Button type="submit" disabled={loading}>{loading ? 'Please wait...' : 'Send OTP'}</Button>
              {error && <p className="text-sm text-red-700">{error}</p>}
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="code">Enter OTP</Label>
                <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" required />
              </div>
              <Button type="submit" disabled={loading}>{loading ? 'Verifying...' : 'Verify & Login'}</Button>
              {error && <p className="text-sm text-red-700">{error}</p>}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { API_BASE } from '@/lib/api'

export default function ResetPinOtpPage() {
  const [contact, setContact] = useState('')
  const [code, setCode] = useState('')
  const [pin, setPin] = useState('')
  const [step, setStep] = useState<'request'|'verify'>('request')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  const request = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`${API_BASE}/auth/request-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contact, type: 'pin' }) })
      if (!res.ok) throw new Error('Failed to request OTP')
      setStep('verify')
    } catch (e: any) {
      setError(e.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const reset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`${API_BASE}/auth/reset-pin-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contact, code, newPin: pin }) })
      if (!res.ok) throw new Error('Failed to reset PIN')
      setResult('PIN reset successful. You can now login with your new PIN.')
    } catch (e: any) {
      setError(e.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset PIN (OTP)</CardTitle>
          <CardDescription>Use email or phone</CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'request' ? (
            <form onSubmit={request} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="contact">Email or Phone</Label>
                <Input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} required />
              </div>
              <Button type="submit" disabled={loading}>{loading ? 'Please wait...' : 'Send OTP'}</Button>
              {error && <p className="text-sm text-red-700">{error}</p>}
            </form>
          ) : (
            <form onSubmit={reset} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="code">OTP</Label>
                <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pin">New PIN</Label>
                <Input id="pin" type="password" value={pin} onChange={(e) => setPin(e.target.value)} required />
              </div>
              <Button type="submit" disabled={loading}>{loading ? 'Please wait...' : 'Reset PIN'}</Button>
              {error && <p className="text-sm text-red-700">{error}</p>}
              {result && <p className="text-sm text-green-700">{result}</p>}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

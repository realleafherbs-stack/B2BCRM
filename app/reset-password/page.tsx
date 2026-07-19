'use client'
import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PasswordInput } from '@/components/PasswordInput'

function ResetForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong'); return }
      router.push('/login?reset=1')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) return (
    <div className="flex flex-col gap-4">
      <p className="text-red-400">Invalid reset link.</p>
      <Link href="/forgot-password" className="text-indigo-400 hover:text-indigo-300 text-sm">Request a new one</Link>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-6">
      <div>
        <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">New Password</label>
        <PasswordInput
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-base focus:outline-none focus:border-indigo-500"
        />
      </div>
      {error && <p className="text-red-400 text-base">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg text-base font-medium disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Set new password'}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md p-8 bg-slate-900 rounded-xl border border-slate-800">
        <h1 className="text-2xl font-bold text-white mb-2">Set new password</h1>
        <Suspense>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  )
}

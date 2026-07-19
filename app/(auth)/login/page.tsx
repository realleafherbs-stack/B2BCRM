'use client'
import { signIn } from 'next-auth/react'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PasswordInput } from '@/components/PasswordInput'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const form = new FormData(e.currentTarget)
      const result = await signIn('credentials', {
        email: form.get('email'),
        password: form.get('password'),
        redirect: false,
      })
      if (result === undefined || result === null) {
        setError('Something went wrong. Please try again.')
      } else if (!result.ok) {
        setError('Invalid email or password')
      } else {
        router.push('/dashboard')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {searchParams.get('reset') && (
        <p className="text-emerald-400 text-sm mb-4">Password updated. You can sign in now.</p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">Email</label>
          <input
            name="email"
            type="email"
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-base focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">Password</label>
          <PasswordInput
            name="password"
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-base focus:outline-none focus:border-indigo-500"
          />
        </div>
        {error && <p className="text-red-400 text-base">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg text-base font-medium disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <a href="/forgot-password" className="text-slate-400 hover:text-slate-300 text-sm text-center block mt-4">
        Forgot password?
      </a>
    </>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md p-8 bg-slate-900 rounded-xl border border-slate-800">
        <h1 className="text-2xl font-bold text-white mb-8">Sign in</h1>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}

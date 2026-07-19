'use client'
import { useActionState } from 'react'
import { updateEmail, updatePassword } from '@/app/actions/account'
import { PasswordInput } from '@/components/PasswordInput'

type State = { error?: string; success?: string }
const initial: State = {}

function emailAction(_prev: State, formData: FormData) {
  return updateEmail(formData)
}
function passwordAction(_prev: State, formData: FormData) {
  return updatePassword(formData)
}

export function AccountForm({ currentEmail, role }: { currentEmail: string; role?: string }) {
  const [emailState, emailFormAction, emailPending] = useActionState(emailAction, initial)
  const [pwState, pwFormAction, pwPending] = useActionState(passwordAction, initial)

  return (
    <div className="flex flex-col gap-6">
      {/* Email */}
      <form action={emailFormAction} className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white text-lg font-semibold">Email</h2>
          {role && <span className="text-xs text-slate-500 uppercase tracking-wide">{role}</span>}
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">Email address</label>
          <input
            name="email"
            type="email"
            required
            defaultValue={currentEmail}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-base focus:outline-none focus:border-indigo-500"
          />
        </div>
        {emailState.error && <p className="text-red-400 text-sm">{emailState.error}</p>}
        {emailState.success && <p className="text-emerald-400 text-sm">{emailState.success}</p>}
        <button
          type="submit"
          disabled={emailPending}
          className="self-start bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-base font-medium disabled:opacity-50"
        >
          {emailPending ? 'Saving...' : 'Update email'}
        </button>
      </form>

      {/* Password */}
      <form action={pwFormAction} className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col gap-4">
        <h2 className="text-white text-lg font-semibold">Password</h2>
        <div>
          <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">Current password</label>
          <PasswordInput
            name="currentPassword"
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-base focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">New password</label>
          <PasswordInput
            name="newPassword"
            required
            minLength={8}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-base focus:outline-none focus:border-indigo-500"
          />
        </div>
        {pwState.error && <p className="text-red-400 text-sm">{pwState.error}</p>}
        {pwState.success && <p className="text-emerald-400 text-sm">{pwState.success}</p>}
        <button
          type="submit"
          disabled={pwPending}
          className="self-start bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-base font-medium disabled:opacity-50"
        >
          {pwPending ? 'Saving...' : 'Update password'}
        </button>
      </form>
    </div>
  )
}

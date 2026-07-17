'use client'
import { useActionState } from 'react'
import { createUser } from '@/app/actions/admin'

type State = { error?: string; success?: string }
const initial: State = {}

function createUserAction(_prev: State, formData: FormData) {
  return createUser(formData)
}

export function AddUserForm() {
  const [state, formAction, pending] = useActionState(createUserAction, initial)

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h2 className="text-white text-lg font-semibold mb-4">Add User</h2>
      <form action={formAction} className="flex flex-col gap-4">
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
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-base focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">Role</label>
          <select
            name="role"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-base focus:outline-none focus:border-indigo-500"
          >
            <option value="EDITOR">Editor</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        {state.error && <p className="text-red-400 text-sm">{state.error}</p>}
        {state.success && <p className="text-emerald-400 text-sm">{state.success}</p>}
        <button
          type="submit"
          disabled={pending}
          className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg text-base font-medium disabled:opacity-50"
        >
          {pending ? 'Creating...' : 'Create User'}
        </button>
      </form>
    </div>
  )
}

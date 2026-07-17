import { prisma } from '@/lib/prisma'
import { deleteUser } from '@/app/actions/admin'
import { AddUserForm } from './AddUserForm'

export default async function UsersPage() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } })

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-6">Users</h1>

      <div className="flex flex-col gap-3 mb-8">
        {users.map((user) => (
          <div
            key={user.id}
            className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 flex justify-between items-center"
          >
            <div>
              <p className="text-white text-base">{user.email}</p>
              <p className="text-slate-500 text-sm mt-1">{user.role}</p>
            </div>
            <form action={deleteUser.bind(null, user.id)}>
              <button type="submit" className="text-red-400 hover:text-red-300 text-sm">Remove</button>
            </form>
          </div>
        ))}
      </div>

      <AddUserForm />
    </div>
  )
}

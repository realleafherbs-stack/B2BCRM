'use server'
import { prisma } from '@/lib/prisma'
import { auth, hashPassword, verifyPassword, normalizeEmail } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function updateEmail(formData: FormData): Promise<{ error?: string; success?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const email = normalizeEmail((formData.get('email') as string) ?? '')
  if (!email) return { error: 'Email is required' }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing && existing.id !== session.user.id) {
    return { error: 'That email is already in use' }
  }

  await prisma.user.update({ where: { id: session.user.id }, data: { email } })
  revalidatePath('/account')
  return { success: 'Email updated' }
}

export async function updatePassword(formData: FormData): Promise<{ error?: string; success?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const currentPassword = formData.get('currentPassword') as string
  const newPassword = formData.get('newPassword') as string

  if (!newPassword || newPassword.length < 8) {
    return { error: 'New password must be at least 8 characters' }
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user?.password) return { error: 'User not found' }

  const valid = await verifyPassword(currentPassword, user.password)
  if (!valid) return { error: 'Current password is incorrect' }

  const hashed = await hashPassword(newPassword)
  await prisma.user.update({ where: { id: session.user.id }, data: { password: hashed } })
  return { success: 'Password updated' }
}

'use server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { hashPassword, normalizeEmail } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') throw new Error('Forbidden')
}

export async function createSite(formData: FormData) {
  await requireAdmin()
  const name = formData.get('name') as string
  const slug = formData.get('slug') as string
  const revalidateUrl = formData.get('revalidateUrl') as string | null
  await prisma.site.create({
    data: {
      name,
      slug,
      apiKey: randomUUID(),
      revalidateSecret: randomUUID(),
      revalidateUrl: revalidateUrl || null,
    },
  })
  revalidatePath('/admin')
  redirect('/admin')
}

export async function deleteSite(siteId: string) {
  await requireAdmin()
  await prisma.site.delete({ where: { id: siteId } })
  revalidatePath('/admin')
  redirect('/admin')
}

export async function createTextField(formData: FormData) {
  await requireAdmin()
  const siteId = formData.get('siteId') as string
  const key = formData.get('key') as string
  const label = formData.get('label') as string
  const type = formData.get('type') as 'TEXT' | 'TEXTAREA'
  const count = await prisma.textField.count({ where: { siteId } })
  await prisma.textField.create({ data: { siteId, key, label, type, order: count } })
  revalidatePath(`/admin/sites/${siteId}`)
}

export async function deleteTextField(fieldId: string, siteId: string) {
  await requireAdmin()
  await prisma.textField.delete({ where: { id: fieldId } })
  revalidatePath(`/admin/sites/${siteId}`)
}

export async function createUser(formData: FormData): Promise<{ error?: string; success?: string }> {
  await requireAdmin()
  const email = normalizeEmail((formData.get('email') as string) ?? '')
  const password = (formData.get('password') as string) ?? ''
  const role = formData.get('role') === 'ADMIN' ? 'ADMIN' : 'EDITOR'

  if (!email) return { error: 'Email is required' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters' }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return { error: 'That email is already in use' }

  const hashed = await hashPassword(password)
  try {
    await prisma.user.create({ data: { email, password: hashed, role } })
  } catch (e) {
    // unique violation — someone created the same email between the check and here
    if ((e as { code?: string }).code === 'P2002') return { error: 'That email is already in use' }
    throw e
  }
  revalidatePath('/admin/users')
  return { success: `User ${email} created` }
}

export async function deleteUser(userId: string) {
  await requireAdmin()
  await prisma.user.delete({ where: { id: userId } })
  revalidatePath('/admin/users')
}

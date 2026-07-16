'use server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') throw new Error('Forbidden')
}

export async function updatePayperCategories(siteId: string, categories: string[]) {
  await requireAdmin()
  const cleaned = [...new Set(categories.map(c => c.trim()).filter(Boolean))]
  await prisma.site.update({ where: { id: siteId }, data: { payperCategories: cleaned } })
  revalidatePath(`/sites/${siteId}/settings`)
}

export async function regeneratePayperSecret(siteId: string) {
  await requireAdmin()
  const secret = randomBytes(20).toString('base64url')
  await prisma.site.update({ where: { id: siteId }, data: { payperWebhookSecret: secret } })
  revalidatePath(`/sites/${siteId}/settings`)
  return secret
}

export async function updatePayperSecret(siteId: string, secret: string) {
  await requireAdmin()
  const trimmed = secret.trim()
  await prisma.site.update({
    where: { id: siteId },
    data: { payperWebhookSecret: trimmed || null },
  })
  revalidatePath(`/sites/${siteId}/settings`)
}

'use server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

function toSlug(name: string) {
  const ascii = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return ascii || `cat-${Date.now()}`
}

export async function createCategory(formData: FormData) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  const siteId = formData.get('siteId') as string
  const name   = (formData.get('name') as string).trim()
  const slug   = (formData.get('slug') as string)?.trim() || toSlug(name)

  const count = await prisma.category.count({ where: { siteId } })
  await prisma.category.create({ data: { siteId, name, slug, order: count } })
  revalidatePath(`/sites/${siteId}/categories`)
}

export async function updateCategory(formData: FormData) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  const id     = formData.get('id') as string
  const siteId = formData.get('siteId') as string
  const name   = (formData.get('name') as string).trim()
  const slug   = (formData.get('slug') as string)?.trim() || toSlug(name)
  const active = formData.get('active') === 'true'

  await prisma.category.update({ where: { id }, data: { name, slug, active } })
  revalidatePath(`/sites/${siteId}/categories`)
  revalidatePath(`/sites/${siteId}/products`)
}

export async function deleteCategory(id: string, siteId: string) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
  await prisma.category.delete({ where: { id } })
  revalidatePath(`/sites/${siteId}/categories`)
  revalidatePath(`/sites/${siteId}/products`)
}

export async function reorderCategoryProducts(siteId: string, categoryId: string, orderedProductIds: string[]) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  // Every ID must actually belong to this site's category — otherwise a caller
  // could pass IDs from a different tenant and corrupt their categoryOrder.
  const owned = await prisma.product.count({
    where: { id: { in: orderedProductIds }, siteId, categoryId },
  })
  if (owned !== orderedProductIds.length) throw new Error('Invalid product IDs for this category')

  await Promise.all(orderedProductIds.map((id, index) =>
    prisma.product.update({ where: { id }, data: { categoryOrder: index } })
  ))
  revalidatePath(`/sites/${siteId}/categories`)
}
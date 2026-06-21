'use server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

function toHandle(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function parseFeatures(raw: string): string[] {
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

export async function createProduct(formData: FormData) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  const siteId      = formData.get('siteId') as string
  const name        = formData.get('name') as string
  const handle      = (formData.get('handle') as string)?.trim() || toHandle(name)
  const price       = parseFloat(formData.get('price') as string)
  const description = (formData.get('description') as string) || null
  const badge       = (formData.get('badge') as string) || null
  const image       = (formData.get('image') as string) || null
  const payperSku   = (formData.get('payperSku') as string) || null
  const cardFeatures = parseFeatures(formData.get('cardFeatures') as string ?? '')
  const features    = parseFeatures(formData.get('features') as string ?? '')

  const count = await prisma.product.count({ where: { siteId } })

  await prisma.product.create({
    data: { siteId, name, handle, price, description, badge, image, payperSku, cardFeatures, features, order: count },
  })

  revalidatePath(`/sites/${siteId}/products`)
}

export async function updateProduct(formData: FormData) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  const id          = formData.get('id') as string
  const siteId      = formData.get('siteId') as string
  const name        = formData.get('name') as string
  const handle      = (formData.get('handle') as string)?.trim() || toHandle(name)
  const price       = parseFloat(formData.get('price') as string)
  const description = (formData.get('description') as string) || null
  const badge       = (formData.get('badge') as string) || null
  const image       = (formData.get('image') as string) || null
  const payperSku   = (formData.get('payperSku') as string) || null
  const cardFeatures = parseFeatures(formData.get('cardFeatures') as string ?? '')
  const features    = parseFeatures(formData.get('features') as string ?? '')
  const active      = formData.get('active') === 'true'

  await prisma.product.update({
    where: { id },
    data: { name, handle, price, description, badge, image, payperSku, cardFeatures, features, active },
  })

  revalidatePath(`/sites/${siteId}/products`)
}

export async function toggleProductActive(id: string, siteId: string, active: boolean) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
  await prisma.product.update({ where: { id }, data: { active } })
  revalidatePath(`/sites/${siteId}/products`)
}

export async function deleteProduct(id: string, siteId: string) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
  await prisma.product.delete({ where: { id } })
  revalidatePath(`/sites/${siteId}/products`)
}

export async function syncPayperProducts(siteId: string): Promise<{ synced: number; errors: string[]; apiError?: string }> {
  const session = await auth()
  if (!session) return { synced: 0, errors: ['Unauthorized'] }

  const site = await prisma.site.findUnique({ where: { id: siteId } })
  if (!site) return { synced: 0, errors: ['Site not found'] }

  const apiKey  = process.env.PAYPER_API_KEY
  const account = process.env.PAYPER_ACCOUNT
  if (!apiKey || !account) return { synced: 0, errors: [], apiError: 'Payper credentials not configured' }

  const allowedCategories = site.payperCategories ?? []

  let res: Response
  try {
    res = await fetch('https://api.payper.co.il/get_inventories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, account }),
    })
  } catch (e: any) {
    return { synced: 0, errors: [], apiError: `Network error: ${e.message}` }
  }

  if (!res.ok) return { synced: 0, errors: [], apiError: `Payper API error: ${res.status}` }
  const data = await res.json()
  const items: any[] = Array.isArray(data) ? data : data.products ?? data.items ?? []

  let synced = 0
  const errors: string[] = []

  for (const item of items) {
    const sku      = item.product_sku ?? item.sku
    const name     = item.product_name ?? item.name
    const category = item.category_name ?? item.category
    const imageUrl = item.image_url ?? item.image
    const isActive = item.is_active === true || item.is_active === '1' || item.is_active === 'true'

    if (!sku) continue
    if (allowedCategories.length > 0 && !allowedCategories.includes(category)) continue

    try {
      const existing = await prisma.product.findFirst({ where: { siteId, payperSku: sku } })
      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            ...(name && { name }),
            ...(imageUrl && { image: imageUrl }),
          },
        })
      } else {
        let handle = (name || sku).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '') || String(Date.now())
        const base = handle
        let attempt = 1
        while (await prisma.product.findUnique({ where: { siteId_handle: { siteId, handle } } })) {
          handle = `${base}-${attempt++}`
        }
        await prisma.product.create({
          data: { siteId, handle, name: name || sku, price: 0, image: imageUrl || null, payperSku: sku, active: false },
        })
      }
      synced++
    } catch (e: any) {
      errors.push(`${sku}: ${e.message}`)
    }
  }

  revalidatePath(`/sites/${siteId}/products`)
  return { synced, errors }
}

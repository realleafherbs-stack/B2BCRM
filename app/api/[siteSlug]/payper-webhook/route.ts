import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function toHandle(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    || String(Date.now())
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params
  const site = await prisma.site.findUnique({ where: { slug: siteSlug } })
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

  const body = await req.json()
  const { identifier: _redacted, ...loggableBody } = body
  console.log('[payper-webhook] payload:', JSON.stringify(loggableBody))
  const { identifier, product_sku, product_name, price, cost, total_available_quantity, category_name, image_url, is_active } = body

  // Validate identifier
  if (site.payperWebhookSecret && identifier !== site.payperWebhookSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!product_sku) return NextResponse.json({ error: 'Missing product_sku' }, { status: 400 })

  // Filter by allowed categories (if configured). Compare trimmed — a stray space
  // on either side would otherwise silently skip every product.
  const allowedCategories = (site.payperCategories ?? []).map(c => c.trim())
  if (allowedCategories.length > 0 && !allowedCategories.includes(String(category_name ?? '').trim())) {
    return NextResponse.json({ skipped: true, reason: 'category not allowed' })
  }

  // Upsert product by payperSku
  const existing = await prisma.product.findFirst({ where: { siteId: site.id, payperSku: product_sku } })

  if (existing) {
    await prisma.product.update({
      where: { id: existing.id },
      data: {
        ...(product_name && { name: product_name }),
        ...(price != null && { price: parseFloat(price) }),
        ...(image_url && { image: image_url }),
        active: is_active === true || is_active === '1' || is_active === 'true',
      },
    })
    return NextResponse.json({ updated: existing.id })
  }

  // Create new product
  const handle = toHandle(product_name || product_sku)
  const baseHandle = handle
  let finalHandle = handle
  let attempt = 1
  while (await prisma.product.findUnique({ where: { siteId_handle: { siteId: site.id, handle: finalHandle } } })) {
    finalHandle = `${baseHandle}-${attempt++}`
  }

  const created = await prisma.product.create({
    data: {
      siteId: site.id,
      handle: finalHandle,
      name: product_name || product_sku,
      price: price != null ? parseFloat(price) : 0,
      image: image_url || null,
      payperSku: product_sku,
      active: false, // new products start inactive — admin activates
    },
  })

  return NextResponse.json({ created: created.id })
}

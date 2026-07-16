import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ siteSlug: string }> }
) {
  const { siteSlug } = await params
  const apiKey = req.headers.get('x-api-key')

  const site = await prisma.site.findUnique({ where: { slug: siteSlug } })
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  if (site.apiKey !== apiKey) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, total, shipping, discount, customer, items, coupon } = body

  if (!id || !total || !customer?.email || !items?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const customerAddress = [
    customer.address ?? `${customer.street ?? ''} ${customer.houseNumber ?? ''}${customer.apartment ? ` דירה ${customer.apartment}` : ''}`.trim(),
    customer.city ?? '',
  ].filter(Boolean).join(', ')

  const order = await prisma.order.create({
    data: {
      id,
      siteId: site.id,
      total,
      shipping: shipping ?? 0,
      discount: discount ?? 0,
      customerName: `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim(),
      customerEmail: customer.email,
      customerPhone: customer.phone ?? '',
      customerAddress,
      items,
      status: 'pending',
      ...(customer.notes ? { customerNote: customer.notes } : {}),
    },
  })

  // Increment coupon usage
  if (coupon) {
    await prisma.coupon.updateMany({
      where: { siteId: site.id, code: coupon },
      data: { usedCount: { increment: 1 } },
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true, orderId: order.id })
}

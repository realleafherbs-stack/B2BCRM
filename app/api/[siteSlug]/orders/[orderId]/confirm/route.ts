import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ siteSlug: string; orderId: string }> }
) {
  const { siteSlug, orderId } = await params
  const apiKey = req.headers.get('x-api-key')

  const site = await prisma.site.findUnique({ where: { slug: siteSlug } })
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  if (site.apiKey !== apiKey) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.siteId !== site.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (order.status === 'paid') {
    return NextResponse.json({ ok: true, already: true })
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status: 'paid' },
  })

  // Generate Payper invoice-receipt (best-effort)
  let payperDocId: string | undefined
  try {
    const items = order.items as Array<{ name: string; price: number; qty: number; variantId?: string }>
    const today = new Date()
    const dd = String(today.getDate()).padStart(2, '0')
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const yyyy = today.getFullYear()
    const dateStr = `${dd}-${mm}-${yyyy}`

    const payperRes = await fetch('https://app.payper.co.il/api/generate_invoice_receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'API_KEY': process.env.PAYPER_API_KEY! },
      body: JSON.stringify({
        api_user: process.env.PAYPER_ACCOUNT,
        casual_customer: '1',
        customer_mail: order.customerEmail,
        customer_name: order.customerName,
        customer_mobile: order.customerPhone,
        customer_address: order.customerAddress,
        document_subject: `מס' הזמנה: ${orderId}`,
        document_lang: 'hb',
        document_no_vat: 'false',
        discount: 'false',
        document_rounded: 'false',
        send_by_mail: 'true',
        order_id: orderId,
        invoice_lines: [
          ...items.map((item) => ({
            description: item.name,
            quantity: item.qty,
            price_per_unit: item.price,
            include_vat: 'true',
            ...(item.variantId ? { catalog_id: item.variantId } : {}),
          })),
          ...(order.shipping > 0 ? [{ description: 'דמי משלוח', quantity: 1, price_per_unit: order.shipping, include_vat: 'true' }] : []),
        ],
        receipt_lines: [{ payment_type: 'Cc', date: dateStr, amount: order.total }],
      }),
    })

    const payperData = await payperRes.json()
    if (payperData.result === '200' && payperData.document_id) {
      payperDocId = payperData.document_id
      await prisma.order.update({
        where: { id: orderId },
        data: { payperDocId },
      })
    } else {
      console.error('[confirm] Payper invoice failed:', payperData)
    }
  } catch (err) {
    console.error('[confirm] Payper invoice error:', err)
  }

  return NextResponse.json({ ok: true, payperDocId })
}

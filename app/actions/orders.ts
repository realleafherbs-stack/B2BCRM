'use server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function updateOrderStatus(id: string, siteId: string, status: string) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  const order = await prisma.order.findFirst({ where: { id, siteId } })
  if (!order) throw new Error('Order not found')

  await prisma.order.update({ where: { id }, data: { status } })

  console.log('[updateOrderStatus] status:', status, 'payperDocId:', order.payperDocId)
  // If switching to paid and no Payper invoice yet, generate one
  if (status === 'paid' && !order.payperDocId) {
    console.log('[updateOrderStatus] triggering Payper invoice for order:', id)
    console.log('[updateOrderStatus] PAYPER_API_KEY set:', !!process.env.PAYPER_API_KEY, '| PAYPER_ACCOUNT:', process.env.PAYPER_ACCOUNT)
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
          document_subject: `מס' הזמנה: ${order.id}`,
          document_lang: 'hb',
          document_no_vat: 'false',
          discount: 'false',
          document_rounded: 'false',
          send_by_mail: 'true',
          order_id: order.id,
          invoice_lines: [
            ...items.map(item => ({
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
      console.log('[updateOrderStatus] Payper response:', JSON.stringify(payperData))
      if (payperData.result === '200' && payperData.document_id) {
        await prisma.order.update({ where: { id }, data: { payperDocId: payperData.document_id } })
      } else {
        console.error('[updateOrderStatus] Payper invoice failed:', payperData)
      }
    } catch (err) {
      console.error('[updateOrderStatus] Payper invoice error:', err)
    }
  }

  revalidatePath(`/sites/${siteId}/orders`)
}

export async function updateOrderNote(id: string, siteId: string, shippingNote: string) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
  await prisma.order.update({ where: { id }, data: { shippingNote } })
  revalidatePath(`/sites/${siteId}/orders`)
}

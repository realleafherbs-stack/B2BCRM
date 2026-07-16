import { prisma } from '@/lib/prisma'

type InvoiceItem = { name: string; price: number; qty: number; variantId?: string }

type InvoiceOrder = {
  id: string
  total: number
  shipping: number
  discount: number
  customerName: string
  customerEmail: string
  customerPhone: string
  customerAddress: string
  items: unknown
  createdAt: Date
}

type InvoiceSite = {
  slug: string
  payperApiKey: string | null
  payperAccount: string | null
}

function formatDate(d: Date) {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}-${mm}-${d.getFullYear()}`
}

/**
 * Credentials are per-site with no env fallback: a site without its own Payper
 * account must not invoice into another site's books.
 */
function resolveCredentials(site: InvoiceSite) {
  if (!site.payperApiKey || !site.payperAccount) return null
  return { apiKey: site.payperApiKey, account: site.payperAccount }
}

function buildPayload(order: InvoiceOrder, site: InvoiceSite, account: string) {
  const items = (Array.isArray(order.items) ? order.items : []) as InvoiceItem[]
  const [firstName = '', ...restName] = order.customerName.split(' ')
  const lastName = restName.join(' ')

  return {
    api_user: account,
    woocommerce: '1',
    source: site.slug,
    casual_customer: '1',
    customer_mail: order.customerEmail,
    customer_name: order.customerName,
    customer_mobile: order.customerPhone,
    customer_address: order.customerAddress,
    document_subject: `מס' הזמנה: ${order.id}`,
    document_lang: 'hb',
    document_no_vat: 'false',
    // Lines carry VAT-inclusive prices, so the document discount must be too.
    ...(order.discount > 0 ? { discount_with_vat: order.discount } : {}),
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
      ...(order.shipping > 0
        ? [{ description: 'דמי משלוח', quantity: 1, price_per_unit: order.shipping, include_vat: 'true' }]
        : []),
    ],
    receipt_lines: [{ payment_type: 'Cc', date: formatDate(new Date()), amount: order.total }],
    order_data: {
      id: order.id,
      status: 'processing',
      currency: 'ILS',
      total: String(order.total),
      date_created: { date: order.createdAt.toISOString(), timezone_type: 3, timezone: 'Asia/Jerusalem' },
      date_paid: { date: new Date().toISOString(), timezone_type: 3, timezone: 'Asia/Jerusalem' },
      billing: {
        first_name: firstName,
        last_name: lastName,
        email: order.customerEmail,
        phone: order.customerPhone,
        address_1: order.customerAddress,
        city: '', country: 'IL',
      },
      shipping: {
        first_name: firstName,
        last_name: lastName,
        address_1: order.customerAddress,
        city: '', country: 'IL', phone: order.customerPhone,
      },
      payment_method: 'cc',
      payment_method_title: 'תשלום מאובטח בכרטיס אשראי',
      created_via: 'checkout',
    },
  }
}

/**
 * Issues a Payper invoice-receipt for a paid order and stores the document id.
 * Best-effort: returns undefined and logs rather than throwing, so callers can
 * treat invoicing as non-fatal to the payment flow.
 */
export async function generateInvoiceReceipt(
  order: InvoiceOrder,
  site: InvoiceSite,
): Promise<string | undefined> {
  const creds = resolveCredentials(site)
  if (!creds) {
    console.warn(`[payper] no Payper credentials for site "${site.slug}" — skipping invoice for order ${order.id}`)
    return undefined
  }

  try {
    const res = await fetch('https://app.payper.co.il/api/generate_invoice_receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'API_KEY': creds.apiKey },
      body: JSON.stringify(buildPayload(order, site, creds.account)),
    })

    const data = await res.json()
    if ((data.result === 200 || data.result === '200') && data.document_id) {
      const documentId = String(data.document_id)
      await prisma.order.update({ where: { id: order.id }, data: { payperDocId: documentId } })
      return documentId
    }

    console.error(`[payper] invoice failed for order ${order.id}:`, JSON.stringify(data))
    return undefined
  } catch (err) {
    console.error(`[payper] invoice error for order ${order.id}:`, err)
    return undefined
  }
}

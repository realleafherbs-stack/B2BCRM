import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import nodemailer from 'nodemailer'

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
}

async function sendOrderEmails(order: {
  id: string
  customerName: string
  customerEmail: string
  customerPhone: string
  customerAddress: string
  customerNote?: string | null
  total: number
  shipping: number
  items: unknown
}, siteName: string) {
  const items = order.items as Array<{ name: string; price: number; qty: number }>
  const adminEmail = process.env.SMTP_USER!

  const itemsHtml = items.map(i =>
    `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #eee">${i.name}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center">${i.qty}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:left">₪${(i.price * i.qty).toFixed(2)}</td>
    </tr>`
  ).join('')

  const itemsText = items.map(i => `${i.name} × ${i.qty} — ₪${(i.price * i.qty).toFixed(2)}`).join('\n')

  const summaryHtml = `
    <table dir="rtl" style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:15px">
      <thead>
        <tr style="background:#f5f5f5">
          <th style="padding:8px 12px;text-align:right">מוצר</th>
          <th style="padding:8px 12px;text-align:center">כמות</th>
          <th style="padding:8px 12px;text-align:left">מחיר</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <table dir="rtl" style="width:100%;margin-top:12px;font-family:Arial,sans-serif;font-size:15px">
      ${order.shipping > 0 ? `<tr><td style="padding:4px 12px">משלוח</td><td style="padding:4px 12px;text-align:left">₪${order.shipping.toFixed(2)}</td></tr>` : ''}
      <tr style="font-weight:bold;font-size:17px"><td style="padding:6px 12px">סה״כ</td><td style="padding:6px 12px;text-align:left">₪${order.total.toFixed(2)}</td></tr>
    </table>
  `

  const transporter = createTransporter()

  // Customer confirmation
  await transporter.sendMail({
    from: `"${siteName}" <${adminEmail}>`,
    to: order.customerEmail,
    subject: `אישור הזמנה #${order.id} — ${siteName}`,
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222">
        <h2 style="color:#1a1a1a">תודה על הזמנתך, ${order.customerName.split(' ')[0]}!</h2>
        <p>קיבלנו את הזמנתך ונשלח אותה בהקדם.</p>
        <p style="color:#777;font-size:13px">מספר הזמנה: <strong>${order.id}</strong></p>
        ${summaryHtml}
        <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
        <p style="font-size:13px;color:#777">כתובת למשלוח: ${order.customerAddress}</p>
        ${order.customerNote ? `<p style="font-size:13px;color:#777">הערות: ${order.customerNote}</p>` : ''}
        <p style="margin-top:24px">לכל שאלה ניתן לפנות אלינו בחזרה למייל זה.</p>
        <p style="color:#1a1a1a;font-weight:bold">צוות ${siteName}</p>
      </div>
    `,
  })

  // Admin notification
  await transporter.sendMail({
    from: `"${siteName} Orders" <${adminEmail}>`,
    to: adminEmail,
    subject: `הזמנה חדשה #${order.id} — ₪${order.total.toFixed(2)}`,
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222">
        <h2>הזמנה חדשה התקבלה</h2>
        <p><strong>מספר הזמנה:</strong> ${order.id}</p>
        <p><strong>לקוח:</strong> ${order.customerName}</p>
        <p><strong>אימייל:</strong> <a href="mailto:${order.customerEmail}">${order.customerEmail}</a></p>
        <p><strong>טלפון:</strong> ${order.customerPhone}</p>
        <p><strong>כתובת:</strong> ${order.customerAddress}</p>
        ${order.customerNote ? `<p><strong>הערות:</strong> ${order.customerNote}</p>` : ''}
        <hr style="margin:16px 0;border:none;border-top:1px solid #eee"/>
        ${summaryHtml}
      </div>
    `,
    text: `הזמנה חדשה #${order.id}\nלקוח: ${order.customerName}\nאימייל: ${order.customerEmail}\nטלפון: ${order.customerPhone}\nכתובת: ${order.customerAddress}\n\n${itemsText}\n\nסה״כ: ₪${order.total.toFixed(2)}`,
  })
}

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

  // Send confirmation emails (best-effort)
  try {
    await sendOrderEmails(order, site.name)
  } catch (err) {
    console.error('[confirm] Email failed:', err)
  }

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
        woocommerce: '1',
        source: siteSlug,
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
        order_data: {
          id: orderId,
          status: 'processing',
          currency: 'ILS',
          total: String(order.total),
          date_created: { date: order.createdAt.toISOString(), timezone_type: 3, timezone: 'Asia/Jerusalem' },
          date_paid: { date: new Date().toISOString(), timezone_type: 3, timezone: 'Asia/Jerusalem' },
          billing: {
            first_name: order.customerName.split(' ')[0] ?? '',
            last_name: order.customerName.split(' ').slice(1).join(' ') ?? '',
            email: order.customerEmail,
            phone: order.customerPhone,
            address_1: order.customerAddress,
            city: '', country: 'IL',
          },
          shipping: {
            first_name: order.customerName.split(' ')[0] ?? '',
            last_name: order.customerName.split(' ').slice(1).join(' ') ?? '',
            address_1: order.customerAddress,
            city: '', country: 'IL', phone: order.customerPhone,
          },
          payment_method: 'cc',
          payment_method_title: 'תשלום מאובטח בכרטיס אשראי',
          created_via: 'checkout',
        },
      }),
    })

    const payperData = await payperRes.json()
    if ((payperData.result === 200 || payperData.result === '200') && payperData.document_id) {
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

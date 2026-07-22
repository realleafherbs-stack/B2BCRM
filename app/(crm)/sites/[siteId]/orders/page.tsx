import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { OrderRow } from '@/components/order-row'

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ siteId: string }>
}) {
  const { siteId } = await params
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { name: true },
  })
  if (!site) notFound()

  const orders = await prisma.order.findMany({
    where: { siteId },
    orderBy: { createdAt: 'desc' },
  })

  // "Paid" is the only real order — an order the customer actually paid for,
  // which is also what triggers the Payper invoice. Everything else is an
  // unpaid/abandoned checkout that never completed payment.
  const paidOrders = orders.filter(o => o.status === 'paid')
  const unpaidOrders = orders.filter(o => o.status !== 'paid')

  const toRow = (order: (typeof orders)[number]) => ({
    ...order,
    items: order.items as Array<{ name: string; price: number; qty: number }>,
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Orders — {site.name}</h1>
        <span className="text-slate-500 text-sm">{paidOrders.length} paid</span>
      </div>

      {paidOrders.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-12 text-center text-slate-500">
          No paid orders yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {paidOrders.map((order) => (
            <OrderRow key={order.id} order={toRow(order)} siteId={siteId} />
          ))}
        </div>
      )}

      {unpaidOrders.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-300 select-none">
            Awaiting payment — {unpaidOrders.length} unpaid checkout{unpaidOrders.length === 1 ? '' : 's'} (abandoned or not yet confirmed)
          </summary>
          <p className="text-xs text-slate-600 mt-2 mb-3">
            These never completed payment. If a customer actually paid but the order got stuck here, use “Confirm &amp; invoice” to mark it paid and send the Payper invoice.
          </p>
          <div className="flex flex-col gap-3 opacity-75">
            {unpaidOrders.map((order) => (
              <OrderRow key={order.id} order={toRow(order)} siteId={siteId} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

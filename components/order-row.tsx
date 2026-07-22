'use client'
import { useState, useTransition } from 'react'
import { updateOrderStatus, updateOrderNote } from '@/app/actions/orders'

type OrderItem = { name: string; price: number; qty: number }

type Order = {
  id: string
  status: string
  total: number
  shipping: number
  customerName: string
  customerEmail: string
  customerPhone: string
  customerAddress: string
  items: OrderItem[]
  payperDocId: string | null
  customerNote: string | null
  shippingNote: string | null
  createdAt: Date
}

export function OrderRow({ order, siteId }: { order: Order; siteId: string }) {
  const [pending, startTransition] = useTransition()
  const [note, setNote] = useState(order.shippingNote ?? '')
  const [editingNote, setEditingNote] = useState(false)

  const isPaid = order.status === 'paid'
  const invoiced = Boolean(order.payperDocId)

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-0.5">
          <span className="text-white font-semibold font-mono text-sm">{order.id}</span>
          <span className="text-slate-400 text-sm">{order.customerName} · <a href={`mailto:${order.customerEmail}`} className="hover:text-indigo-400">{order.customerEmail}</a></span>
          {order.customerPhone && <span className="text-slate-500 text-xs">{order.customerPhone}</span>}
          {order.customerAddress && <span className="text-slate-500 text-xs">{order.customerAddress}</span>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isPaid ? (
            invoiced ? (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-300 border border-green-700">
                Invoiced ✓
              </span>
            ) : (
              <button
                onClick={() => startTransition(() => updateOrderStatus(order.id, siteId, 'paid'))}
                disabled={pending}
                className="px-3 py-1 rounded-full text-xs font-medium bg-amber-900/30 text-amber-300 border border-amber-700 hover:bg-amber-900/50 disabled:opacity-50"
                title="Not sent to Payper yet — click to send the invoice"
              >
                {pending ? 'Sending…' : 'Send invoice'}
              </button>
            )
          ) : (
            <button
              onClick={() => startTransition(() => updateOrderStatus(order.id, siteId, 'paid'))}
              disabled={pending}
              className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
              title="Mark this order paid and send the Payper invoice"
            >
              {pending ? 'Confirming…' : 'Confirm & invoice'}
            </button>
          )}
          <span className="text-white font-bold text-lg">₪{order.total.toFixed(2)}</span>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-3 flex flex-col gap-1">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-slate-300">{item.name} × {item.qty}</span>
            <span className="text-slate-400">₪{(item.price * item.qty).toFixed(2)}</span>
          </div>
        ))}
        {order.shipping > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Shipping</span>
            <span className="text-slate-400">₪{order.shipping.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Customer order notes (read-only) + internal tracking note */}
      <div className="border-t border-slate-800 pt-3 flex flex-col gap-2">
        {order.customerNote && (
          <p className="text-xs text-amber-400">💬 הערת לקוח: {order.customerNote}</p>
        )}
        {editingNote ? (
          <div className="flex gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tracking number or internal note…"
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => startTransition(async () => { await updateOrderNote(order.id, siteId, note); setEditingNote(false) })}
              disabled={pending}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              Save
            </button>
            <button onClick={() => setEditingNote(false)} className="px-3 py-1.5 border border-slate-700 text-slate-400 rounded-lg text-sm hover:text-white">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setEditingNote(true)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            {note ? `📦 ${note}` : '+ Add tracking / note'}
          </button>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>{new Date(order.createdAt).toLocaleString('he-IL')}</span>
        {order.payperDocId && <span className="text-indigo-400">Payper: {order.payperDocId}</span>}
      </div>
    </div>
  )
}

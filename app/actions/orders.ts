'use server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { generateInvoiceReceipt } from '@/lib/payper'
import { revalidatePath } from 'next/cache'

export async function updateOrderStatus(id: string, siteId: string, status: string) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  const order = await prisma.order.findFirst({ where: { id, siteId }, include: { site: true } })
  if (!order) throw new Error('Order not found')

  await prisma.order.update({ where: { id }, data: { status } })

  // If switching to paid and no Payper invoice yet, generate one
  if (status === 'paid' && !order.payperDocId) {
    await generateInvoiceReceipt(order, order.site)
  }

  revalidatePath(`/sites/${siteId}/orders`)
}

export async function updateOrderNote(id: string, siteId: string, shippingNote: string) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
  await prisma.order.update({ where: { id }, data: { shippingNote } })
  revalidatePath(`/sites/${siteId}/orders`)
}

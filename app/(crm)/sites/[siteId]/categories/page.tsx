import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { CategoriesClient } from '@/components/categories-client'

export default async function CategoriesPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params
  const site = await prisma.site.findUnique({ where: { id: siteId }, select: { name: true } })
  if (!site) notFound()

  const categories = await prisma.category.findMany({
    where: { siteId },
    orderBy: { order: 'asc' },
    include: { _count: { select: { products: true } } },
  })

  return <CategoriesClient categories={categories} siteId={siteId} siteName={site.name} />
}
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { CategoriesClient } from '@/components/categories-client'

export default async function CategoriesPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params
  const site = await prisma.site.findUnique({ where: { id: siteId }, select: { name: true } })
  if (!site) notFound()

  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      where: { siteId },
      orderBy: { order: 'asc' },
      include: { _count: { select: { products: true } } },
    }),
    prisma.product.findMany({
      where: { siteId },
      orderBy: { categoryOrder: 'asc' },
      select: { id: true, name: true, price: true, image: true, active: true, categoryId: true, categoryOrder: true },
    }),
  ])

  return <CategoriesClient categories={categories} products={products} siteId={siteId} siteName={site.name} />
}

import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { ProductsClient } from '@/components/products-client'

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ siteId: string }>
}) {
  const { siteId } = await params
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { name: true, slug: true },
  })
  if (!site) notFound()

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { siteId },
      orderBy: { order: 'asc' },
      include: { category: { select: { id: true, name: true } } },
    }),
    prisma.category.findMany({
      where: { siteId, active: true },
      orderBy: { order: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  return (
    <ProductsClient
      products={products}
      siteId={siteId}
      siteSlug={site.slug}
      siteName={site.name}
      categories={categories}
    />
  )
}

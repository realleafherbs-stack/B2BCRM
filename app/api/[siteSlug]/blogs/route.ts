import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey, getApiKey } from '@/lib/api-auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteSlug: string }> }
) {
  const { siteSlug } = await params
  const site = await validateApiKey(getApiKey(request))
  if (!site || site.slug !== siteSlug) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const blogs = await prisma.blogPost.findMany({
    where: { siteId: site.id, status: 'PUBLISHED' },
    select: {
      id: true, title: true, slug: true, publishedAt: true,
      featuredImage: true, metaTitle: true, metaDescription: true,
    },
    orderBy: { publishedAt: 'desc' },
  })

  return NextResponse.json(blogs)
}

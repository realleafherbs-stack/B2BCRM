import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey, getApiKey } from '@/lib/api-auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteSlug: string; blogSlug: string }> }
) {
  const { siteSlug, blogSlug } = await params
  const site = await validateApiKey(getApiKey(request))
  if (!site || site.slug !== siteSlug) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const blog = await prisma.blogPost.findUnique({
    where: { siteId_slug: { siteId: site.id, slug: blogSlug } },
  })

  if (!blog || blog.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(blog)
}

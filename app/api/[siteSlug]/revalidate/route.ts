import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteSlug: string }> }
) {
  const { siteSlug } = await params
  const { secret, paths } = await request.json()

  const site = await prisma.site.findUnique({ where: { slug: siteSlug } })
  if (!site || site.revalidateSecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!site.revalidateUrl) {
    return NextResponse.json({ revalidated: false, error: 'No revalidateUrl configured' })
  }

  const pathsToRevalidate: string[] = paths ?? ['/']
  await Promise.allSettled(
    pathsToRevalidate.map((path) =>
      fetch(`${site.revalidateUrl}/api/revalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, path }),
      })
    )
  )

  return NextResponse.json({ revalidated: true, paths: pathsToRevalidate })
}

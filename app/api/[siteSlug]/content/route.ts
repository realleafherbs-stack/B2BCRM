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

  const fields = await prisma.textField.findMany({
    where: { siteId: site.id },
    orderBy: { order: 'asc' },
    select: { key: true, value: true },
  })

  const content = Object.fromEntries(fields.map((f) => [f.key, f.value]))
  return NextResponse.json(content)
}

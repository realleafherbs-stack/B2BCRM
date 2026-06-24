import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ siteSlug: string }> }
) {
  const { siteSlug } = await params
  const productId = req.nextUrl.searchParams.get('productId')

  const site = await prisma.site.findUnique({ where: { slug: siteSlug } })
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

  const where = { siteId: site.id, approved: true, ...(productId ? { productId } : {}) }

  const reviews = await prisma.review.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, rating: true, text: true, createdAt: true },
  })

  return NextResponse.json(reviews, {
    headers: { ...CORS, 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' },
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ siteSlug: string }> }
) {
  const { siteSlug } = await params
  const body = await req.json()
  const { productId, name, rating, text } = body

  if (!productId || !name || !rating || !text) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be 1–5' }, { status: 400 })
  }

  const site = await prisma.site.findUnique({ where: { slug: siteSlug } })
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product || product.siteId !== site.id) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const review = await prisma.review.create({
    data: { siteId: site.id, productId, name: String(name).slice(0, 80), rating: Math.round(rating), text: String(text).slice(0, 2000) },
    select: { id: true, name: true, rating: true, text: true, createdAt: true },
  })

  return NextResponse.json(review, { status: 201, headers: CORS })
}
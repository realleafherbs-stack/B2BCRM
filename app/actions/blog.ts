'use server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

function toSlug(title: string): string {
  const ascii = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
  // Hebrew (and other non-ASCII) titles produce an empty string — use timestamp fallback
  return ascii || `post-${Date.now()}`
}

export async function saveBlog(formData: FormData) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  const siteId = formData.get('siteId') as string
  const id = formData.get('id') as string | null
  const title = formData.get('title') as string
  const slug = (formData.get('slug') as string) || toSlug(title)
  const body = formData.get('body') as string
  const status = formData.get('status') as 'DRAFT' | 'PUBLISHED'
  const featuredImage = formData.get('featuredImage') as string | null
  const metaTitle = formData.get('metaTitle') as string | null
  const metaDescription = formData.get('metaDescription') as string | null
  const ogImage = formData.get('ogImage') as string | null
  const tagsRaw = formData.get('tags') as string | null
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : []

  const data = {
    title,
    slug,
    body,
    status,
    featuredImage: featuredImage || null,
    metaTitle: metaTitle || null,
    metaDescription: metaDescription || null,
    ogImage: ogImage || null,
    tags,
    publishedAt: status === 'PUBLISHED' ? new Date() : null,
  }

  let blogId = id
  if (id) {
    await prisma.blogPost.update({ where: { id }, data })
  } else {
    const blog = await prisma.blogPost.create({ data: { ...data, siteId } })
    blogId = blog.id
  }

  revalidatePath(`/sites/${siteId}/blogs`)

  if (status === 'PUBLISHED') {
    const site = await prisma.site.findUnique({ where: { id: siteId } })
    if (site?.revalidateUrl) {
      await Promise.all([
        fetch(`${site.revalidateUrl}/api/revalidate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret: site.revalidateSecret, path: '/blog' }),
        }),
        fetch(`${site.revalidateUrl}/api/revalidate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret: site.revalidateSecret, path: `/blog/${slug}` }),
        }),
      ]).catch(() => {})
    }
  }

  redirect(`/sites/${siteId}/blogs/${blogId}`)
}

export async function saveBlogFromGenerator(data: {
  siteId: string
  title: string
  slug: string
  body: string
  tags: string[]
  metaTitle?: string
  metaDescription?: string
}) {
  const session = await auth()
  if (!session) return { error: 'Unauthorized' }

  try {
    const blog = await prisma.blogPost.create({
      data: {
        siteId: data.siteId,
        title: data.title,
        slug: data.slug || `post-${Date.now()}`,
        body: data.body,
        status: 'DRAFT',
        tags: data.tags ?? [],
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
      },
    })
    revalidatePath(`/sites/${data.siteId}/blogs`)
    return { blogId: blog.id, siteId: data.siteId }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('Unique constraint')) return { error: 'כתובת URL כבר קיימת — שנה את ה-Slug' }
    return { error: msg }
  }
}

export async function deleteBlog(blogId: string, siteId: string) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
  await prisma.blogPost.delete({ where: { id: blogId } })
  revalidatePath(`/sites/${siteId}/blogs`)
  redirect(`/sites/${siteId}/blogs`)
}

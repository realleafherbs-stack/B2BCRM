import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function BlogsPage({
  params,
}: {
  params: Promise<{ siteId: string }>
}) {
  const { siteId } = await params
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { id: true, name: true, revalidateUrl: true },
  })
  if (!site) notFound()

  const blogs = await prisma.blogPost.findMany({
    where: { siteId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, slug: true, status: true, publishedAt: true, createdAt: true },
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">{site.name} — Blogs</h1>
        <Link
          href={`/sites/${siteId}/blogs/new`}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-base font-medium"
        >
          + New Blog
        </Link>
      </div>

      {blogs.length === 0 && (
        <p className="text-slate-400 text-base">No blog posts yet. Create your first one.</p>
      )}

      <div className="flex flex-col gap-3">
        {blogs.map((blog: typeof blogs[number]) => (
          <div
            key={blog.id}
            className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-5 py-4"
          >
            <div>
              <Link
                href={`/sites/${siteId}/blogs/${blog.id}`}
                className="text-white text-base font-medium hover:text-indigo-400 transition-colors"
              >
                {blog.title}
              </Link>
              <p className="text-slate-500 text-sm mt-1">
                {blog.status === 'PUBLISHED' && blog.publishedAt
                  ? `Published · ${new Date(blog.publishedAt).toLocaleDateString()}`
                  : `Draft · ${new Date(blog.createdAt).toLocaleDateString()}`}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span
                className={`text-sm px-3 py-1 rounded-md ${
                  blog.status === 'PUBLISHED'
                    ? 'bg-emerald-950 text-emerald-400'
                    : 'bg-amber-950 text-amber-400'
                }`}
              >
                {blog.status === 'PUBLISHED' ? 'Published' : 'Draft'}
              </span>
              <Link
                href={`/sites/${siteId}/blogs/${blog.id}`}
                className="text-slate-400 hover:text-white text-base"
              >
                Edit →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

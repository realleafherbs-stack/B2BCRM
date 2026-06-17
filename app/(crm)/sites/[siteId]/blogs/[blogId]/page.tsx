import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { saveBlog, deleteBlog } from '@/app/actions/blog'
import { BlogEditor } from '@/components/blog-editor'
import { SeoPanel } from '@/components/seo-panel'
import { ImageUpload } from '@/components/image-upload'

export default async function EditBlogPage({
  params,
}: {
  params: Promise<{ siteId: string; blogId: string }>
}) {
  const { siteId, blogId } = await params
  const blog = await prisma.blogPost.findUnique({ where: { id: blogId } })
  if (!blog || blog.siteId !== siteId) notFound()

  return (
    <form action={saveBlog}>
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="id" value={blogId} />
      <div className="flex items-center justify-between mb-6">
        <a href={`/sites/${siteId}/blogs`} className="text-slate-400 hover:text-white text-base">
          ← Back to blogs
        </a>
        <div className="flex gap-3">
          <button name="status" value="DRAFT" className="bg-slate-800 border border-slate-700 text-white px-5 py-2.5 rounded-lg text-base hover:bg-slate-700">
            Save Draft
          </button>
          <button name="status" value="PUBLISHED" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-base">
            Publish
          </button>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_320px] gap-6 items-start">
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">Blog Title</label>
            <input
              name="title"
              required
              defaultValue={blog.title}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-lg font-semibold focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">URL Slug</label>
            <input
              name="slug"
              defaultValue={blog.slug}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-400 text-base font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">Body</label>
            <BlogEditor defaultValue={blog.body} />
          </div>
        </div>
        <div className="flex flex-col gap-5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white text-base font-semibold mb-4">📅 Publish Settings</h3>
            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">Status</label>
              <p className={`text-base px-3 py-2 rounded-lg inline-block ${blog.status === 'PUBLISHED' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}`}>
                {blog.status}
              </p>
            </div>
            <ImageUpload name="featuredImage" label="Featured Image" defaultValue={blog.featuredImage} />
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white text-base font-semibold mb-4">🔍 SEO</h3>
            <SeoPanel
              defaultMetaTitle={blog.metaTitle}
              defaultMetaDescription={blog.metaDescription}
              defaultOgImage={blog.ogImage}
            />
          </div>
          <form action={deleteBlog.bind(null, blogId, siteId)}>
            <button type="submit" className="text-red-400 hover:text-red-300 text-sm">
              Delete this post
            </button>
          </form>
        </div>
      </div>
    </form>
  )
}

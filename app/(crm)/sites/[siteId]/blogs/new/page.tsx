import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { saveBlog } from '@/app/actions/blog'
import { BlogEditor } from '@/components/blog-editor'
import { SeoPanel } from '@/components/seo-panel'
import { ImageUpload } from '@/components/image-upload'

export default async function NewBlogPage({
  params,
}: {
  params: Promise<{ siteId: string }>
}) {
  const { siteId } = await params
  const site = await prisma.site.findUnique({ where: { id: siteId } })
  if (!site) notFound()

  return (
    <form action={saveBlog}>
      <input type="hidden" name="siteId" value={siteId} />
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
              placeholder="Enter blog title..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-lg font-semibold focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">URL Slug</label>
            <input
              name="slug"
              placeholder="auto-generated from title if left empty"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-400 text-base font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">Body</label>
            <BlogEditor />
          </div>
        </div>
        <div className="flex flex-col gap-5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white text-base font-semibold mb-4">📅 Publish Settings</h3>
            <ImageUpload name="featuredImage" label="Featured Image" />
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white text-base font-semibold mb-4">🔍 SEO</h3>
            <SeoPanel />
          </div>
        </div>
      </div>
    </form>
  )
}

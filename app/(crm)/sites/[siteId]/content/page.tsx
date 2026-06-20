import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { saveTextFields } from '@/app/actions/content'
import Link from 'next/link'
import { CompareGridEditor } from '@/components/compare-grid-editor'
import { ImageUpload } from '@/components/image-upload'
import { RevalidateButton } from '@/components/revalidate-button'

const PAGE_LABELS: Record<string, string> = {
  homepage: '🏠 Homepage',
  shop:     '🛍 Shop',
  blog:     '📝 Blog',
  compare:  '⚖️ Compare',
  contact:  '📬 Contact',
  general:  '⚙️ General',
}

export default async function ContentPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { siteId } = await params
  const { page: activePage = 'homepage' } = await searchParams

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: { textFields: { orderBy: { order: 'asc' } } },
  })
  if (!site) notFound()

  const pages = [...new Set(site.textFields.map(f => f.page))].sort((a, b) => {
    const order = ['homepage', 'shop', 'blog', 'compare', 'contact', 'general']
    return order.indexOf(a) - order.indexOf(b)
  })

  const fields       = site.textFields.filter(f => f.page === activePage)
  const seoFields    = fields.filter(f => f.key.includes('.seo_'))
  const contentFields = fields.filter(f => !f.key.includes('.seo_'))

  const isImageField = (key: string) => /_image$|_bg$/.test(key)

  type Field = typeof fields[0]
  function FieldInput({ field }: { field: Field }) {
    if (isImageField(field.key)) {
      return (
        <ImageUpload
          name={field.key}
          label={field.label}
          defaultValue={field.value}
          siteSlug={site!.slug}
        />
      )
    }
    return (
      <div>
        <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">
          {field.label.replace(/^SEO — /, '')}
        </label>
        {field.type === 'TEXTAREA' ? (
          <textarea
            name={field.key}
            defaultValue={field.value}
            rows={3}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-indigo-500 resize-none"
          />
        ) : (
          <input
            name={field.key}
            defaultValue={field.value}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-indigo-500"
          />
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Content — {site.name}</h1>
        <RevalidateButton siteId={siteId} />
      </div>

      {/* Page tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-800 pb-0">
        {pages.map(p => (
          <Link
            key={p}
            href={`?page=${p}`}
            className={`px-4 py-2 rounded-t-lg text-base transition-colors border-b-2 -mb-px ${
              activePage === p
                ? 'bg-slate-800 text-white border-indigo-500'
                : 'text-slate-400 hover:text-white border-transparent hover:bg-slate-800'
            }`}
          >
            {PAGE_LABELS[p] ?? p}
          </Link>
        ))}
      </div>

      {fields.length === 0 ? (
        <p className="text-slate-400 text-base">No content fields for this page yet.</p>
      ) : (
        <form action={saveTextFields}>
          <input type="hidden" name="siteId" value={siteId} />
          <input type="hidden" name="page" value={activePage} />
          <div className="flex flex-col gap-8">

            {/* SEO section */}
            {seoFields.length > 0 && (
              <div className="rounded-xl border border-indigo-900 bg-indigo-950/30 p-5 max-w-2xl">
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-base font-semibold text-white">🔍 Page SEO</span>
                </div>
                <div className="flex flex-col gap-4">
                  {seoFields.map(field => <FieldInput key={field.id} field={field} />)}
                </div>
              </div>
            )}

            {/* Content fields */}
            {contentFields.length > 0 && (() => {
              const gridFields = contentFields.filter(f =>
                f.key.match(/compare\.(prod\d+_(name|price|feat\d+)|feat\d+_label)/)
              )
              const plainFields = contentFields.filter(f => !gridFields.includes(f))
              return (
                <>
                  {plainFields.length > 0 && (
                    <div className="flex flex-col gap-5 max-w-2xl">
                      {plainFields.map(field => <FieldInput key={field.id} field={field} />)}
                    </div>
                  )}
                  {gridFields.length > 0 && (
                    <CompareGridEditor fields={gridFields.map(f => ({ key: f.key, value: f.value }))} />
                  )}
                </>
              )
            })()}

            <div className="max-w-2xl">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-base font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

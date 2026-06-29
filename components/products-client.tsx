'use client'
import { useState, useTransition, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createProduct, updateProduct, deleteProduct, toggleProductActive, clearAllProducts, reorderProducts } from '@/app/actions/products'
import { ImageUpload } from '@/components/image-upload'

type Category = { id: string; name: string }

type Product = {
  id: string
  handle: string
  name: string
  price: number
  description: string | null
  badge: string | null
  image: string | null
  images: string[]
  payperSku: string | null
  cardFeatures: string[]
  features: string[]
  active: boolean
  order: number
  metaTitle: string | null
  metaDescription: string | null
  ogImage: string | null
  categoryId: string | null
  category: Category | null
  videoUrl: string | null
  soldCount: string | null
  rating: number | null
  reviewCount: number | null
  specsRaw: string | null
  inTheBox: string | null
  usageInstructions: string | null
  warrantyInfo: string | null
  faqRaw: string | null
  relatedProductIds: string[]
}

function MultiImageUpload({ name, label, defaultValues, siteSlug }: { name: string; label: string; defaultValues: string[]; siteSlug: string }) {
  const [urls, setUrls] = useState<string[]>(defaultValues)
  const [uploading, setUploading] = useState<number | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>, idx: number) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(idx)
    const fd = new FormData()
    fd.append('file', file)
    if (siteSlug) fd.append('siteSlug', siteSlug)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUrls(prev => prev.map((u, i) => i === idx ? data.url : u))
    setUploading(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="block text-sm text-slate-400 uppercase tracking-wide">{label}</label>
      {urls.map((url, i) => (
        <div key={i} className="flex items-center gap-3">
          <input type="hidden" name={name} value={url} />
          {url ? (
            <Image src={url} alt={`image ${i + 1}`} width={80} height={80} className="rounded-lg object-contain bg-slate-800 shrink-0" unoptimized />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-slate-800 border border-slate-700 shrink-0" />
          )}
          <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-sm px-3 py-1.5 rounded-lg transition-colors">
            {uploading === i ? 'Uploading...' : url ? 'Replace' : 'Upload'}
            <input type="file" accept="image/*" className="hidden" onChange={e => handleFile(e, i)} disabled={uploading !== null} />
          </label>
          <button type="button" onClick={() => setUrls(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300 text-sm">Remove</button>
        </div>
      ))}
      <button type="button" onClick={() => setUrls(prev => [...prev, ''])}
        className="self-start text-sm text-indigo-400 hover:text-indigo-300 border border-dashed border-indigo-800 px-4 py-2 rounded-lg">
        + Add image
      </button>
    </div>
  )
}

function RelatedProductsSelect({ currentId, allProducts, selected }: { currentId: string; allProducts: Product[]; selected: string[] }) {
  const [chosen, setChosen] = useState<string[]>(selected)
  const others = allProducts.filter(p => p.id !== currentId)
  function toggle(id: string) {
    setChosen(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-slate-500">Select which products appear in the related section (leave empty for auto)</p>
      {chosen.map(id => <input key={id} type="hidden" name="relatedProductIds" value={id} />)}
      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto border border-slate-700 rounded-lg p-2">
        {others.length === 0 && <p className="text-slate-500 text-sm px-2 py-1">No other products yet</p>}
        {others.map(p => (
          <label key={p.id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-slate-800 cursor-pointer">
            <input type="checkbox" checked={chosen.includes(p.id)} onChange={() => toggle(p.id)} className="accent-indigo-500" />
            <span className="text-sm text-white">{p.name}</span>
            <span className="text-xs text-slate-500 ml-auto">₪{p.price}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function ProductRow({
  product,
  allProducts,
  siteId,
  siteSlug,
  categories,
}: {
  product: Product
  allProducts: Product[]
  siteId: string
  siteSlug: string
  categories: Category[]
}) {
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  if (editing) {
    return (
      <div className="rounded-xl border border-indigo-700 bg-slate-900 p-5">
        <form
          action={(fd) => {
            fd.append('id', product.id)
            fd.append('siteId', siteId)
            startTransition(async () => {
              await updateProduct(fd)
              setEditing(false)
              router.refresh()
            })
          }}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name" name="name" defaultValue={product.name} />
            <Field label="Handle (URL slug)" name="handle" defaultValue={product.handle} />
            <Field label="Price (₪)" name="price" type="number" defaultValue={String(product.price)} />
            <Field label="Badge (optional)" name="badge" defaultValue={product.badge ?? ''} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-slate-400">Category</label>
            <select name="categoryId" defaultValue={product.categoryId ?? ''} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500">
              <option value="">— No category —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <Field label="Description" name="description" defaultValue={product.description ?? ''} />
          <Field label="Payper SKU / makat (optional)" name="payperSku" defaultValue={product.payperSku ?? ''} />
          <Field label="Card features (comma-separated)" name="cardFeatures" defaultValue={product.cardFeatures.join(', ')} />
          <FullFeaturesEditor name="features" defaultValue={product.features.join(',')} />
          <ImageUpload name="image" label="Main product image" defaultValue={product.image ?? ''} siteSlug={siteSlug} />
          <MultiImageUpload name="images" label="Additional images (gallery)" defaultValues={product.images} siteSlug={siteSlug} />
          <div className="border-t border-slate-800 pt-4">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">Product Page Content</p>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                <Field label="Sold count (e.g. 2,314)" name="soldCount" defaultValue={product.soldCount ?? ''} />
              </div>
              <Field label="Video URL (Why Choose section)" name="videoUrl" defaultValue={product.videoUrl ?? ''} />
              <SpecsEditor name="specsRaw" defaultValue={product.specsRaw ?? ''} />
              <ListEditor label="מה בקופסה" name="inTheBox" defaultValue={product.inTheBox ?? ''} />
              <ListEditor label="הוראות שימוש" name="usageInstructions" defaultValue={product.usageInstructions ?? ''} />
              <ListEditor label="אחריות ושירות" name="warrantyInfo" defaultValue={product.warrantyInfo ?? ''} />
              <TextArea label='FAQ (one per line: "שאלה|תשובה")' name="faqRaw" defaultValue={product.faqRaw ?? ''} rows={6} />
            </div>
          </div>
          <div className="border-t border-slate-800 pt-4">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">Related Products</p>
            <RelatedProductsSelect currentId={product.id} allProducts={allProducts} selected={product.relatedProductIds} />
          </div>
          <div className="border-t border-slate-800 pt-4">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">SEO</p>
            <div className="flex flex-col gap-4">
              <Field label="Meta Title" name="metaTitle" defaultValue={product.metaTitle ?? ''} />
              <Field label="Meta Description" name="metaDescription" defaultValue={product.metaDescription ?? ''} />
              <Field label="OG Image URL (optional)" name="ogImage" defaultValue={product.ogImage ?? ''} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-400">Active</label>
            <select name="active" defaultValue={product.active ? 'true' : 'false'} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500">
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={pending} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50">
              {pending ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="px-5 py-2.5 border border-slate-700 text-slate-300 hover:text-white rounded-lg font-medium transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border p-4 flex items-center gap-4 ${product.active ? 'border-slate-800 bg-slate-900' : 'border-slate-800 bg-slate-950 opacity-60'}`}>
      {product.image ? (
        <Image src={product.image} alt={product.name} width={64} height={64} className="w-16 h-16 rounded-lg object-contain bg-slate-800 shrink-0" unoptimized />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-slate-800 shrink-0 flex items-center justify-center text-slate-600 text-xs">No img</div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white font-semibold">{product.name}</span>
          {product.badge && <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-400">{product.badge}</span>}
          {!product.active && <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-500">inactive</span>}
        </div>
        <div className="flex gap-4 text-sm text-slate-400 mt-0.5">
          <span>₪{product.price}</span>
          <span className="text-slate-600">/shop/{product.handle}</span>
          {product.payperSku && <span className="text-slate-500">SKU: {product.payperSku}</span>}
          {product.category && <span className="text-indigo-400">{product.category.name}</span>}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => startTransition(() => toggleProductActive(product.id, siteId, !product.active))}
          disabled={pending}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
            product.active
              ? 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
              : 'border-green-800 text-green-400 hover:bg-green-950'
          }`}
        >
          {product.active ? 'Deactivate' : 'Activate'}
        </button>
        <button onClick={() => setEditing(true)} className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors">
          Edit
        </button>
        <button
          onClick={() => {
            if (confirm(`Delete product "${product.name}"?`)) {
              startTransition(() => deleteProduct(product.id, siteId))
            }
          }}
          disabled={pending}
          className="px-4 py-2 rounded-lg text-sm font-medium border border-red-900 text-red-400 hover:bg-red-950 transition-colors disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

function ListEditor({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  const [items, setItems] = useState<string[]>(() => defaultValue ? defaultValue.split('\n').filter(Boolean) : [''])
  const serialized = items.join('\n')
  const add = () => setItems(prev => [...prev, ''])
  const remove = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i))
  const update = (i: number, val: string) => setItems(prev => prev.map((v, idx) => idx === i ? val : v))
  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={serialized} />
      <label className="text-sm text-slate-400">{label}</label>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              value={item}
              onChange={e => update(i, e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              placeholder="פריט..."
            />
            <button type="button" onClick={() => remove(i)} className="text-slate-500 hover:text-red-400 text-lg leading-none px-1">×</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="self-start text-sm text-indigo-400 hover:text-indigo-300 mt-1">+ הוסף שורה</button>
    </div>
  )
}

function FullFeaturesEditor({ name, defaultValue }: { name: string; defaultValue: string }) {
  const parse = (raw: string) => raw
    ? raw.split(',').map(s => s.trim()).filter(Boolean).map(s => {
        const [title = '', subtitle = ''] = s.split('::')
        return { title: title.trim(), subtitle: subtitle.trim() }
      })
    : [{ title: '', subtitle: '' }]

  const [rows, setRows] = useState(() => parse(defaultValue))
  const serialized = rows.filter(r => r.title).map(r => r.subtitle ? `${r.title}::${r.subtitle}` : r.title).join(',')
  const add = () => setRows(prev => [...prev, { title: '', subtitle: '' }])
  const remove = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i))
  const update = (i: number, key: 'title' | 'subtitle', val: string) =>
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [key]: val } : r))
  const inp = "bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={serialized} />
      <label className="text-sm text-slate-400">Full features (title + subtitle)</label>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs text-slate-500 px-1">
        <span>תיאור</span><span>כותרת</span><span />
      </div>
      <div className="flex flex-col gap-2">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
            <input value={row.subtitle} onChange={e => update(i, 'subtitle', e.target.value)} className={inp + " text-right"} placeholder="תיאור קצר (אופציונלי)" dir="rtl" />
            <input value={row.title} onChange={e => update(i, 'title', e.target.value)} className={inp + " text-right"} placeholder="כותרת הפיצ'ר" dir="rtl" />
            <button type="button" onClick={() => remove(i)} className="text-slate-500 hover:text-red-400 text-lg leading-none px-1">×</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="self-start text-sm text-indigo-400 hover:text-indigo-300 mt-1">+ הוסף פיצ'ר</button>
    </div>
  )
}

function SpecsEditor({ name, defaultValue }: { name: string; defaultValue: string }) {
  const parse = (raw: string) => raw ? raw.split('\n').filter(Boolean).map(l => { const [a='',b='',c=''] = l.split('|'); return { a, b, c } }) : [{ a: '', b: '', c: '' }]
  const [rows, setRows] = useState(() => parse(defaultValue))
  const serialized = rows.map(r => `${r.a}|${r.b}|${r.c}`).filter(r => r !== '||').join('\n')
  const add = () => setRows(prev => [...prev, { a: '', b: '', c: '' }])
  const remove = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i))
  const update = (i: number, key: 'a'|'b'|'c', val: string) => setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [key]: val } : r))
  const inp = "bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={serialized} />
      <label className="text-sm text-slate-400">מפרט טכני</label>
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs text-slate-500 px-1">
        <span>שם שדה</span><span>ערך</span><span>קטגוריה</span><span />
      </div>
      <div className="flex flex-col gap-2">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
            <input value={row.a} onChange={e => update(i,'a',e.target.value)} className={inp} placeholder="שם שדה" />
            <input value={row.b} onChange={e => update(i,'b',e.target.value)} className={inp} placeholder="ערך" />
            <input value={row.c} onChange={e => update(i,'c',e.target.value)} className={inp} placeholder="קטגוריה" />
            <button type="button" onClick={() => remove(i)} className="text-slate-500 hover:text-red-400 text-lg leading-none px-1">×</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="self-start text-sm text-indigo-400 hover:text-indigo-300 mt-1">+ הוסף שורה</button>
    </div>
  )
}

function Field({ label, name, defaultValue, type = 'text' }: { label: string; name: string; defaultValue: string; type?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-slate-400">{label}</label>
      <input name={name} type={type} defaultValue={defaultValue} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-base focus:outline-none focus:border-indigo-500" />
    </div>
  )
}

function TextArea({ label, name, defaultValue, rows = 4 }: { label: string; name: string; defaultValue: string; rows?: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-slate-400">{label}</label>
      <textarea name={name} defaultValue={defaultValue} rows={rows} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-base focus:outline-none focus:border-indigo-500 resize-y font-mono" />
    </div>
  )
}

export function ProductsClient({
  products: initialProducts,
  siteId,
  siteSlug,
  siteName,
  categories,
}: {
  products: Product[]
  siteId: string
  siteSlug: string
  siteName: string
  categories: Category[]
}) {
  const [items, setItems] = useState(initialProducts)
  const [creating, setCreating] = useState(false)
  const [pending, startTransition] = useTransition()
  const dragIndex = useRef<number | null>(null)

  useEffect(() => { setItems(initialProducts) }, [initialProducts])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Products — {siteName} <span className="text-slate-500 text-lg font-normal">({items.length})</span></h1>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              if (!confirm('Delete all products for this site? This cannot be undone.')) return
              await clearAllProducts(siteId)
            }}
            className="bg-red-700 hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-base font-medium"
          >
            Clear All
          </button>
          <button onClick={() => setCreating(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-base font-medium">
            + New Product
          </button>
        </div>
      </div>

      {items.length === 0 && !creating ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-12 text-center text-slate-500">
          No products yet. Create one above.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((p, i) => (
            <div
              key={p.id}
              draggable
              onDragStart={() => { dragIndex.current = i }}
              onDragOver={e => { e.preventDefault() }}
              onDrop={() => {
                const from = dragIndex.current
                if (from === null || from === i) return
                const next = [...items]
                const [moved] = next.splice(from, 1)
                next.splice(i, 0, moved)
                setItems(next)
                dragIndex.current = null
                startTransition(() => reorderProducts(siteId, next.map(x => x.id)))
              }}
              className="flex items-center gap-2"
            >
              <div className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing px-1 text-lg select-none">⠿</div>
              <div className="flex-1">
                <ProductRow product={p} allProducts={items} siteId={siteId} siteSlug={siteSlug} categories={categories} />
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <div className="mt-4 rounded-xl border border-indigo-700 bg-slate-900 p-5">
          <h2 className="text-base font-semibold text-white mb-4">New Product</h2>
          <form
            action={(fd) => {
              fd.append('siteId', siteId)
              startTransition(async () => {
                await createProduct(fd)
                setCreating(false)
              })
            }}
            className="flex flex-col gap-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name" name="name" defaultValue="" />
              <Field label="Handle (URL slug, auto if blank)" name="handle" defaultValue="" />
              <Field label="Price (₪)" name="price" type="number" defaultValue="" />
              <Field label="Badge (optional)" name="badge" defaultValue="" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-slate-400">Category</label>
              <select name="categoryId" defaultValue="" className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500">
                <option value="">— No category —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Field label="Description" name="description" defaultValue="" />
            <Field label="Payper SKU / makat (optional)" name="payperSku" defaultValue="" />
            <Field label="Card features (comma-separated)" name="cardFeatures" defaultValue="" />
            <FullFeaturesEditor name="features" defaultValue="" />
            <ImageUpload name="image" label="Product image" defaultValue="" siteSlug={siteSlug} />
            <div className="flex gap-3">
              <button type="submit" disabled={pending} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50">
                {pending ? 'Creating…' : 'Create Product'}
              </button>
              <button type="button" onClick={() => setCreating(false)} className="px-5 py-2.5 border border-slate-700 text-slate-300 hover:text-white rounded-lg font-medium transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

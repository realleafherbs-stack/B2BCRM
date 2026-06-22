'use client'
import { useState, useTransition, useRef } from 'react'
import Image from 'next/image'
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
}

function ProductRow({
  product,
  siteId,
  siteSlug,
  categories,
}: {
  product: Product
  siteId: string
  siteSlug: string
  categories: Category[]
}) {
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()

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
          <Field label="Full features (comma-separated)" name="features" defaultValue={product.features.join(', ')} />
          <ImageUpload name="image" label="Product image" defaultValue={product.image ?? ''} siteSlug={siteSlug} />
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

function Field({ label, name, defaultValue, type = 'text' }: { label: string; name: string; defaultValue: string; type?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-slate-400">{label}</label>
      <input name={name} type={type} defaultValue={defaultValue} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-base focus:outline-none focus:border-indigo-500" />
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
                <ProductRow product={p} siteId={siteId} siteSlug={siteSlug} categories={categories} />
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
            <Field label="Full features (comma-separated)" name="features" defaultValue="" />
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

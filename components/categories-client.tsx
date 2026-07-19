'use client'
import { useState, useTransition, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createCategory, updateCategory, deleteCategory, reorderCategoryProducts } from '@/app/actions/categories'

type Category = { id: string; name: string; slug: string; active: boolean; order: number; _count?: { products: number } }
type CategoryProduct = { id: string; name: string; price: number; image: string | null; active: boolean; categoryId: string | null; categoryOrder: number }

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-slate-400">{label}</label>
      <input name={name} defaultValue={defaultValue} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-base focus:outline-none focus:border-indigo-500" />
    </div>
  )
}

function CategoryProductPanel({ products, siteId, categoryId }: { products: CategoryProduct[]; siteId: string; categoryId: string }) {
  const [items, setItems] = useState(products)
  const [, startTransition] = useTransition()
  const dragIndex = useRef<number | null>(null)

  if (items.length === 0) {
    return (
      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950 p-6 text-center text-slate-500 text-sm">
        No products in this category yet.
      </div>
    )
  }

  function moveTo(from: number, to: number) {
    if (from === to) return
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setItems(next)
    startTransition(() => reorderCategoryProducts(siteId, categoryId, next.map((x) => x.id)))
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {items.map((p, i) => (
        <div
          key={p.id}
          draggable
          onDragStart={() => { dragIndex.current = i }}
          onDragOver={(e) => { e.preventDefault() }}
          onDrop={() => {
            const from = dragIndex.current
            dragIndex.current = null
            if (from === null) return
            moveTo(from, i)
          }}
          className={`flex items-center gap-3 rounded-lg border p-3 ${p.active ? 'border-slate-800 bg-slate-950' : 'border-slate-800 bg-slate-950 opacity-60'}`}
        >
          <div className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing px-1 text-lg select-none">⠿</div>
          <input
            key={i}
            type="number"
            min={1}
            max={items.length}
            defaultValue={i + 1}
            onBlur={(e) => {
              const raw = parseInt(e.target.value, 10)
              const clamped = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), items.length) : i + 1
              e.target.value = String(clamped)
              moveTo(i, clamped - 1)
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
            className="w-12 shrink-0 bg-slate-800 border border-slate-700 rounded-md px-1.5 py-1 text-white text-xs text-center focus:outline-none focus:border-indigo-500"
          />
          {p.image ? (
            <Image src={p.image} alt={p.name} width={40} height={40} className="w-10 h-10 rounded-lg object-contain bg-slate-800 shrink-0" unoptimized />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-slate-800 shrink-0 flex items-center justify-center text-slate-600 text-[10px]">No img</div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-medium">{p.name}</span>
              {!p.active && <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-500">inactive</span>}
            </div>
            <span className="text-slate-400 text-xs">₪{p.price}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function CategoryRow({ cat, siteId, products }: { cat: Category; siteId: string; products: CategoryProduct[] }) {
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  if (editing) {
    return (
      <div className="rounded-xl border border-indigo-700 bg-slate-900 p-5">
        <form
          action={(fd) => {
            fd.append('id', cat.id)
            fd.append('siteId', siteId)
            startTransition(async () => { await updateCategory(fd); setEditing(false); router.refresh() })
          }}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name" name="name" defaultValue={cat.name} />
            <Field label="Slug (URL)" name="slug" defaultValue={cat.slug} />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-400">Active</label>
            <select name="active" defaultValue={cat.active ? 'true' : 'false'} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500">
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
    <div className={`rounded-xl border p-4 ${cat.active ? 'border-slate-800 bg-slate-900' : 'border-slate-800 bg-slate-950 opacity-60'}`}>
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold">{cat.name}</span>
            {!cat.active && <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-500">inactive</span>}
          </div>
          <div className="flex gap-4 text-sm text-slate-400 mt-0.5">
            <span>/{cat.slug}</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          >
            {expanded ? 'Hide' : 'Products'} ({products.length})
          </button>
          <button onClick={() => setEditing(true)} className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors">
            Edit
          </button>
          <button
            onClick={() => { if (confirm(`Delete category "${cat.name}"? Products will be uncategorized.`)) startTransition(() => deleteCategory(cat.id, siteId)) }}
            disabled={pending}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-red-900 text-red-400 hover:bg-red-950 transition-colors disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
      {expanded && <CategoryProductPanel products={products} siteId={siteId} categoryId={cat.id} />}
    </div>
  )
}

export function CategoriesClient({ categories, products, siteId, siteName }: { categories: Category[]; products: CategoryProduct[]; siteId: string; siteName: string }) {
  const [creating, setCreating] = useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Categories — {siteName} <span className="text-slate-500 text-lg font-normal">({categories.length})</span></h1>
        <button onClick={() => setCreating(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-base font-medium">
          + New Category
        </button>
      </div>

      {creating && (
        <div className="mb-4 rounded-xl border border-indigo-700 bg-slate-900 p-5">
          <h2 className="text-base font-semibold text-white mb-4">New Category</h2>
          <form
            action={(fd) => {
              fd.append('siteId', siteId)
              startTransition(async () => { await createCategory(fd); setCreating(false) })
            }}
            className="flex flex-col gap-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name" name="name" defaultValue="" />
              <Field label="Slug (auto if blank)" name="slug" defaultValue="" />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={pending} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50">
                {pending ? 'Creating…' : 'Create Category'}
              </button>
              <button type="button" onClick={() => setCreating(false)} className="px-5 py-2.5 border border-slate-700 text-slate-300 hover:text-white rounded-lg font-medium transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {categories.length === 0 && !creating ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-12 text-center text-slate-500">
          No categories yet. Create one above.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {categories.map((cat) => (
            <CategoryRow key={cat.id} cat={cat} siteId={siteId} products={products.filter((p) => p.categoryId === cat.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

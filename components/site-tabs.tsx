'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'

function BlogsDropdown({ siteId, pathname }: { siteId: string; pathname: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isActive = pathname.startsWith(`/sites/${siteId}/blogs`) || pathname.startsWith('/blog-generator')

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <div className={`flex items-center rounded-lg transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
        <Link href={`/sites/${siteId}/blogs`} className="px-4 py-2.5 text-base" onClick={() => setOpen(false)}>
          📝 Blogs
        </Link>
        <button onClick={() => setOpen(o => !o)} className="px-2 py-2.5 text-xs border-l border-white/20">
          {open ? '▲' : '▼'}
        </button>
      </div>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl min-w-40">
          <Link
            href="/blog-generator"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg transition-colors ${pathname.startsWith('/blog-generator') ? 'text-white bg-indigo-600' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
          >
            ✨ Blog Generator
          </Link>
        </div>
      )}
    </div>
  )
}

export function SiteTabs({ siteId }: { siteId: string }) {
  const pathname = usePathname()

  const tabs = [
    { label: '📊 Dashboard',   href: `/sites/${siteId}/dashboard` },
    { label: '✏️ Content',     href: `/sites/${siteId}/content` },
    { label: '🔍 SEO',        href: `/sites/${siteId}/seo` },
    { label: '📬 Submissions', href: `/sites/${siteId}/submissions` },
    { label: '📦 Products',    href: `/sites/${siteId}/products` },
    { label: '⭐ Reviews',     href: `/sites/${siteId}/reviews` },
    { label: '🗂 Categories',  href: `/sites/${siteId}/categories` },
    { label: '🛒 Orders',     href: `/sites/${siteId}/orders` },
    { label: '🏷 Coupons',    href: `/sites/${siteId}/coupons` },
    { label: '🖼 Media',       href: `/sites/${siteId}/media` },
    { label: '⚙️ Settings',   href: `/sites/${siteId}/settings` },
  ]

  return (
    <div className="flex gap-1 p-4 border-b border-slate-800 bg-slate-900">
      {tabs.filter(t => t.href.endsWith('/dashboard')).map((tab) => {
        const isActive = pathname.startsWith(tab.href)
        return (
          <Link key={tab.href} href={tab.href} className={`px-5 py-2.5 rounded-lg text-base transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            {tab.label}
          </Link>
        )
      })}
      <BlogsDropdown siteId={siteId} pathname={pathname} />
      {tabs.filter(t => !t.href.endsWith('/dashboard')).map((tab) => {
        const isActive = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-5 py-2.5 rounded-lg text-base transition-colors ${
              isActive
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}

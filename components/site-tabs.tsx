'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function SiteTabs({ siteId }: { siteId: string }) {
  const pathname = usePathname()

  const tabs = [
    { label: '📊 Dashboard',   href: `/sites/${siteId}/dashboard` },
    { label: '📝 Blogs',       href: `/sites/${siteId}/blogs` },
    { label: '✏️ Content',     href: `/sites/${siteId}/content` },
    { label: '🔍 SEO',        href: `/sites/${siteId}/seo` },
    { label: '📬 Submissions', href: `/sites/${siteId}/submissions` },
    { label: '📦 Products',    href: `/sites/${siteId}/products` },
    { label: '🗂 Categories',  href: `/sites/${siteId}/categories` },
    { label: '🛒 Orders',     href: `/sites/${siteId}/orders` },
    { label: '🏷 Coupons',    href: `/sites/${siteId}/coupons` },
    { label: '🖼 Media',       href: `/sites/${siteId}/media` },
    { label: '⚙️ Settings',   href: `/sites/${siteId}/settings` },
  ]

  return (
    <div className="flex gap-1 p-4 border-b border-slate-800 bg-slate-900">
      {tabs.map((tab) => {
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

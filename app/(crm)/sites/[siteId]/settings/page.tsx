import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { PayperSettingsClient } from '@/components/payper-settings-client'

export default async function SettingsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { id: true, name: true, slug: true, payperCategories: true, payperWebhookSecret: true },
  })
  if (!site) notFound()

  const crmUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'https://www.ducks.co.il'

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-semibold text-white mb-1">Settings</h2>
      <p className="text-slate-400 text-sm mb-8">Site: {site.name}</p>

      <section className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-base font-semibold text-white mb-1">Payper Integration</h2>
        <p className="text-xs text-slate-500 mb-6">
          Configure Payper to push product updates directly to this site.
          New products arrive inactive — activate them in the Products tab.
        </p>
        <PayperSettingsClient
          siteId={site.id}
          siteSlug={site.slug}
          payperCategories={site.payperCategories}
          payperWebhookSecret={site.payperWebhookSecret}
          crmUrl={crmUrl}
        />
      </section>
    </div>
  )
}

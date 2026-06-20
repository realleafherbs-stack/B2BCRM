# Adding a New Site to the CRM

## 1. Register the site in the CRM

Log in to the CRM admin, go to **Sites → Add Site** and fill in:

| Field | Description |
|-------|-------------|
| Name | Display name (e.g. "My Shop") |
| Slug | Short URL-safe identifier — used in every API URL (e.g. `myshop`) |

The CRM will auto-generate an **API Key** and a **Revalidate Secret** for the site.
After saving, copy them from the site detail page.

Also set the **Revalidate URL** to the site's live URL (e.g. `http://localhost:3001` in dev,
`https://myshop.com` in production). This is the URL the CRM will ping when a blog post is published.

---

## 2. Configure the site's `.env.local`

Add the following variables to the Next.js site:

```env
CRM_URL=https://www.ducks.co.il       # URL where B2BCRM is running (localhost:3000 in dev)
CRM_API_KEY=<api-key-from-crm>         # Copied from CRM → Sites → your site
CRM_SITE_SLUG=myshop                   # Must match the slug set in step 1
REVALIDATE_SECRET=<secret-from-crm>   # Copied from CRM → Sites → your site
```

---

## 3. Create `lib/cms.ts` in the site

```ts
const CRM_URL    = process.env.CRM_URL!
const CRM_API_KEY = process.env.CRM_API_KEY!
const SITE_SLUG  = process.env.CRM_SITE_SLUG!

const headers = { 'x-api-key': CRM_API_KEY }

function isJson(res: Response) {
  return (res.headers.get('content-type') ?? '').includes('application/json')
}

export interface BlogPost {
  id: string; title: string; slug: string
  publishedAt: string | null; featuredImage: string | null
  metaTitle: string | null; metaDescription: string | null
  ogImage: string | null; tags: string[]
}

export interface BlogPostFull extends BlogPost { body: string }

export interface SiteSEO {
  metaTitle: string | null; metaDescription: string | null; ogImage: string | null
}

export async function getBlogs(): Promise<BlogPost[]> {
  const res = await fetch(`${CRM_URL}/api/${SITE_SLUG}/blogs`, { headers, next: { revalidate: 60 } })
  if (!res.ok || !isJson(res)) return []
  return res.json()
}

export async function getBlog(slug: string): Promise<BlogPostFull | null> {
  const res = await fetch(`${CRM_URL}/api/${SITE_SLUG}/blogs/${slug}`, { headers, next: { revalidate: 60 } })
  if (!res.ok || !isJson(res)) return null
  return res.json()
}

export async function getContent(): Promise<Record<string, string>> {
  const res = await fetch(`${CRM_URL}/api/${SITE_SLUG}/content`, { headers, next: { revalidate: 60 } })
  if (!res.ok || !isJson(res)) return {}
  return res.json()
}

export async function getSiteSEO(): Promise<SiteSEO> {
  const res = await fetch(`${CRM_URL}/api/${SITE_SLUG}/seo`, { headers, next: { revalidate: 60 } })
  if (!res.ok || !isJson(res)) return { metaTitle: null, metaDescription: null, ogImage: null }
  return res.json()
}
```

---

## 4. Create `app/api/revalidate/route.ts` in the site

```ts
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { secret, path } = await request.json()
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  revalidatePath(path ?? '/')
  return NextResponse.json({ revalidated: true, path })
}
```

---

## 5. API endpoints reference

All endpoints require the header `x-api-key: <api-key>`.
Replace `{slug}` with the site's slug.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/{slug}/blogs` | All published posts — id, title, slug, publishedAt, featuredImage, metaTitle, metaDescription, ogImage, tags |
| `GET` | `/api/{slug}/blogs/{postSlug}` | Single post — all fields above + full `body` HTML |
| `GET` | `/api/{slug}/content` | Text content fields — returns `{ key: value }` map |
| `GET` | `/api/{slug}/seo` | Site SEO — metaTitle, metaDescription, ogImage |
| `POST` | `/api/{slug}/revalidate` | Bust ISR cache — body: `{ secret, path }` |

---

## 6. Port conventions (local dev)

| App | Port | How |
|-----|------|-----|
| B2BCRM | 3000 | `npm run dev` (default) |
| Each site | 3001, 3002, … | `next dev -p 3001` in `package.json` scripts |

Update the site's `package.json` dev script:
```json
"dev": "next dev --webpack -p 3001"
```

And update `Revalidate URL` in the CRM site settings to match the port you chose.

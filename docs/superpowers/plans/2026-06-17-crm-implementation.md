# B2B CRM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js CRM that lets a non-technical client manage blog posts, editable text fields, and SEO metadata across multiple websites, with a public API those websites consume.

**Architecture:** Single Next.js App Router app on Vercel. Editors use the CRM UI to manage content stored in PostgreSQL (Supabase). Client Next.js sites fetch content from the CRM's public API routes using an API key, with ISR for fast page loads and near-instant content updates on publish.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Prisma, Supabase (PostgreSQL), NextAuth.js v5, TipTap, Cloudinary, Vitest

**Supabase connection:** `prisma/schema.prisma` uses two env vars — `DATABASE_URL` (port 6543, pgBouncer/transaction mode, for runtime) and `DIRECT_URL` (port 5432, for Prisma CLI migrations/push). Both from Supabase dashboard → Settings → Database → Connection string.

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json` (via create-next-app)
- Create: `.env.local` (from template below)
- Create: `.env.example`

- [ ] **Step 1: Scaffold the Next.js project**

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --eslint
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @prisma/client prisma next-auth@beta @auth/prisma-adapter @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link cloudinary uuid
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @types/uuid
```

- [ ] **Step 3: Create `.env.local`**

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_URL="http://localhost:3000"
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
```

- [ ] **Step 4: Create `.env.example` with same keys but empty values**

Copy `.env.local`, clear all values after `=`.

- [ ] **Step 5: Add vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

Create `vitest.setup.ts`:
```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Add test script to `package.json`**

```json
"scripts": {
  "test": "vitest",
  "test:run": "vitest run"
}
```

- [ ] **Step 7: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold Next.js project with dependencies"
```

---

## Task 2: Prisma Schema & Database

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/prisma.ts`
- Create: `lib/__tests__/prisma.test.ts`

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Write the schema**

Replace contents of `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  EDITOR
}

enum PostStatus {
  DRAFT
  PUBLISHED
}

enum FieldType {
  TEXT
  TEXTAREA
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String
  role          Role      @default(EDITOR)
  createdAt     DateTime  @default(now())
  accounts      Account[]
  sessions      Session[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Site {
  id               String       @id @default(cuid())
  name             String
  slug             String       @unique
  apiKey           String       @unique @default(cuid())
  revalidateSecret String       @default(cuid())
  revalidateUrl    String?
  createdAt        DateTime     @default(now())
  blogs            BlogPost[]
  textFields       TextField[]
  siteSeo          SiteSEO?
}

model TextField {
  id        String    @id @default(cuid())
  siteId    String
  key       String
  label     String
  value     String    @default("") @db.Text
  type      FieldType @default(TEXT)
  order     Int       @default(0)
  site      Site      @relation(fields: [siteId], references: [id], onDelete: Cascade)

  @@unique([siteId, key])
}

model BlogPost {
  id              String     @id @default(cuid())
  siteId          String
  title           String
  slug            String
  body            String     @default("") @db.Text
  status          PostStatus @default(DRAFT)
  publishedAt     DateTime?
  featuredImage   String?
  metaTitle       String?
  metaDescription String?
  ogImage         String?
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  site            Site       @relation(fields: [siteId], references: [id], onDelete: Cascade)

  @@unique([siteId, slug])
}

model SiteSEO {
  id              String  @id @default(cuid())
  siteId          String  @unique
  metaTitle       String?
  metaDescription String?
  ogImage         String?
  site            Site    @relation(fields: [siteId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 3: Push schema to Neon**

```bash
npx prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 4: Create Prisma client singleton**

Create `lib/prisma.ts`:
```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 5: Generate Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 6: Commit**

```bash
git add prisma/ lib/prisma.ts .env.example
git commit -m "feat: add Prisma schema and database setup"
```

---

## Task 3: Authentication

**Files:**
- Create: `lib/auth.ts`
- Create: `lib/__tests__/auth.test.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `app/(auth)/login/page.tsx`
- Create: `middleware.ts`

- [ ] **Step 1: Write failing test for password hashing**

Create `lib/__tests__/auth.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../auth'

describe('password helpers', () => {
  it('hashes a password and verifies it correctly', async () => {
    const hash = await hashPassword('secret123')
    expect(hash).not.toBe('secret123')
    const valid = await verifyPassword('secret123', hash)
    expect(valid).toBe(true)
  })

  it('rejects wrong password', async () => {
    const hash = await hashPassword('secret123')
    const valid = await verifyPassword('wrong', hash)
    expect(valid).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm run test:run -- lib/__tests__/auth.test.ts
```

Expected: FAIL — `hashPassword is not a function`

- [ ] **Step 3: Create `lib/auth.ts`**

```ts
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })
        if (!user) return null
        const valid = await verifyPassword(credentials.password as string, user.password)
        if (!valid) return null
        return { id: user.id, email: user.email, role: user.role }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      return session
    },
  },
})
```

- [ ] **Step 4: Install bcryptjs**

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npm run test:run -- lib/__tests__/auth.test.ts
```

Expected: PASS

- [ ] **Step 6: Create NextAuth API route**

Create `app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

- [ ] **Step 7: Extend NextAuth types**

Create `types/next-auth.d.ts`:
```ts
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: { id: string; role: string } & DefaultSession['user']
  }
}
```

- [ ] **Step 8: Create middleware to protect routes**

Create `middleware.ts`:
```ts
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isLoginPage = req.nextUrl.pathname === '/login'
  const isApiPublic = req.nextUrl.pathname.startsWith('/api/') &&
    !req.nextUrl.pathname.startsWith('/api/auth')

  if (isApiPublic) return NextResponse.next()
  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }
  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 9: Create login page**

Create `app/(auth)/login/page.tsx`:
```tsx
'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const form = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email: form.get('email'),
      password: form.get('password'),
      redirect: false,
    })
    setLoading(false)
    if (result?.error) {
      setError('Invalid email or password')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md p-8 bg-slate-900 rounded-xl border border-slate-800">
        <h1 className="text-2xl font-bold text-white mb-8">Sign in</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-base focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">Password</label>
            <input
              name="password"
              type="password"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-base focus:outline-none focus:border-indigo-500"
            />
          </div>
          {error && <p className="text-red-400 text-base">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg text-base font-medium disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 10: Seed an admin user for testing**

Create `prisma/seed.ts`:
```ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const password = await bcrypt.hash('admin123', 12)
  await prisma.user.upsert({
    where: { email: 'admin@crm.com' },
    update: {},
    create: { email: 'admin@crm.com', password, role: 'ADMIN' },
  })
  console.log('Seeded admin user: admin@crm.com / admin123')
}

main().finally(() => prisma.$disconnect())
```

Add to `package.json`:
```json
"prisma": { "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts" }
```

```bash
npm install -D ts-node
npx prisma db seed
```

- [ ] **Step 11: Commit**

```bash
git add .
git commit -m "feat: add NextAuth credentials auth with login page"
```

---

## Task 4: API Key Validation Helper

**Files:**
- Create: `lib/api-auth.ts`
- Create: `lib/__tests__/api-auth.test.ts`

- [ ] **Step 1: Write failing test**

Create `lib/__tests__/api-auth.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../prisma', () => ({
  prisma: {
    site: {
      findUnique: vi.fn(),
    },
  },
}))

import { validateApiKey } from '../api-auth'
import { prisma } from '../prisma'

describe('validateApiKey', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the site when API key is valid', async () => {
    const mockSite = { id: '1', slug: 'test-site', name: 'Test' }
    vi.mocked(prisma.site.findUnique).mockResolvedValue(mockSite as any)

    const result = await validateApiKey('valid-key')
    expect(result).toEqual(mockSite)
    expect(prisma.site.findUnique).toHaveBeenCalledWith({
      where: { apiKey: 'valid-key' },
    })
  })

  it('returns null when API key is invalid', async () => {
    vi.mocked(prisma.site.findUnique).mockResolvedValue(null)
    const result = await validateApiKey('bad-key')
    expect(result).toBeNull()
  })

  it('returns null when no key provided', async () => {
    const result = await validateApiKey('')
    expect(result).toBeNull()
    expect(prisma.site.findUnique).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm run test:run -- lib/__tests__/api-auth.test.ts
```

Expected: FAIL

- [ ] **Step 3: Create `lib/api-auth.ts`**

```ts
import { prisma } from './prisma'

export async function validateApiKey(key: string) {
  if (!key) return null
  return prisma.site.findUnique({ where: { apiKey: key } })
}

export function getApiKey(request: Request): string {
  return request.headers.get('x-api-key') ?? ''
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm run test:run -- lib/__tests__/api-auth.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/api-auth.ts lib/__tests__/api-auth.test.ts
git commit -m "feat: add API key validation helper"
```

---

## Task 5: Public API Routes

**Files:**
- Create: `app/api/[siteSlug]/blogs/route.ts`
- Create: `app/api/[siteSlug]/blogs/[blogSlug]/route.ts`
- Create: `app/api/[siteSlug]/content/route.ts`
- Create: `app/api/[siteSlug]/seo/route.ts`
- Create: `app/api/[siteSlug]/revalidate/route.ts`

- [ ] **Step 1: Create blogs list route**

Create `app/api/[siteSlug]/blogs/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey, getApiKey } from '@/lib/api-auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteSlug: string }> }
) {
  const { siteSlug } = await params
  const site = await validateApiKey(getApiKey(request))
  if (!site || site.slug !== siteSlug) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const blogs = await prisma.blogPost.findMany({
    where: { siteId: site.id, status: 'PUBLISHED' },
    select: {
      id: true, title: true, slug: true, publishedAt: true,
      featuredImage: true, metaTitle: true, metaDescription: true,
    },
    orderBy: { publishedAt: 'desc' },
  })

  return NextResponse.json(blogs)
}
```

- [ ] **Step 2: Create single blog route**

Create `app/api/[siteSlug]/blogs/[blogSlug]/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey, getApiKey } from '@/lib/api-auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteSlug: string; blogSlug: string }> }
) {
  const { siteSlug, blogSlug } = await params
  const site = await validateApiKey(getApiKey(request))
  if (!site || site.slug !== siteSlug) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const blog = await prisma.blogPost.findUnique({
    where: { siteId_slug: { siteId: site.id, slug: blogSlug } },
  })

  if (!blog || blog.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(blog)
}
```

- [ ] **Step 3: Create content fields route**

Create `app/api/[siteSlug]/content/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey, getApiKey } from '@/lib/api-auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteSlug: string }> }
) {
  const { siteSlug } = await params
  const site = await validateApiKey(getApiKey(request))
  if (!site || site.slug !== siteSlug) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fields = await prisma.textField.findMany({
    where: { siteId: site.id },
    orderBy: { order: 'asc' },
    select: { key: true, value: true },
  })

  const content = Object.fromEntries(fields.map((f) => [f.key, f.value]))
  return NextResponse.json(content)
}
```

- [ ] **Step 4: Create SEO route**

Create `app/api/[siteSlug]/seo/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey, getApiKey } from '@/lib/api-auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteSlug: string }> }
) {
  const { siteSlug } = await params
  const site = await validateApiKey(getApiKey(request))
  if (!site || site.slug !== siteSlug) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const seo = await prisma.siteSEO.findUnique({ where: { siteId: site.id } })
  return NextResponse.json(seo ?? {})
}
```

- [ ] **Step 5: Create revalidate route**

Create `app/api/[siteSlug]/revalidate/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteSlug: string }> }
) {
  const { siteSlug } = await params
  const { secret, revalidateUrl, paths } = await request.json()

  const site = await prisma.site.findUnique({ where: { slug: siteSlug } })
  if (!site || site.revalidateSecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!revalidateUrl) {
    return NextResponse.json({ revalidated: false, error: 'No revalidateUrl' })
  }

  const pathsToRevalidate: string[] = paths ?? ['/']
  const results = await Promise.allSettled(
    pathsToRevalidate.map((path) =>
      fetch(`${revalidateUrl}/api/revalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, path }),
      })
    )
  )

  return NextResponse.json({ revalidated: true, paths: pathsToRevalidate })
}
```

- [ ] **Step 6: Commit**

```bash
git add app/api/
git commit -m "feat: add public API routes for blogs, content, SEO, and revalidation"
```

---

## Task 6: CRM Shell Layout

**Files:**
- Create: `app/(crm)/layout.tsx`
- Create: `components/sidebar.tsx`
- Create: `components/site-tabs.tsx`
- Create: `app/(crm)/dashboard/page.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Set dark background globally**

In `app/globals.css`, ensure:
```css
body {
  background-color: #020617; /* slate-950 */
  color: #e2e8f0;
}
```

- [ ] **Step 2: Create sidebar component**

Create `components/sidebar.tsx`:
```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

interface Site {
  id: string
  name: string
  slug: string
}

export function Sidebar({ sites, userEmail }: { sites: Site[]; userEmail: string }) {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col min-h-screen">
      <div className="px-4 py-4 border-b border-slate-800">
        <span className="text-xs text-slate-400 uppercase tracking-widest">My Sites</span>
      </div>
      <nav className="flex-1 p-3 flex flex-col gap-1">
        {sites.map((site) => {
          const isActive = pathname.startsWith(`/sites/${site.id}`)
          return (
            <Link
              key={site.id}
              href={`/sites/${site.id}/blogs`}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-base transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              🌐 {site.name}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <p className="text-slate-500 text-sm truncate mb-2">{userEmail}</p>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-red-400 text-sm hover:text-red-300"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: Create site tabs component**

Create `components/site-tabs.tsx`:
```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function SiteTabs({ siteId }: { siteId: string }) {
  const pathname = usePathname()

  const tabs = [
    { label: '📝 Blogs', href: `/sites/${siteId}/blogs` },
    { label: '✏️ Content', href: `/sites/${siteId}/content` },
    { label: '🔍 SEO', href: `/sites/${siteId}/seo` },
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
```

- [ ] **Step 4: Create CRM layout**

Create `app/(crm)/layout.tsx`:
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/sidebar'

export default async function CRMLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const sites = await prisma.site.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, slug: true },
  })

  return (
    <div className="flex min-h-screen">
      <Sidebar sites={sites} userEmail={session.user?.email ?? ''} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
```

- [ ] **Step 5: Create dashboard redirect**

Create `app/(crm)/dashboard/page.tsx`:
```tsx
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const first = await prisma.site.findFirst({ orderBy: { createdAt: 'asc' } })
  if (first) redirect(`/sites/${first.id}/blogs`)
  return (
    <div className="p-10 text-slate-400 text-lg">
      No sites yet. Ask your administrator to add a site.
    </div>
  )
}
```

- [ ] **Step 6: Update root page to redirect**

Replace `app/page.tsx`:
```tsx
import { redirect } from 'next/navigation'
export default function Home() {
  redirect('/dashboard')
}
```

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: add CRM shell with sidebar and tab navigation"
```

---

## Task 7: Cloudinary Upload Helper

**Files:**
- Create: `lib/cloudinary.ts`
- Create: `app/api/upload/route.ts`

- [ ] **Step 1: Create Cloudinary helper**

Create `lib/cloudinary.ts`:
```ts
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function uploadImage(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: 'crm' }, (error, result) => {
        if (error || !result) reject(error)
        else resolve(result.secure_url)
      })
      .end(buffer)
  })
}
```

- [ ] **Step 2: Create upload API route**

Create `app/api/upload/route.ts`:
```ts
import { auth } from '@/lib/auth'
import { uploadImage } from '@/lib/cloudinary'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const url = await uploadImage(file)
  return NextResponse.json({ url })
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/cloudinary.ts app/api/upload/
git commit -m "feat: add Cloudinary image upload endpoint"
```

---

## Task 8: Blog List Page

**Files:**
- Create: `app/(crm)/sites/[siteId]/blogs/page.tsx`
- Create: `app/(crm)/sites/[siteId]/layout.tsx`

- [ ] **Step 1: Create per-site layout with tabs**

Create `app/(crm)/sites/[siteId]/layout.tsx`:
```tsx
import { SiteTabs } from '@/components/site-tabs'

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ siteId: string }>
}) {
  const { siteId } = await params
  return (
    <div className="flex flex-col h-full">
      <SiteTabs siteId={siteId} />
      <div className="flex-1 p-6">{children}</div>
    </div>
  )
}
```

- [ ] **Step 2: Create blog list page**

Create `app/(crm)/sites/[siteId]/blogs/page.tsx`:
```tsx
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function BlogsPage({
  params,
}: {
  params: Promise<{ siteId: string }>
}) {
  const { siteId } = await params
  const site = await prisma.site.findUnique({ where: { id: siteId } })
  if (!site) notFound()

  const blogs = await prisma.blogPost.findMany({
    where: { siteId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, status: true, publishedAt: true, createdAt: true },
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">{site.name} — Blogs</h1>
        <Link
          href={`/sites/${siteId}/blogs/new`}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-base font-medium"
        >
          + New Blog
        </Link>
      </div>

      {blogs.length === 0 && (
        <p className="text-slate-400 text-base">No blog posts yet. Create your first one.</p>
      )}

      <div className="flex flex-col gap-3">
        {blogs.map((blog) => (
          <div
            key={blog.id}
            className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-5 py-4"
          >
            <div>
              <p className="text-white text-base font-medium">{blog.title}</p>
              <p className="text-slate-500 text-sm mt-1">
                {blog.status === 'PUBLISHED' && blog.publishedAt
                  ? `Published · ${new Date(blog.publishedAt).toLocaleDateString()}`
                  : `Draft · ${new Date(blog.createdAt).toLocaleDateString()}`}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span
                className={`text-sm px-3 py-1 rounded-md ${
                  blog.status === 'PUBLISHED'
                    ? 'bg-emerald-950 text-emerald-400'
                    : 'bg-amber-950 text-amber-400'
                }`}
              >
                {blog.status === 'PUBLISHED' ? 'Published' : 'Draft'}
              </span>
              <Link
                href={`/sites/${siteId}/blogs/${blog.id}`}
                className="text-slate-400 hover:text-white text-base"
              >
                Edit →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(crm\)/sites/
git commit -m "feat: add blog list page"
```

---

## Task 9: Blog Editor

**Files:**
- Create: `components/blog-editor.tsx`
- Create: `components/seo-panel.tsx`
- Create: `components/image-upload.tsx`
- Create: `app/(crm)/sites/[siteId]/blogs/new/page.tsx`
- Create: `app/(crm)/sites/[siteId]/blogs/[blogId]/page.tsx`
- Create: `app/actions/blog.ts`

- [ ] **Step 1: Create server actions for blog CRUD**

Create `app/actions/blog.ts`:
```ts
'use server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

export async function saveBlog(formData: FormData) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  const siteId = formData.get('siteId') as string
  const id = formData.get('id') as string | null
  const title = formData.get('title') as string
  const slug = (formData.get('slug') as string) || toSlug(title)
  const body = formData.get('body') as string
  const status = formData.get('status') as 'DRAFT' | 'PUBLISHED'
  const featuredImage = formData.get('featuredImage') as string | null
  const metaTitle = formData.get('metaTitle') as string | null
  const metaDescription = formData.get('metaDescription') as string | null
  const ogImage = formData.get('ogImage') as string | null

  const data = {
    title,
    slug,
    body,
    status,
    featuredImage: featuredImage || null,
    metaTitle: metaTitle || null,
    metaDescription: metaDescription || null,
    ogImage: ogImage || null,
    publishedAt: status === 'PUBLISHED' ? new Date() : null,
  }

  let blogId = id
  if (id) {
    await prisma.blogPost.update({ where: { id }, data })
  } else {
    const blog = await prisma.blogPost.create({ data: { ...data, siteId } })
    blogId = blog.id
  }

  revalidatePath(`/sites/${siteId}/blogs`)

  if (status === 'PUBLISHED') {
    const site = await prisma.site.findUnique({ where: { id: siteId } })
    if (site?.revalidateUrl) {
      await fetch(`${site.revalidateUrl}/api/revalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: site.revalidateSecret, path: '/blog' }),
      }).catch(() => {})
    }
  }

  redirect(`/sites/${siteId}/blogs/${blogId}`)
}

export async function deleteBlog(blogId: string, siteId: string) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
  await prisma.blogPost.delete({ where: { id: blogId } })
  revalidatePath(`/sites/${siteId}/blogs`)
  redirect(`/sites/${siteId}/blogs`)
}
```

- [ ] **Step 2: Create image upload component**

Create `components/image-upload.tsx`:
```tsx
'use client'
import { useState } from 'react'
import Image from 'next/image'

export function ImageUpload({
  name,
  label,
  defaultValue,
}: {
  name: string
  label: string
  defaultValue?: string | null
}) {
  const [url, setUrl] = useState(defaultValue ?? '')
  const [uploading, setUploading] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUrl(data.url)
    setUploading(false)
  }

  return (
    <div>
      <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">{label}</label>
      <input type="hidden" name={name} value={url} />
      {url ? (
        <div className="relative">
          <Image src={url} alt="uploaded" width={320} height={180} className="rounded-lg object-cover" />
          <button
            type="button"
            onClick={() => setUrl('')}
            className="mt-2 text-sm text-red-400 hover:text-red-300"
          >
            Remove
          </button>
        </div>
      ) : (
        <label className="flex items-center justify-center w-full border-2 border-dashed border-slate-700 rounded-xl py-8 cursor-pointer hover:border-indigo-500 transition-colors">
          <span className="text-slate-400 text-base">
            {uploading ? 'Uploading...' : 'Click to upload image'}
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create SEO panel component**

Create `components/seo-panel.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { ImageUpload } from './image-upload'

export function SeoPanel({
  defaultMetaTitle,
  defaultMetaDescription,
  defaultOgImage,
}: {
  defaultMetaTitle?: string | null
  defaultMetaDescription?: string | null
  defaultOgImage?: string | null
}) {
  const [metaTitle, setMetaTitle] = useState(defaultMetaTitle ?? '')
  const [metaDesc, setMetaDesc] = useState(defaultMetaDescription ?? '')

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">Meta Title</label>
        <input
          name="metaTitle"
          value={metaTitle}
          onChange={(e) => setMetaTitle(e.target.value)}
          maxLength={60}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-base focus:outline-none focus:border-indigo-500"
        />
        <p className="text-slate-500 text-sm mt-1">{metaTitle.length} / 60</p>
      </div>
      <div>
        <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">Meta Description</label>
        <textarea
          name="metaDescription"
          value={metaDesc}
          onChange={(e) => setMetaDesc(e.target.value)}
          maxLength={160}
          rows={3}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-base focus:outline-none focus:border-indigo-500 resize-none"
        />
        <p className="text-slate-500 text-sm mt-1">{metaDesc.length} / 160</p>
      </div>
      <ImageUpload name="ogImage" label="OG Image" defaultValue={defaultOgImage} />
    </div>
  )
}
```

- [ ] **Step 4: Create TipTap blog editor component**

Create `components/blog-editor.tsx`:
```tsx
'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { useState } from 'react'

function ToolbarButton({
  onClick,
  active,
  children,
}: {
  onClick: () => void
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 rounded text-base transition-colors ${
        active ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  )
}

export function BlogEditor({ defaultValue }: { defaultValue?: string }) {
  const [content, setContent] = useState(defaultValue ?? '')

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
    ],
    content: defaultValue ?? '',
    onUpdate({ editor }) {
      setContent(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none min-h-[240px] p-4 text-base text-slate-200 focus:outline-none',
      },
    },
  })

  async function insertImage() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file || !editor) return
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      editor.chain().focus().setImage({ src: data.url }).run()
    }
    input.click()
  }

  return (
    <div>
      <input type="hidden" name="body" value={content} />
      <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
        <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-700 flex-wrap">
          <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')}>
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')}>
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })}>
            H1
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })}>
            H2
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')}>
            • List
          </ToolbarButton>
          <ToolbarButton onClick={insertImage}>🖼 Image</ToolbarButton>
        </div>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create new blog page**

Create `app/(crm)/sites/[siteId]/blogs/new/page.tsx`:
```tsx
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
```

- [ ] **Step 6: Create edit blog page**

Create `app/(crm)/sites/[siteId]/blogs/[blogId]/page.tsx`:
```tsx
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
```

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: add blog editor with TipTap, image upload, and SEO panel"
```

---

## Task 10: Content (Text Fields) Editor

**Files:**
- Create: `app/(crm)/sites/[siteId]/content/page.tsx`
- Create: `app/actions/content.ts`

- [ ] **Step 1: Create server action**

Create `app/actions/content.ts`:
```ts
'use server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function saveTextFields(formData: FormData) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  const siteId = formData.get('siteId') as string
  const fields = await prisma.textField.findMany({ where: { siteId } })

  await Promise.all(
    fields.map((field) => {
      const value = formData.get(field.key) as string ?? ''
      return prisma.textField.update({
        where: { id: field.id },
        data: { value },
      })
    })
  )

  revalidatePath(`/sites/${siteId}/content`)
}
```

- [ ] **Step 2: Create content editor page**

Create `app/(crm)/sites/[siteId]/content/page.tsx`:
```tsx
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { saveTextFields } from '@/app/actions/content'

export default async function ContentPage({
  params,
}: {
  params: Promise<{ siteId: string }>
}) {
  const { siteId } = await params
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: { textFields: { orderBy: { order: 'asc' } } },
  })
  if (!site) notFound()

  if (site.textFields.length === 0) {
    return (
      <p className="text-slate-400 text-base">
        No editable content fields defined for this site yet.
      </p>
    )
  }

  return (
    <form action={saveTextFields}>
      <input type="hidden" name="siteId" value={siteId} />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Content — {site.name}</h1>
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-base font-medium"
        >
          Save Changes
        </button>
      </div>
      <div className="flex flex-col gap-5">
        {site.textFields.map((field) => (
          <div key={field.id}>
            <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">
              {field.label}
            </label>
            {field.type === 'TEXTAREA' ? (
              <textarea
                name={field.key}
                defaultValue={field.value}
                rows={4}
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
        ))}
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-base font-medium"
          >
            Save Changes
          </button>
        </div>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(crm\)/sites/\[siteId\]/content/ app/actions/content.ts
git commit -m "feat: add content text fields editor"
```

---

## Task 11: Site SEO Page

**Files:**
- Create: `app/(crm)/sites/[siteId]/seo/page.tsx`
- Create: `app/actions/seo.ts`

- [ ] **Step 1: Create server action**

Create `app/actions/seo.ts`:
```ts
'use server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function saveSiteSeo(formData: FormData) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  const siteId = formData.get('siteId') as string
  const data = {
    metaTitle: formData.get('metaTitle') as string || null,
    metaDescription: formData.get('metaDescription') as string || null,
    ogImage: formData.get('ogImage') as string || null,
  }

  await prisma.siteSEO.upsert({
    where: { siteId },
    create: { siteId, ...data },
    update: data,
  })

  revalidatePath(`/sites/${siteId}/seo`)
}
```

- [ ] **Step 2: Create SEO page**

Create `app/(crm)/sites/[siteId]/seo/page.tsx`:
```tsx
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { saveSiteSeo } from '@/app/actions/seo'
import { SeoPanel } from '@/components/seo-panel'

export default async function SeoPage({
  params,
}: {
  params: Promise<{ siteId: string }>
}) {
  const { siteId } = await params
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: { siteSeo: true },
  })
  if (!site) notFound()

  return (
    <form action={saveSiteSeo}>
      <input type="hidden" name="siteId" value={siteId} />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">SEO — {site.name}</h1>
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-base font-medium"
        >
          Save SEO
        </button>
      </div>
      <div className="max-w-xl bg-slate-900 border border-slate-800 rounded-xl p-6">
        <p className="text-slate-400 text-base mb-5">
          These are the default SEO values for <strong className="text-white">{site.name}</strong>. Individual blog posts can override them.
        </p>
        <SeoPanel
          defaultMetaTitle={site.siteSeo?.metaTitle}
          defaultMetaDescription={site.siteSeo?.metaDescription}
          defaultOgImage={site.siteSeo?.ogImage}
        />
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(crm\)/sites/\[siteId\]/seo/ app/actions/seo.ts
git commit -m "feat: add site-level SEO editor"
```

---

## Task 12: Admin Panel

**Files:**
- Create: `app/admin/layout.tsx`
- Create: `app/admin/page.tsx`
- Create: `app/admin/sites/new/page.tsx`
- Create: `app/admin/sites/[siteId]/page.tsx`
- Create: `app/admin/users/page.tsx`
- Create: `app/actions/admin.ts`

- [ ] **Step 1: Create admin server actions**

Create `app/actions/admin.ts`:
```ts
'use server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { hashPassword } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') throw new Error('Forbidden')
}

export async function createSite(formData: FormData) {
  await requireAdmin()
  const name = formData.get('name') as string
  const slug = formData.get('slug') as string
  const revalidateUrl = formData.get('revalidateUrl') as string | null
  await prisma.site.create({
    data: {
      name,
      slug,
      apiKey: randomUUID(),
      revalidateSecret: randomUUID(),
      revalidateUrl: revalidateUrl || null,
    },
  })
  revalidatePath('/admin')
  redirect('/admin')
}

export async function deleteSite(siteId: string) {
  await requireAdmin()
  await prisma.site.delete({ where: { id: siteId } })
  revalidatePath('/admin')
  redirect('/admin')
}

export async function createTextField(formData: FormData) {
  await requireAdmin()
  const siteId = formData.get('siteId') as string
  const key = formData.get('key') as string
  const label = formData.get('label') as string
  const type = formData.get('type') as 'TEXT' | 'TEXTAREA'
  const count = await prisma.textField.count({ where: { siteId } })
  await prisma.textField.create({ data: { siteId, key, label, type, order: count } })
  revalidatePath(`/admin/sites/${siteId}`)
}

export async function deleteTextField(fieldId: string, siteId: string) {
  await requireAdmin()
  await prisma.textField.delete({ where: { id: fieldId } })
  revalidatePath(`/admin/sites/${siteId}`)
}

export async function createUser(formData: FormData) {
  await requireAdmin()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const role = formData.get('role') as 'ADMIN' | 'EDITOR'
  const hashed = await hashPassword(password)
  await prisma.user.create({ data: { email, password: hashed, role } })
  revalidatePath('/admin/users')
}

export async function deleteUser(userId: string) {
  await requireAdmin()
  await prisma.user.delete({ where: { id: userId } })
  revalidatePath('/admin/users')
}
```

- [ ] **Step 2: Create admin layout with guard**

Create `app/admin/layout.tsx`:
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center gap-6">
        <span className="text-white font-bold text-lg">Admin</span>
        <Link href="/admin" className="text-slate-400 hover:text-white text-base">Sites</Link>
        <Link href="/admin/users" className="text-slate-400 hover:text-white text-base">Users</Link>
        <Link href="/dashboard" className="ml-auto text-slate-400 hover:text-white text-base">← Back to CRM</Link>
      </header>
      <main className="p-8">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Create admin sites list page**

Create `app/admin/page.tsx`:
```tsx
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { deleteSite } from '@/app/actions/admin'

export default async function AdminPage() {
  const sites = await prisma.site.findMany({ orderBy: { createdAt: 'asc' } })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Sites</h1>
        <Link
          href="/admin/sites/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-base"
        >
          + Add Site
        </Link>
      </div>
      <div className="flex flex-col gap-3">
        {sites.map((site) => (
          <div
            key={site.id}
            className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 flex items-center justify-between"
          >
            <div>
              <p className="text-white text-base font-medium">{site.name}</p>
              <p className="text-slate-500 text-sm font-mono mt-1">/api/{site.slug}/...</p>
              <p className="text-slate-600 text-xs mt-1">API Key: {site.apiKey}</p>
            </div>
            <div className="flex gap-4 items-center">
              <Link
                href={`/admin/sites/${site.id}`}
                className="text-slate-400 hover:text-white text-base"
              >
                Manage fields →
              </Link>
              <form action={deleteSite.bind(null, site.id)}>
                <button type="submit" className="text-red-400 hover:text-red-300 text-sm">
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create new site page**

Create `app/admin/sites/new/page.tsx`:
```tsx
import { createSite } from '@/app/actions/admin'

export default function NewSitePage() {
  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-white mb-6">Add New Site</h1>
      <form action={createSite} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">Site Name</label>
          <input
            name="name"
            required
            placeholder="e.g. Acme Corp"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">Slug</label>
          <input
            name="slug"
            required
            placeholder="e.g. acme-corp"
            pattern="[a-z0-9-]+"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-base font-mono focus:outline-none focus:border-indigo-500"
          />
          <p className="text-slate-500 text-sm mt-1">Lowercase letters, numbers, and hyphens only.</p>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">Client Site URL (for revalidation)</label>
          <input
            name="revalidateUrl"
            type="url"
            placeholder="e.g. https://acme-corp.vercel.app"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-indigo-500"
          />
          <p className="text-slate-500 text-sm mt-1">Optional. Used to trigger instant content updates on publish.</p>
        </div>
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-base font-medium"
        >
          Create Site
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 5: Create site text field management page**

Create `app/admin/sites/[siteId]/page.tsx`:
```tsx
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { createTextField, deleteTextField } from '@/app/actions/admin'

export default async function AdminSitePage({
  params,
}: {
  params: Promise<{ siteId: string }>
}) {
  const { siteId } = await params
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: { textFields: { orderBy: { order: 'asc' } } },
  })
  if (!site) notFound()

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-2">{site.name} — Text Fields</h1>
      <p className="text-slate-400 text-base mb-6">
        Define which sections of this site the client can edit.
      </p>

      <div className="flex flex-col gap-3 mb-8">
        {site.textFields.map((field) => (
          <div
            key={field.id}
            className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 flex justify-between items-center"
          >
            <div>
              <p className="text-white text-base font-medium">{field.label}</p>
              <p className="text-slate-500 text-sm font-mono">{field.key} · {field.type}</p>
            </div>
            <form action={deleteTextField.bind(null, field.id, siteId)}>
              <button type="submit" className="text-red-400 hover:text-red-300 text-sm">Remove</button>
            </form>
          </div>
        ))}
        {site.textFields.length === 0 && (
          <p className="text-slate-500 text-base">No fields defined yet.</p>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-white text-lg font-semibold mb-4">Add Field</h2>
        <form action={createTextField} className="flex flex-col gap-4">
          <input type="hidden" name="siteId" value={siteId} />
          <div>
            <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">Field Key</label>
            <input
              name="key"
              required
              placeholder="e.g. hero_title"
              pattern="[a-z0-9_]+"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-base font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">Label (shown to client)</label>
            <input
              name="label"
              required
              placeholder="e.g. Hero Title"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-base focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">Type</label>
            <select
              name="type"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-base focus:outline-none focus:border-indigo-500"
            >
              <option value="TEXT">Text (single line)</option>
              <option value="TEXTAREA">Textarea (multi-line)</option>
            </select>
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg text-base font-medium"
          >
            Add Field
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create users management page**

Create `app/admin/users/page.tsx`:
```tsx
import { prisma } from '@/lib/prisma'
import { createUser, deleteUser } from '@/app/actions/admin'

export default async function UsersPage() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } })

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-6">Users</h1>

      <div className="flex flex-col gap-3 mb-8">
        {users.map((user) => (
          <div
            key={user.id}
            className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 flex justify-between items-center"
          >
            <div>
              <p className="text-white text-base">{user.email}</p>
              <p className="text-slate-500 text-sm mt-1">{user.role}</p>
            </div>
            <form action={deleteUser.bind(null, user.id)}>
              <button type="submit" className="text-red-400 hover:text-red-300 text-sm">Remove</button>
            </form>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-white text-lg font-semibold mb-4">Add User</h2>
        <form action={createUser} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-base focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">Password</label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-base focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">Role</label>
            <select
              name="role"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-base focus:outline-none focus:border-indigo-500"
            >
              <option value="EDITOR">Editor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg text-base font-medium"
          >
            Create User
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Add admin link to CRM sidebar for admins**

Modify `components/sidebar.tsx` — add `isAdmin` prop and link:

Replace the `export function Sidebar` signature and add the admin link:
```tsx
export function Sidebar({
  sites,
  userEmail,
  isAdmin,
}: {
  sites: Site[]
  userEmail: string
  isAdmin: boolean
}) {
```

Add inside the `<nav>` after the sites list:
```tsx
{isAdmin && (
  <Link
    href="/admin"
    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-base text-slate-400 hover:text-white hover:bg-slate-800 mt-4 border-t border-slate-800 pt-4"
  >
    ⚙️ Admin
  </Link>
)}
```

Update `app/(crm)/layout.tsx` to pass `isAdmin`:
```tsx
<Sidebar
  sites={sites}
  userEmail={session.user?.email ?? ''}
  isAdmin={session.user.role === 'ADMIN'}
/>
```

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: add admin panel for sites, text fields, and user management"
```

---

## Task 13: Final Polish & Deployment

**Files:**
- Modify: `next.config.ts`
- Create: `vercel.json` (optional)

- [ ] **Step 1: Configure Next.js for Cloudinary images**

Update `next.config.ts`:
```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
}

export default nextConfig
```

- [ ] **Step 2: Run all tests**

```bash
npm run test:run
```

Expected: All tests pass.

- [ ] **Step 3: Run local dev server and verify all routes work**

```bash
npm run dev
```

Verify in browser (http://localhost:3000):
- `/login` — login form renders
- Login with `admin@crm.com` / `admin123` → redirects to `/dashboard`
- `/admin` — visible, can add a site
- After adding site → `/sites/[id]/blogs` loads
- Can create a new blog post with title, body, SEO fields
- Can save draft and publish
- Content tab shows text fields (if defined)
- SEO tab renders and saves
- `/api/[slug]/blogs` returns 401 without API key
- With valid API key header, returns blog list

- [ ] **Step 4: Deploy to Vercel**

```bash
npm install -g vercel
vercel --prod
```

Set environment variables in Vercel dashboard:
- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL` (your production URL)
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: configure for production deployment"
```

---

## Integration Guide for Next.js Client Sites

When adding a new client site, do the following in the Next.js project:

**1. Add env vars to the site's `.env.local`:**
```env
CRM_URL="https://your-crm.vercel.app"
CRM_API_KEY="paste-site-api-key-from-admin"
```

**2. Fetch content with ISR:**
```ts
// lib/cms.ts
const CRM_URL = process.env.CRM_URL!
const CRM_API_KEY = process.env.CRM_API_KEY!
const SITE_SLUG = 'your-site-slug'

const headers = { 'x-api-key': CRM_API_KEY }

export async function getBlogs() {
  const res = await fetch(`${CRM_URL}/api/${SITE_SLUG}/blogs`, {
    headers,
    next: { revalidate: 60 },
  })
  return res.json()
}

export async function getBlog(slug: string) {
  const res = await fetch(`${CRM_URL}/api/${SITE_SLUG}/blogs/${slug}`, {
    headers,
    next: { revalidate: 60 },
  })
  if (!res.ok) return null
  return res.json()
}

export async function getContent() {
  const res = await fetch(`${CRM_URL}/api/${SITE_SLUG}/content`, {
    headers,
    next: { revalidate: 60 },
  })
  return res.json()
}
```

**3. Add revalidation route to the Next.js site:**
```ts
// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { secret, path } = await request.json()
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  revalidatePath(path ?? '/')
  return NextResponse.json({ revalidated: true })
}
```

Add `REVALIDATE_SECRET` to the site's env (use the `revalidateSecret` value from the CRM admin panel for that site).

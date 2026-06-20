@AGENTS.md

## What This Is
Multi-tenant CRM admin panel. Each "site" (e.g. xvape) has its own slug, apiKey, products, orders, blogs, content fields, SEO, and settings. Client storefronts read data from CRM via `x-api-key` authenticated API routes. CRM runs on `localhost:3000` in dev.

## CRM Deploy Note
Only `AUTH_URL` changes when deploying CRM to production (set to the live Vercel URL). Everything else in `.env` stays the same.

## Payper Integration — How Selling Price Works
- **Selling price comes from Payper's webhook PUSH only** — Payper pushes a `price` field (selling price) with every product update.
- `/get_inventories` does NOT contain selling price — only `purchase_cost`. Do not waste time looking there.
- `customer_price_list` API returns empty (no custom price lists configured). Dead end.
- `customer_last_price` returns last sold price to a customer — NOT the current catalog price. Do not use.
- The proof is in `wc-webhooks/debug.log` — Payper pushes: `price` (selling), `cost` (purchase), `total_available_quantity`, `category_name`, `image_url`, `is_active`
- Reference plugin that receives these pushes: `wc-webhooks/wc_webhooks.php` (the client's WooCommerce plugin)
- Webhook receiver: `app/api/[siteSlug]/payper-webhook/route.ts` — validates `identifier`, filters by `site.payperCategories`, upserts by `payperSku`, new products start `active: false`.
- Payper payload fields: `identifier`, `product_sku`, `product_name`, `price`, `cost`, `total_available_quantity`, `category_name`, `image_url`, `is_active`
- Payper API (`api.payper.co.il`) requires IP whitelist — local dev cannot call it. Use ngrok or deploy to test real webhooks.
- Image URLs from Payper (`app.payper.co.il/rails/active_storage/...`) domain is whitelisted in `next.config.ts`. Real URLs only arrive via actual webhook push.

## Prisma Gotchas
- Array fields with `@default([])` return `null` on existing rows — always use `?? []` when reading `String[]` fields.

## PowerShell + Hebrew / Non-ASCII
- Sending Hebrew in PowerShell HTTP body requires explicit UTF-8 encoding: `$bytes = [System.Text.Encoding]::UTF8.GetBytes($json); Invoke-WebRequest -Body $bytes -ContentType "application/json; charset=utf-8"`

## URL Handles with Non-ASCII (Hebrew)
- Use unicode regex with `/gu` flag to preserve Hebrew in slugs — `\w` only matches ASCII. Pattern: `.replace(/[^\p{L}\p{N}-]/gu, '')`

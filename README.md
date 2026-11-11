# Life & Etc. studio

Barcode, label, and inventory workspace for Life & Etc. LLC. Square remains the source of truth for catalog prices and stock. Label names, templates, and printer setup stay in this app.

## Setup

From the `dashboard` folder:

```bash
npm install
npm run setup
npm run dev
```

Open http://localhost:3000.

If `SQUARE_ACCESS_TOKEN` is empty, the app opens a labeled demo catalog. Demo rows are deleted when the first real Square import succeeds. They are never shown beside Square products.

## Square

Create a personal access token in the Square Developer Console with:

- `ITEMS_READ`
- `ITEMS_WRITE`
- `INVENTORY_READ`
- `INVENTORY_WRITE`
- `MERCHANT_PROFILE_READ`

Put it in `.env` as `SQUARE_ACCESS_TOKEN`. Use `SQUARE_ENVIRONMENT=sandbox` for a sandbox token. The token is read only on the server.

The installed `square` SDK targets Square API version **2026-09-16**. Catalog writes send the complete item Square returns, then change only the field you edited. Prices and stock are not updated locally unless Square accepts the write, except in demo mode, which says so.

Webhooks are verified with Square’s signature helper when `SQUARE_WEBHOOK_SIGNATURE_KEY` and `SQUARE_WEBHOOK_NOTIFICATION_URL` are set. Duplicate `event_id`s are ignored. Without a public HTTPS URL, use **Sync now**. The open studio also reconciles about every 10 minutes.

OAuth is not implemented. `squareClient()` is the only place that reads the token, so a later OAuth lookup can replace it.

## Printing

The LabelWriter 450 Turbo only prints from software on this Mac.

1. Install and open [DYMO Connect](https://www.dymo.com/support).
2. In the browser, allow local network access for this site. Chrome blocks `localhost` services until you do.
3. Enter the real label width and height under Settings → Label sizes. The 54 × 25 mm preset is a starting size, not a guess about stock you bought.
4. Print a calibration PDF at **100% scale**. Do not use “fit to page.”
5. Direct printing uses DYMO’s local web service through `dymo.connect.framework.js`. If that service is not running, the app shows the error and the PDF path still works.

A hosted website cannot silently send a job to a USB printer.

## Barcode checkout test

Code 128 of the SKU is the default. It is not marked compatible with your Square hardware until you print one label, scan it at checkout, and record a match under Settings → Barcode test. GTINs are never invented or overwritten.

## Scripts

- `npm run dev` — local studio
- `npm run setup` — create `.env` if needed and apply database migrations
- `npm test` — barcode, price, Square mapping, label size, and inventory-operation tests
- `npm run lint`

## Before you put this on the internet

Set `APP_ACCESS_PASSWORD` and `SESSION_SECRET`. Production refuses to boot the private pages without a password. Keep `.env` out of git.

### Netlify

The repo includes `netlify.toml` for the official Next.js runtime. **Environment variables are not in git.** In Netlify → **Site configuration → Environment variables** (scope: **Production**), set at least:

- `APP_ACCESS_PASSWORD`
- `SESSION_SECRET`
- `SQUARE_ACCESS_TOKEN`
- `SQUARE_ENVIRONMENT` = `production`
- `DATABASE_URL` = `file:/tmp/life-etc.db`

Then **Clear cache and deploy site**. Alternatively, from this Mac after `netlify link`, run `npm run netlify:env` to copy your local `.env` values into the linked Netlify site.

## Physical checks

These are not automated:

- DYMO Connect is running on this Mac
- The LabelWriter 450 Turbo is listed
- The saved label size matches the roll in the printer
- The calibration 10 mm line measures 10 mm
- Square checkout finds the correct item and price from a printed sample

# Ootybites — frontend

Next.js (App Router) storefront, admin panel and dealer app. See `CLAUDE.md`
for the non-negotiable domain rules and `docs/ARCHITECTURE.md` for the blueprint.

## Run locally

```bash
cp .env.example .env.local   # set NEXT_PUBLIC_API_BASE_URL
npm install
npm run dev                  # http://localhost:3000
```

Start the Go backend first. With the API down every screen waits on a failed
connection (~2s on Windows) and then shows an error — it is not the frontend
being slow.

## Staging (Vercel)

Vercel detects Next.js; no config needed. **Set the root directory to `frontend`
if this repo is ever nested.**

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | the Railway URL + `/api`, e.g. `https://<svc>.up.railway.app/api` |
| `NEXT_PUBLIC_SITE_URL` | the Vercel URL until a domain is bought — drives canonicals, sitemap and OG tags |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | optional; without it the address picker degrades to manual entry |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | optional; `DEMO_MAP_ID` is used otherwise — create a real one before launch |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | optional |

Every `NEXT_PUBLIC_*` value is **inlined at build time**, so changing one needs a
redeploy, not just a restart.

### Before a domain is bought

`NEXT_PUBLIC_SITE_URL` feeds canonical URLs, `sitemap.xml`, `robots.txt` and the
OpenGraph tags. Pointing it at the Vercel preview URL is correct for staging, but
**do not let search engines index that URL** — set it to the real domain (and
redeploy) at launch, or the preview host gets indexed instead.

Add the deployed origin to the Maps API key's HTTP-referrer restrictions, or the
map silently falls back to manual entry with `RefererNotAllowedMapError`.

## Brand assets

`public/brand/*` is **generated** — do not hand-edit. Run:

```bash
node scripts/build-brand.mjs
```

Sources live in `brand-kit/source/`. The tagline is **"FROM OOTY TO HOME"**; the
supplied black artwork says "FROM CHENNAI TO HOME" and is wrong — the pipeline
splices in the correct line. See `brand-kit/brand-export/README.txt`.

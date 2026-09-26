# GenMeta — Metadata Intelligence Platform (UI)

Rplus Analytics · GenMeta SaaS front end. React 18 + Vite, white-and-blue GenMeta brand theme.
The Data Estate (2D skyline / 3D city) from `genmeta-estate_v3.html` is built into the dashboard.

## Run on localhost

Needs **Node.js 18 or newer** (https://nodejs.org).

```bash
cd genmeta-platform
npm install
npm run dev
```

Your browser opens at **http://localhost:5173**. On Windows you can double-click `start.bat` instead; on macOS/Linux run `./start.sh`.

To build a production bundle: `npm run build` (output in `dist/`), then `npm run preview`.

## Screens

| Route | Screen |
|---|---|
| `/` | **Dashboard**: 4 KPIs (systems connected, tables, fields, estate size), the live Data Estate with a 2D/3D toggle, source systems, agent activity, tables by system, standards alignment |
| `/data-estate` | Full-screen Data Estate. Deep links: `?mode=3d`, `?open=snowflake` |
| `/sources` | Data Sources: connected sources, ingestion health and source cards |
| `/catalogue` | Data Catalogue: searchable table inventory |
| `/graph` | Knowledge Graph: systems → tables, with hover tracing |
| `/ask` | Ask GenMeta: conversational search (canned answers in this UI build) |
| `/governance` · `/classification` · `/products` · `/stewardship` | Govern section |

Clicking a building on the dashboard, or a row in *Source systems*, opens that source's drill-down in the full estate view.

## Project layout

```
public/
  brand/            GenMeta and Rplus logo assets (cropped from the supplied lockup)
  estate/           Data Estate view (the original estate code) + local three.js r128
src/
  data.js           sample estate data: one source of truth for every screen
  styles.css        design system: colour tokens, cards, KPIs, tables
  components/       Sidebar (with Rplus product switcher), Topbar, shared UI
  pages/            one file per screen
```

## Wiring to the GenMeta backend

All figures come from `src/data.js` and from `SOURCES` in `public/estate/index.html`, and the two sets match.
To go live, replace both with calls to the FastAPI service, for example `GET /api/estate/sources`, and pass the
same response into the estate iframe through `postMessage`.

## Brand tokens

| Token | Hex | Use |
|---|---|---|
| navy | `#0B1A4A` | text, "Gen" wordmark |
| deep | `#14307A` | gradients |
| royal | `#1F5FD6` | primary actions |
| electric | `#2F86F6` | accents |
| sky | `#38C6F4` | burst core, live states |
| ice / mist | `#EAF3FF` / `#F4F8FE` | surfaces |

## Host it publicly

The app is a static site: `npm run build` writes everything to `dist/`.
Page addresses such as `/app/catalogue/1006` are handled by the app itself, so the host
must send unknown paths to `index.html`. That is already configured:

- `vercel.json` for Vercel
- `public/_redirects` for Netlify and Cloudflare Pages

**Vercel:** push this folder to a GitHub repo, then Vercel → Add New → Project → import the repo.
It picks up `vercel.json`, so just press Deploy. Add your own domain under
Project → Settings → Domains and create the CNAME record it shows you.

**Netlify / Cloudflare Pages:** build command `npm run build`, output folder `dist`.

Note: sign-in is a front-end demo and accepts any details. Put the site behind
Vercel password protection or Cloudflare Access if it should not be open to everyone.

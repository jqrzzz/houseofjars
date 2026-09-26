# House of Jars

The website of House of Jars Hostel, a calm dorm hostel in Ban Anou, central Vientiane, owned and run by Nang. It will live at [thehouseofjars.com](https://thehouseofjars.com).

Every page is static HTML. Two small APIs sit behind it: **Shadow**, the house's AI concierge (Claude), and the **booking inquiry form**, which forwards messages to Shadow Check-in, the system the house uses to run the front desk.

## Run it

Node 22 (see `.nvmrc`).

```bash
npm ci
cp .env.example .env.local   # optional: without keys the site works and both features fall back to contact details
npm run dev                  # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm run start` | Production build and server |
| `npm run lint` | ESLint (Next.js core web vitals and TypeScript rules) |
| `npm run typecheck` | Generates Next's route types, then `tsc --noEmit` (strict) |
| `npm test` | Vitest unit tests |
| `npm run content:check` | Lists every fact the house has not confirmed yet (`-- --strict` fails if any remain) |
| `npm run smoke` | Browser smoke test against a running server (see below) |

### Smoke test

```bash
npm run build && npm run start -- -p 3000
BASE_URL=http://localhost:3000 npm run smoke   # in a second terminal
```

It visits every page at 390 × 844 and 1440 × 900 in light and dark mode and checks the status code, console errors, a single `h1`, valid JSON-LD, canonical and Open Graph tags, and sideways scrolling. It also opens Shadow and tries the booking form. Screenshots go to `./screenshots` (git-ignored). It drives the Chromium at `CHROMIUM_PATH` (default `/opt/pw-browsers/chromium`) through `playwright-core` and never downloads a browser.

## Environment

All optional. See `.env.example`.

| Variable | Used for |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, sitemap, Open Graph. Defaults to `https://thehouseofjars.com`. |
| `ANTHROPIC_API_KEY` | Shadow, the concierge. Without it `/api/concierge` answers `503 {"error":"not_configured"}` and the chat window shows the team's WhatsApp and email. |
| `CONCIERGE_MODEL` | The Claude model for Shadow. Defaults to `claude-opus-5`. |
| `CONCIERGE_DAILY_TOKEN_BUDGET` | Shadow's daily spending ceiling per server instance, in input-token equivalents. Defaults to 1,000,000 (about US$5 a day at Claude Opus 5 list prices); `0` keeps Shadow resting. |
| `SHADOW_API_URL`, `SHADOW_INQUIRY_KEY` | Where inquiries go (Shadow Check-in) and the property's inbound key. Without both, `/api/inquiry` answers `503` and the form shows the contact details instead. |
| `SHADOW_APP_URL` | Where the team signs in to Shadow Check-in. Read at build time; when set (https only), the footer shows a small "Team sign in" link, otherwise it is hidden. |

## How it is built

- **Next.js 16** (App Router, React 19, TypeScript strict), plain CSS with custom-property tokens and CSS Modules. Fonts are self-hosted from `@fontsource`: Young Serif, Hanken Grotesk and Noto Serif Lao.
- **Content** lives in `content/*.ts`, one typed source of truth for the pages, JSON-LD, `/llms.txt` and Shadow's knowledge. Every fact carries `confirmed` and `source`; nothing unconfirmed is dressed up as certain, and unknowns are left out. See [docs/CONTENT.md](docs/CONTENT.md).
- **Brand and art**: the jar mark (`components/brand/jar-shape.ts`, also `public/brand/jar.svg` and `app/icon.svg`, drawn once per page as a symbol) and the woven bands (`components/brand/TextileBand.tsx`, tiles in `public/brand/textile-*.svg`). The home hero's landscape, "Mekong dawn", is generated from `components/art/mekong-dawn.ts` and `components/art/stone-jar.ts` (the same geometry draws the Open Graph images, `lib/og.tsx`). The illustration set in `public/art/` (listed in `components/art/drawings.ts`) stands in for photographs, which swap in through `components/PhotoFrame.tsx`; each file carries its own night colours. `/the-house` shows the house in section with numbered notes (`components/house/`), labelled as an illustration until the real layout is known. Shadow is drawn flat in SVG (`components/shadow/`) everywhere except the home page's "Ask Shadow" section, which keeps the 3D mascot. Pages cross-fade with React's `<ViewTransition>` (`app/layout.tsx`); budgets: text as the LCP element, no raster above the fold, about 20 kB of inline SVG per page at most.
- **Shadow** (`lib/concierge/`, `app/api/concierge`): the chat window (`components/concierge/`) loads only when a guest first opens it. The route validates the conversation, rate-limits per IP, and streams Claude's reply as newline-delimited JSON. It uses the official `@anthropic-ai/sdk` with adaptive thinking at low effort, a cached system prompt built from the content layer, and server-side refusal fallbacks. Shadow has one tool, `prepare_inquiry`, and it sends nothing: it turns what the guest said into a draft, signed by the server, that the chat window shows in full. Only the guest's own Send, after ticking the privacy box for that message, delivers it (`POST /api/concierge/send`), and the server sends exactly that draft, through the same code as the booking form, with no model call. The server signs each of Shadow's replies; the browser sends the signature back with the reply, and only signed replies reach Claude again as Shadow's own words, so a guest can't forge earlier turns. A reply that starts quoting a price (the house knowledge has none) is cut off and replaced with the standard line pointing to Booking.com and Agoda. Spend has a hard ceiling: `max_tokens` is 2,048 per call, a conversation gets at most 20 guest messages, and each call reserves its worst case from a daily budget per server instance (`lib/concierge/budget.ts`) before it starts; when the budget is spent Shadow "rests" until midnight in Vientiane and the chat window shows the team's WhatsApp and email.
- **Inquiries** (`lib/inquiry/`, `app/api/inquiry`): validated with zod against the contract in [docs/INQUIRY_API.md](docs/INQUIRY_API.md), then forwarded server-side to Shadow Check-in with the property's key.
- **Rate limits** are in-memory token buckets (`lib/rate-limit.ts`) keyed on the client's IPv4 address or IPv6 /64. Inquiries from the form and from Shadow share one gate (`lib/inquiry/gate.ts`) that stays strictly inside Shadow Check-in's 30-an-hour limit for the website's key; the numbers on both sides are in [docs/INQUIRY_API.md](docs/INQUIRY_API.md). On serverless hosting each instance keeps its own buckets; if abuse becomes a problem, move them to a shared store such as Redis. The API routes accept only JSON from the site's own pages (`rejectCrossSite` in `lib/http.ts`).
- **Security headers** (`next.config.ts`): a Content-Security-Policy that keeps every page static (Next's "without nonces" variant: inline scripts allowed, everything else only from this site, no framing, no plugins), HSTS, nosniff, Referrer-Policy, Cross-Origin-Opener-Policy and Permissions-Policy.
- **Search and AI assistants**: every fact is in the server-rendered HTML; `app/robots.ts` welcomes search and AI crawlers; `app/sitemap.ts`; `/llms.txt` (an optional convention, built from the same content). JSON-LD describes the Hostel and the WebSite, with no self-serving review markup.

No payment is taken on the site: bookings happen on Booking.com and Agoda, or by talking to the team.

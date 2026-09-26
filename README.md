# House of Jars

The website of House of Jars Hostel, a calm dorm hostel in Ban Anou, central Vientiane, owned and run by Nang. It will live at [thehouseofjars.com](https://thehouseofjars.com).

Every page is static HTML. Small APIs sit behind it: **Shadow**, the house's AI concierge (Claude); the **message form**, which forwards messages to Shadow Check-in, the system the house uses to run the front desk; and **online booking**, which shows free beds and sends booking requests to Shadow Check-in for the team to confirm (the guest pays at the house).

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
| `npm run fake-shadow` | A stand-in for Shadow Check-in's public API on port 4010, to try online booking locally ([docs/BOOKING_API.md](docs/BOOKING_API.md)) |
| `npm run indexnow` | After a deploy: tells Bing and the other IndexNow search engines which pages changed (see [docs/SEO.md](docs/SEO.md)) |

### Smoke test

```bash
npm run build && npm run start -- -p 3000
BASE_URL=http://localhost:3000 npm run smoke   # in a second terminal
```

It visits every page, guides included, at 390 × 844 and 1440 × 900 in light and dark mode and checks the status code, console errors, a single `h1`, the title, canonical and Open Graph tags, sideways scrolling, and the page's JSON-LD (valid against the schema.org types the site uses, and stating no fact that isn't firm). It checks the sitemap, `llms.txt`, `llms-full.txt`, the logo and the IndexNow key file, that a `/book?check_in=…` link fills in the form, then opens Shadow and tries the message form. Without Shadow Check-in, `/book` must offer only the booking sites and the message form. Screenshots go to `./screenshots` (git-ignored). It drives the Chromium at `CHROMIUM_PATH` (default `/opt/pw-browsers/chromium`) through `playwright-core` and never downloads a browser.

To walk online booking too, build and start the site against a fake Shadow Check-in that the smoke test runs itself (`test/fake-shadow.ts`, its rooms and rates are test fixtures):

```bash
export SHADOW_API_URL=http://127.0.0.1:4010 SHADOW_INQUIRY_KEY=sck_fakeShadowCheckinKeyForLocalTestsOnly000000
npm run build && npm run start -- -p 3000
BASE_URL=http://localhost:3000 FAKE_SHADOW_PORT=4010 npm run smoke   # in a second terminal, same variables
```

It then books on a phone (light and dark) and a desktop, choosing the dates by keyboard, checks what the fake received, and tries beds taken while booking (409), booking closed (503) and a busy line (429). Against a real Shadow Check-in it books nothing and sends nothing.

## Environment

All optional. See `.env.example`.

| Variable | Used for |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, sitemap, Open Graph. Defaults to `https://thehouseofjars.com`. |
| `ANTHROPIC_API_KEY` | Shadow, the concierge. Without it `/api/concierge` answers `503 {"error":"not_configured"}` and the chat window shows the team's WhatsApp and email. |
| `CONCIERGE_MODEL` | The Claude model for Shadow. Defaults to `claude-opus-5`. |
| `CONCIERGE_DAILY_TOKEN_BUDGET` | Shadow's daily spending ceiling per server instance, in input-token equivalents. Defaults to 1,000,000 (about US$5 a day at Claude Opus 5 list prices); `0` keeps Shadow resting. |
| `SHADOW_API_URL`, `SHADOW_INQUIRY_KEY` | Shadow Check-in's address and the property's inbound key: where messages and booking requests go. With both, `/book` offers online booking (read when the site is built: redeploy after setting them). Without both, `/api/inquiry`, `/api/availability` and `/api/booking` answer `503`, and `/book` shows the booking sites and the message form, which falls back to the contact details. |
| `SHADOW_APP_URL` | Where the team signs in to Shadow Check-in. Read at build time; when set (https only), the footer shows a small "Team sign in" link, otherwise it is hidden. |
| `GOOGLE_SITE_VERIFICATION`, `BING_SITE_VERIFICATION` | Verification tags for Google Search Console and Bing Webmaster Tools. Read at build time; unset, no tag. |
| `INDEXNOW_KEY` | The IndexNow key the site serves at `/indexnow-key.txt` (404 until set) and `npm run indexnow` uses. |

## How it is built

- **Next.js 16** (App Router, React 19, TypeScript strict), plain CSS with custom-property tokens and CSS Modules. Fonts are self-hosted from `@fontsource`: Young Serif, Hanken Grotesk and Noto Serif Lao.
- **Content** lives in `content/*.ts`, one typed source of truth for the pages, JSON-LD, `/llms.txt` and Shadow's knowledge. Every fact carries `confirmed` and `source`; nothing unconfirmed is dressed up as certain, and unknowns are left out. See [docs/CONTENT.md](docs/CONTENT.md).
- **Brand and art**: the jar mark (`components/brand/jar-shape.ts`, also `public/brand/jar.svg` and `app/icon.svg`, drawn once per page as a symbol) and the woven bands (`components/brand/TextileBand.tsx`, tiles in `public/brand/textile-*.svg`). The home hero's landscape, "Mekong dawn", is generated from `components/art/mekong-dawn.ts` and `components/art/stone-jar.ts` (the same geometry draws the Open Graph images, `lib/og.tsx`). The illustration set in `public/art/` (listed in `components/art/drawings.ts`) stands in for photographs, which swap in through `components/PhotoFrame.tsx`; each file carries its own night colours. `/the-house` shows the house in section with numbered notes (`components/house/`), labelled as an illustration until the real layout is known. Shadow is drawn flat in SVG (`components/shadow/`) everywhere except the home page's "Ask Shadow" section, which keeps the 3D mascot. Pages cross-fade with React's `<ViewTransition>` (`app/layout.tsx`); budgets: text as the LCP element, no raster above the fold, about 20 kB of inline SVG per page at most.
- **Shadow** (`lib/concierge/`, `app/api/concierge`): the chat window (`components/concierge/`) loads only when a guest first opens it. The route validates the conversation, rate-limits per IP, and streams Claude's reply as newline-delimited JSON. It uses the official `@anthropic-ai/sdk` with adaptive thinking at low effort, a cached system prompt built from the content layer, and server-side refusal fallbacks. Shadow has one tool, `prepare_inquiry`, and it sends nothing: it turns what the guest said into a draft, signed by the server, that the chat window shows in full. Only the guest's own Send, after ticking the privacy box for that message, delivers it (`POST /api/concierge/send`), and the server sends exactly that draft, through the same code as the booking form, with no model call. The server signs each of Shadow's replies; the browser sends the signature back with the reply, and only signed replies reach Claude again as Shadow's own words, so a guest can't forge earlier turns. A reply that starts quoting a price (the house knowledge has none) is cut off and replaced with the standard line pointing to Booking.com and Agoda. Spend has a hard ceiling: `max_tokens` is 2,048 per call, a conversation gets at most 20 guest messages, and each call reserves its worst case from a daily budget per server instance (`lib/concierge/budget.ts`) before it starts; when the budget is spent Shadow "rests" until midnight in Vientiane and the chat window shows the team's WhatsApp and email.
- **Inquiries** (`lib/inquiry/`, `app/api/inquiry`): validated with zod against the contract in [docs/INQUIRY_API.md](docs/INQUIRY_API.md), then forwarded server-side to Shadow Check-in with the property's key.
- **Online booking** (`lib/booking/`, `app/api/availability`, `app/api/booking`, `components/book/BookingFlow.tsx`): the website side of the booking contract in [docs/BOOKING_API.md](docs/BOOKING_API.md). `/book` becomes a step-by-step booking ticket (an accessible date-range calendar on the house's days in Vientiane, the free beds each night, prices only when Shadow Check-in returns them, the guest's details, a review, then a reference and what happens next). Availability is cached for 60 seconds per query; both routes are rate-limited strictly inside Shadow Check-in's limits. The form's JavaScript is its own chunk (`components/book/OnlineBooking.tsx`), fetched on `/book` only when online booking is on; without Shadow Check-in the page is the booking sites and the message form.
- **Rate limits** are in-memory token buckets (`lib/rate-limit.ts`) keyed on the client's IPv4 address or IPv6 /64. Inquiries from the form and from Shadow share one gate (`lib/inquiry/gate.ts`) that stays strictly inside Shadow Check-in's 30-an-hour limit for the website's key; booking requests and availability lookups have their own (`lib/booking/limits.ts`). The numbers on both sides are in [docs/INQUIRY_API.md](docs/INQUIRY_API.md) and [docs/BOOKING_API.md](docs/BOOKING_API.md). On serverless hosting each instance keeps its own buckets; if abuse becomes a problem, move them to a shared store such as Redis. The API routes accept only JSON from the site's own pages (`rejectCrossSite` in `lib/http.ts`).
- **Security headers** (`next.config.ts`): a Content-Security-Policy that keeps every page static (Next's "without nonces" variant: inline scripts allowed, everything else only from this site, no framing, no plugins), HSTS, nosniff, Referrer-Policy, Cross-Origin-Opener-Policy and Permissions-Policy.
- **Search and AI assistants** ([docs/SEO.md](docs/SEO.md)): every fact is in the server-rendered HTML. Each page carries one JSON-LD graph (`lib/structured-data.ts`: the WebSite, the Hostel, the page and its breadcrumbs) built only from firm facts (`content/certainty.ts`), checked against schema.org by `test/schema-org.ts`. Answer-first guides live in `content/guides.ts` and render at `/guides/…`. Titles and descriptions are in `lib/site.ts`, the full page list with dates in `lib/pages.ts` (sitemap `lastmod`). `app/robots.ts` welcomes search and AI crawlers; `/llms.txt` and `/llms-full.txt` (`lib/llms.ts`) give assistants the same content as text; `/book?check_in=…&check_out=…&guests=…` fills in the message form; IndexNow and search-engine verification come from env.

No payment is taken on the site: guests book on `/book` and pay at the house (once Shadow Check-in is connected), on Booking.com or Agoda, or by talking to the team.

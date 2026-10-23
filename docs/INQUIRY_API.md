# Inquiry API (website → Shadow Check-in)

The booking form and Shadow, the concierge, send guest inquiries to Shadow Check-in. Both sides must match this contract exactly.

## Endpoint

`POST {SHADOW_API_URL}/api/public/inquiries`

- **Auth:** `Authorization: Bearer <property inbound key>`. Keys look like `sck_` followed by 43 characters of base64url (32 random bytes). Shadow stores only `sha256(key)` in hex, maps it to the property, and supports revoking it.
- The website keeps the key in the environment variable `SHADOW_INQUIRY_KEY` and calls Shadow only from the server. The key never reaches the browser.

## Request body

JSON. Unknown keys are rejected; strings are trimmed.

```jsonc
{
  "client_ref": "uuid",                  // required; idempotency key
  "source": "website_form",              // or "website_concierge"
  "name": "Mai",                         // 1–120 characters
  "email": "mai@example.com",            // valid email, or null
  "phone": "+856 20 1234 5678",          // 5–40 characters (WhatsApp or phone, E.164 preferred), or null
  "preferred_contact": "email",          // "email" | "whatsapp" | "phone" | null
  "check_in": "2026-10-03",              // YYYY-MM-DD or null
  "check_out": "2026-10-05",             // YYYY-MM-DD or null; after check_in when both are set
  "guests": 1,                           // integer 1–20, or null
  "bed_preference": null,                // up to 80 characters, or null
  "message": "Is there a bed on the 3rd?", // 1–4000 characters
  "conversation_summary": null,          // concierge only: a short summary (≤ 4000), never the raw transcript
  "consent": true                        // required literal true: the guest accepted the privacy notice
}
```

At least one of `email` and `phone` is required. The website also keeps `check_in` and `check_out` between yesterday in Vientiane and two years ahead (`dateWindow` in `lib/inquiry/schema.ts`), so the form and Shadow's drafts never carry a past date or a mistaken year.

## Responses

| Status | Body | Meaning |
| --- | --- | --- |
| 201 | `{"id": "<uuid>", "status": "received"}` | Stored. |
| 200 | same | This `client_ref` was already received for the property (idempotent retry). |
| 400 | `{"error": "invalid_request", "issues": [...]}` | The body does not match the contract. |
| 401 | `{"error": "unauthorized"}` | Missing, unknown or revoked key. |
| 413 | | Body over 16 KB. |
| 429 | `{"error": "rate_limited"}` | Too many inquiries for this key (30 in any rolling hour). |
| 503 | `{"error": "not_configured"}` | Shadow cannot accept inquiries right now. |

## How the website uses it

- **Booking form** → `POST /api/inquiry` on the website (`lib/inquiry/handler.ts`). The form sends everything except `source` and `conversation_summary`; the server validates it (`lib/inquiry/schema.ts`), sets `source: "website_form"` and forwards it. The browser keeps one `client_ref` per inquiry, so a retry after a network failure cannot create a duplicate.
- **Shadow** → the `prepare_inquiry` tool (`lib/concierge/tool.ts`), then `POST /api/concierge/send` (`lib/concierge/send.ts`). The tool sends nothing. The model supplies the guest's details but never `client_ref`, `source` or `consent`; the server builds a draft with a fresh `client_ref` and `source: "website_concierge"`, signs it (HMAC bound to the conversation) and the chat window shows every field. Only when the guest ticks the privacy box for that message and presses Send does the browser post the draft and its signature back; the server checks the signature and sends exactly that draft with `consent: true`, with no model call. Sending the same draft again reuses its `client_ref` (Shadow answers 200); a corrected draft gets a new one.
- Both paths call `submitInquiry` (`lib/inquiry/submit.ts`), which validates against the full contract before anything leaves the server.

Both website routes accept only `application/json` from the site's own pages (`Sec-Fetch-Site` and `Origin` are checked when a browser sends them), so another website can't make its visitors' browsers file inquiries.

## Rate limits on both sides

The website has one inbound key for the booking form and Shadow together, so the website's own limits are set strictly inside Shadow's.

| Where | Limit | Code |
| --- | --- | --- |
| Shadow Check-in, per inbound key | At most **30 inquiries in any rolling hour**. A resend of a `client_ref` it already has is answered 200 and not counted. Over the limit it answers 429. | `HOURLY_LIMIT` in Shadow's `lib/inquiries/contract.ts`; checked in its inquiry-intake function (migration 017) |
| Website, per client (an IPv4 address or an IPv6 /64) | 3 at once, then one every 20 minutes: **at most 6 in any hour** | `PER_CLIENT` in `lib/inquiry/gate.ts` |
| Website, per server instance (every client together) | 10 at once, then one every 6 minutes: **at most 20 in any hour** | `PER_INSTANCE` in `lib/inquiry/gate.ts` |

- Both website limits count only valid inquiries that would reach Shadow, so a guest fixing a typo is never locked out, and they are shared by `/api/inquiry` and `/api/concierge/send`.
- One client can use at most a fifth of the key's hourly quota, and one server instance never reaches it. Serverless hosting may run several instances, each with its own count; Shadow's limit is then the backstop, and its 429 is shown to guests as "busy", never as their own fault.
- The client address is the last `X-Forwarded-For` entry (Vercel sets it to the address it saw). Behind any other proxy or CDN that proxy must set it; otherwise many guests would share one address.

## What the guest sees

| Shadow answers | The website answers | The page shows |
| --- | --- | --- |
| 201 / 200 | 201 / 200 | "Your message is with the team." |
| 400, 413 | 400 | "Please check the form and try again." The website validates first (problems are shown next to each field), so Shadow should never see an invalid body. |
| (the website's per-client limit) | 429 `rate_limited` | "You have sent several messages in a short time. Please wait a few minutes", with WhatsApp and email. |
| 429, or the website's per-instance limit | 503 `busy` | "Our message line is busy right now", with WhatsApp and email. |
| 503, or not configured on the website | 503 `not_configured` | "Messages can't be sent from this form at the moment", with WhatsApp and email. |
| 401, 5xx, network error | 502 `unavailable` | "We couldn't send your message just now", with WhatsApp and email. |

## Try it

```bash
curl -i "$SHADOW_API_URL/api/public/inquiries" \
  -H "Authorization: Bearer $SHADOW_INQUIRY_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "client_ref": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "source": "website_form",
    "name": "Test Guest",
    "email": "test@example.com",
    "phone": null,
    "preferred_contact": "email",
    "check_in": null,
    "check_out": null,
    "guests": null,
    "bed_preference": null,
    "message": "Testing the inquiry API.",
    "conversation_summary": null,
    "consent": true
  }'
```

Sending the same body again returns `200` with the same `id`.

## Website counts (Insights › Website in Shadow)

With a key of the house's (its own, or the inquiry key), the website tells Shadow how it is used: each page it shows and, on the first page of a visit, where the visit came from, its country and the kind of device; and for Shadow the concierge, each talk begun, each question, each look at free beds and each talk sent to the team. Nothing about the visitor is sent or kept: no IP address, no cookie, no identifier, nothing anyone typed. Shadow keeps only each day's totals (its `migrations/086_site_counts.sql`; the contract is in its `docs/INQUIRY_API.md`, "Website counts").

`POST {SHADOW_API_URL}/api/public/site-counts`, `Authorization: Bearer <SHADOW_STATS_KEY or SHADOW_INQUIRY_KEY>`:

```jsonc
{ "counts": [
  { "measure": "view" },
  { "measure": "page", "value": "/menu" },          // one of the site's own paths (lib/pages.ts), else "other"
  { "measure": "visit" },                           // the first page of a visit only, with the three below
  { "measure": "source", "value": "chatgpt" },      // lib/stats/sources.ts: a name Shadow knows, another site's domain, or "direct"
  { "measure": "country", "value": "th" },          // Vercel's x-vercel-ip-country, when it says
  { "measure": "device", "value": "phone" }         // "phone", "tablet" or "computer", from the user agent
] }
```

- **Pages** → `components/stats/PageCounter.tsx` (in the root layout) posts `{path}` to the site's own `POST /api/page-view` on every page, and on the first page the browser loads also `landing`, where it came from (`document.referrer` without its path) and the link's `utm_source` (ChatGPT adds `utm_source=chatgpt.com` to the links it gives; the house can label its own links, such as `?utm_source=qr` on a printed menu). Nothing is stored in the browser. A browser sending Do Not Track or Global Privacy Control sends nothing. A page reloaded or reached with Back is not a new visit, and nor is a page opened from another of the site's pages.
- **The route** (`lib/stats/handler.ts`) accepts only `application/json` from the site's own pages (as the other routes), skips robots and scripts by their user agent and browsers that send `DNT: 1` or `Sec-GPC: 1`, rate-limits per client (60 at once, then one every 2 seconds), reduces the address the visitor came from to a name or a domain (`lib/stats/sources.ts`), and answers 204. It sends the counts after the response (`after()`), so a visitor never waits for Shadow.
- **Shadow the concierge** → `app/api/concierge/route.ts` counts a question for each guest message that reaches Claude (and a talk begun for the first), and each `check_availability` lookup; `app/api/concierge/send/route.ts` counts a talk sent to the team (not a resend). One call to Shadow per request, after the reply has streamed (`lib/stats/tally.ts`).
- **Where it counts** (`statsConfig` in `lib/stats/send.ts`): with `SHADOW_API_URL` and a key, in production on Vercel or on a server off Vercel (a local one with `npm run fake-shadow`); never on a preview deployment. The key is `SHADOW_STATS_KEY` (any active key of the house's, from Shadow's **Settings → Website**), else `SHADOW_INQUIRY_KEY`: with `SHADOW_API_URL` and `SHADOW_STATS_KEY` alone, the site counts while online booking and the message form stay off (they follow `SHADOW_INQUIRY_KEY`). `SITE_STATS=off` stops it anywhere. Shadow's answer is not waited for by anyone and not retried: its `503` before its database update and its `429` (the house's 20,000 calls a day) are not logged; anything else is, as one line.

# Booking API (website ↔ Shadow Check-in)

Online booking on `/book` shows the free beds for a guest's dates and sends their booking request to Shadow Check-in, where the team confirms it. The guest pays at the house: there is no payment on this website. The website calls Shadow only from its server, with the property's key; both sides must match the contract below exactly (Shadow Check-in keeps the same contract in its own `docs/BOOKING_API.md`).

## Switching it on

| Setting | Effect |
| --- | --- |
| `SHADOW_API_URL` and `SHADOW_INQUIRY_KEY` both set | Online booking is on. The key is the same property inbound key as for inquiries ([INQUIRY_API.md](INQUIRY_API.md)). |
| Either missing | `/book` is the message form plus Booking.com and Agoda, as before; `/api/availability` and `/api/booking` answer `503 {"error":"not_configured"}`. |

The pages that change (`/book`, the booking card on other pages, `/privacy`, `/llms.txt`, `/llms-full.txt`) are static, so they read the two variables **when the site is built**: set them, then redeploy. The API routes and Shadow, the concierge, read them on every request.

If Shadow Check-in itself answers `503 {"error":"not_configured"}` (booking not set up there yet), the booking ticket says online booking isn't open and points to Booking.com, Agoda and the message form, which stay on the page as alternatives.

## Shadow Check-in's endpoints (the contract)

**Auth.** `Authorization: Bearer sck_…`, the property's inbound key, from the website's server only. Neither endpoint returns personal data.

### `GET {SHADOW_API_URL}/api/public/availability?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD&guests=N`

`200`:

```json
{
  "property": { "name": "House of Jars", "timezone": "Asia/Vientiane" },
  "check_in": "2026-10-03", "check_out": "2026-10-05", "nights": 2, "guests": 2,
  "mode": "request",
  "hold_hours": 24,
  "limits": { "max_guests": 6, "min_nights": 1, "max_nights": 30, "window_days": 365 },
  "room_types": [
    {
      "id": "uuid", "name": "Mixed dorm", "kind": "mixed_dorm",
      "description": "string or null",
      "features": ["Curtained pod beds", "Reading light", "Locker"],
      "free_each_night": [{ "date": "2026-10-03", "free": 5 }, { "date": "2026-10-04", "free": 4 }],
      "min_free": 4,
      "bookable": true,
      "price": null
    }
  ]
}
```

- `kind` is `mixed_dorm`, `female_dorm`, `male_dorm` or `private`.
- `price` is `null`, or `{ "currency": "LAK" | "USD", "per_guest_per_night": [{ "date": "…", "amount": 90000 }], "total": 360000 }`, where `total` covers every guest and night.
- `bookable` means `min_free >= guests`, within the limits, with the dates inside the window.
- Errors: `400 {"error":"invalid_request","issues":[{"field","message"}]}` (bad or past dates, `check_out <= check_in`, limits), `401`, `429`, `503 {"error":"not_configured"}`.

### `POST {SHADOW_API_URL}/api/public/booking-requests`

Body (strict: unknown keys are rejected; strings are trimmed):

```json
{
  "client_ref": "uuid",
  "room_type_id": "uuid",
  "check_in": "YYYY-MM-DD", "check_out": "YYYY-MM-DD",
  "guests": 2,
  "name": "1..120 chars",
  "email": "valid email or null", "phone": "5..40 chars or null",
  "preferred_contact": "email | whatsapp | phone | null",
  "arrival_time": "HH:MM or null",
  "message": "<=2000 chars or null",
  "consent": true
}
```

At least one of `email` and `phone` is required. The client never sends a price: Shadow computes it.

| Status | Body | Meaning |
| --- | --- | --- |
| 201 | `{ "id": "uuid", "reference": "HOJ-7K3M9Q", "status": "pending" \| "confirmed", "hold_expires_at": "ISO or null", "total": number \| null, "currency": "LAK" \| "USD" \| null }` | Received. The reference is 6 unambiguous characters after a property prefix. |
| 200 | the same body | This `client_ref` was already received (idempotent). |
| 409 | `{"error":"unavailable"}` | The beds are no longer free. |
| 400 | `{"error":"invalid_request","issues":[…]}` | The body doesn't match the contract, or the house's limits. |
| 401 | | Missing, unknown or revoked key. |
| 413 | | Body over 16 KB. |
| 429 | | Too many booking requests for this key (per key, for example 30 an hour). |
| 503 | `{"error":"not_configured"}` | Shadow can't take bookings now. |

### How the website reads Shadow's answers

- `lib/booking/contract.ts` checks every answer against the contract before a guest sees it. Fields Shadow may add later are ignored. A `kind` the website doesn't know shows no kind label; a `mode` other than `"instant"` is treated as `"request"` (the safer promise: the team confirms). An availability answer must repeat the dates and guests asked for; anything else counts as Shadow being unavailable.
- The website always sends all twelve keys in the contract's order, `null` for empty optional ones, and never a price.
- Shadow's `400` issues are shown in the website's own words for each field (`lib/booking/text.ts`); Shadow's messages are written for developers.

## The website's routes (browser → website)

Both live in `app/api/*/route.ts`, built from `lib/booking/handler.ts`, and answer with `Cache-Control: no-store`.

### `GET /api/availability?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD&guests=N`

- Only from this site's pages or the address bar (`Sec-Fetch-Site` and `Origin` are checked when a browser sends them).
- The website's own checks, before anything reaches Shadow or the cache: real dates, check-in from today in Vientiane, check-out after check-in, at most 365 nights, within two years, 1 to 20 guests. The house's own limits (nights, guests, how far ahead) are Shadow's to apply; the booking calendar keeps to the ones Shadow sends.
- Each answer is cached for **60 seconds per query** (dates and guests) on each server instance, and identical lookups under way share one call to Shadow. Only availability and "not configured" are kept: a failure is asked about again straight away. A booking, or a 409, clears every cached answer about its nights.
- Answers: `200` Shadow's availability without `property`; `400 invalid_request` with issues; `429 rate_limited`; `503 busy`; `503 not_configured`; `502 unavailable`.

### `POST /api/booking`

- JSON only, from this site only (`415` for other content types, `403` from other sites), at most 16 KB (`413`).
- The body is exactly Shadow's body, checked strictly (`lib/booking/contract.ts`), then forwarded unchanged.
- The browser keeps one `client_ref` per distinct request (`clientRefFor` in `lib/booking/flow.ts`): sending exactly the same booking again, after a timeout or an error, reuses it, so Shadow answers `200` with the booking it may already have; any change gets a new one.
- Answers: `201`, or `200` for a repeat: `{ "reference", "status", "hold_expires_at", "total", "currency" }` (Shadow's `id` stays on the server); `409 {"error":"taken"}`; `400 invalid_request` with issues; `429 rate_limited`; `503 busy`; `503 not_configured`; `502 unavailable`.

## Limits on both sides

The website has one key for Shadow, so its limits stay strictly inside Shadow's.

| Where | Limit | Code |
| --- | --- | --- |
| Shadow Check-in, booking requests per key | For example **30 in any rolling hour** (the contract). A resend of a `client_ref` it already has is answered `200`. Over the limit: `429`. | Shadow |
| Shadow Check-in, availability per key | Shadow's own figure (the contract gives only the `429`). It must stay above the website's 200 an hour per instance. | Shadow |
| Website, booking requests per client (an IPv4 address or IPv6 /64) | 3 at once, then one every 20 minutes: **at most 6 in any hour** | `BOOKING_LIMITS.perClient` in `lib/booking/limits.ts` |
| Website, booking requests per server instance | 10 at once, then one every 6 minutes: **at most 20 in any hour** | `BOOKING_LIMITS.perInstance` |
| Website, lookups per client | 20 at once, then one every 6 seconds, cached answers included | `LOOKUP_LIMITS.perClient` |
| Website, lookups that reach Shadow, per server instance | 20 at once, then one every 20 seconds: **at most 200 in any hour** | `LOOKUP_LIMITS.perInstance` |

- Only valid requests count, so a guest fixing a typo is never locked out.
- Inquiries have their own gate (see [INQUIRY_API.md](INQUIRY_API.md)): the contract gives booking requests their own per-key limit.
- Serverless hosting may run several instances, each with its own counts and cache; Shadow's limits are then the backstop, and its `429` is shown to guests as a busy line, never as their own fault.
- The client address is the last `X-Forwarded-For` entry (Vercel sets it). Behind any other proxy or CDN, that proxy must set it.

## What the guest sees

| Shadow answers | The website answers | The booking form shows |
| --- | --- | --- |
| 200 (availability) | 200 | The room types, with free beds each night, features, and the price per guest per night and total when Shadow sends one, otherwise "Price confirmed by the team". |
| 201 / 200 (booking) | 201 / 200 | A stamped confirmation: the reference, the hold time on the house's clock, the total or "the team confirms the price", "you pay at the house", check-in time and what to bring, and how to change or cancel. |
| 409 | 409 `taken` | "Sorry, those beds were taken while you were booking", fresh availability, the guest's details kept. |
| 400 | 400 | The step that can fix it, with the problem next to the field (dates, beds or details). |
| (the website's limit per client) | 429 `rate_limited` | "You have sent several requests in a short time. Please wait a few minutes", with WhatsApp and email. |
| 429, or the website's limit per instance | 503 `busy` | "Our booking line is busy right now", a Try again button, WhatsApp and email. |
| 503, or not configured on the website | 503 `not_configured` | "Online booking isn't open just now", with Booking.com, Agoda and the message form. |
| 401, 5xx, a malformed answer, no answer | 502 `unavailable` | "We couldn't send your request just now… sending it again won't book twice", with WhatsApp and email. |

## The booking form

`components/book/BookingFlow.tsx` (state), `BookingSteps.tsx` (the steps) and `DateRangePicker.tsx` (the calendar), with the logic in `lib/booking/calendar.ts` and `lib/booking/flow.ts`. It loads only on `/book`.

1. **Dates and guests.** An inline calendar of the house's days in Vientiane, following the WAI-ARIA date picker grid: one tab stop; arrows move by day and week, Home and End to the week's ends, Page Up and Page Down by month (with Shift, by year); Enter or Space chooses. Each day is named with its date, its part in the stay, and why it can't be chosen; each choice is announced. The calendar keeps to Shadow's minimum and maximum nights and booking window (fetched on arrival with a lookup of tonight for one guest), and the guest count to Shadow's maximum.
2. **Beds.** The room types from Shadow, with the free beds on each night.
3. **Details.** Name, email and/or WhatsApp, how the team should reply, arrival time, a short message, and consent linking the privacy notice.
4. **Check and send.** Everything on one page, each part with its way back.
5. **Confirmation.** Kept in the tab's session storage (reference and dates, no contact details), so a reload shows it again.

The browser's Back button moves between steps. A link such as `/book?check_in=2026-10-03&check_out=2026-10-05&guests=2` (or the booking card's `check_in`, `nights` and `guests`) opens the form at the free beds for those dates; the message form below fills in the same dates.

## Shadow, the concierge

With online booking on, Shadow's instructions point guests to `/book`, with their dates filled in when they have given them. He still sees no prices or beds himself: he never quotes a price or promises a bed, and a reply that starts quoting a price is replaced by a line pointing to the booking page, Booking.com and Agoda (`lib/concierge/guard.ts`).

## Try it locally

`test/fake-shadow.ts` is a stand-in for Shadow Check-in's public API that checks requests by hand from this contract (its rooms and rates are test fixtures, not facts about the house):

```bash
npm run fake-shadow    # http://127.0.0.1:4010 (FAKE_SHADOW_PORT to change)
SHADOW_API_URL=http://127.0.0.1:4010 SHADOW_INQUIRY_KEY=sck_fakeShadowCheckinKeyForLocalTestsOnly000000 npm run dev
```

The smoke test can run the fake itself and walk the booking form end to end (see the README).

Against a real Shadow Check-in:

```bash
curl -s "$SHADOW_API_URL/api/public/availability?check_in=2026-10-03&check_out=2026-10-05&guests=2" \
  -H "Authorization: Bearer $SHADOW_INQUIRY_KEY"
```

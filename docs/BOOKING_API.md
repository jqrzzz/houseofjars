# Booking API (website ↔ Shadow Check-in)

Online booking on `/book` shows the free beds for a guest's dates and sends their booking request to Shadow Check-in, where the team confirms it. The guest pays at the house: there is no payment on this website. The website calls Shadow only from its server, with the property's key; both sides must match the contract below exactly (Shadow Check-in keeps the same contract in its own `docs/BOOKING_API.md`).

## Switching it on

| Setting | Effect |
| --- | --- |
| `SHADOW_API_URL` and `SHADOW_INQUIRY_KEY` both set | Online booking is on. The key is the same property inbound key as for inquiries ([INQUIRY_API.md](INQUIRY_API.md)). |
| Either missing | `/book` is the message form plus Booking.com and Agoda, as before; `/api/availability` and `/api/booking` answer `503 {"error":"not_configured"}`. |

The pages that change (`/book`, the booking card on other pages, `/privacy`, `/llms.txt`, `/llms-full.txt`) are static, so they read the two variables **when the site is built**: set them, then redeploy. The API routes read them on every request; Shadow, the concierge, reads the switch once per server instance, so his instructions and tools stay the same (his prompt cache depends on it).

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

At least one of `email` and `phone` is required. Shadow computes the price; the client never sets one.

| Status | Body | Meaning |
| --- | --- | --- |
| 201 | `{ "id": "uuid", "reference": "HOJ-7K3M9Q", "status": "pending" \| "confirmed", "hold_expires_at": "ISO or null", "total": number \| null, "currency": "LAK" \| "USD" \| null }` | Received. The reference is 6 unambiguous characters after a property prefix. `pending` with `hold_expires_at: null` means the request holds no beds (see the hold limits below). |
| 200 | the same body | This `client_ref` was already received (idempotent). |
| 409 | `{"error":"unavailable"}` | The beds are no longer free. |
| 409 | `{"error":"price_changed","total":number \| null,"currency":"LAK" \| "USD" \| null}` | The quoted total differs from Shadow's: nothing was stored. `total` is Shadow's total now. |
| 400 | `{"error":"invalid_request","issues":[…]}` | The body doesn't match the contract, or the house's limits. |
| 401 | | Missing, unknown or revoked key. |
| 413 | | Body over 16 KB. |
| 429 | | Too many booking requests for this key (per key, for example 30 an hour). |
| 503 | `{"error":"not_configured"}` | Shadow can't take bookings now. |

### Contract additions (27 September, from the F1 review)

**Price protection.** The body may also carry `"quoted_total": number | null` and `"quoted_currency": "LAK" | "USD" | null` (the website sends both or neither): the total the guest saw, `null` when the page said the team confirms the price. If they differ from Shadow's own total, Shadow answers `409 price_changed` (above) and stores nothing; one of the pair missing counts as `null`. A bad quote (for example `"quoted_currency": "EUR"` or a negative total) is a `400` with the issue on its own field, `quoted_total` or `quoted_currency`, never on the body as a whole. Bodies without them keep working.

**Hold limits** (Shadow's side). Holds are a courtesy, so anonymous requests can never empty the house: at most 2 active holds per email or phone; beds held by unconfirmed requests stay under a share of each room type (by default 30%, at least 1 when the type has 4 or more beds); the default hold is 6 hours. A request beyond them is still accepted as `pending` with `hold_expires_at: null`. The website's side is a per-address limit on booking requests (below).

A Shadow Check-in from before these refuses the two quote keys as unknown (its body is strict): a `400` whose only issue is about the body as a whole (Shadow's schema writes the body's root as the field `body`: `Unrecognized keys: "quoted_total", "quoted_currency"`). Then, and only then, the website sends the same request again without them (nothing was stored), and logs `[booking] Shadow refused the price quote (400)…`; the guest's confirmation then says if the total differs from the one shown. Shadow never answers `price_changed` then, and holds as before. An issue on `quoted_total` or `quoted_currency`, or on any field of the booking, is never resent without the quote (`refusedOnlyTheBody` in `lib/booking/contract.ts`): the guest sees the issue, or the general "Please check your booking and try again."

### How the website reads Shadow's answers

- `lib/booking/contract.ts` checks every answer against the contract before a guest sees it. Fields Shadow may add later are ignored. A `kind` the website doesn't know shows no kind label; a `mode` other than `"instant"` is treated as `"request"` (the safer promise: the team confirms). An availability answer must repeat the dates and guests asked for; anything else counts as Shadow being unavailable.
- The website sends the twelve keys in the contract's order, `null` for empty optional ones, then the quote (`quoted_total`, `quoted_currency`): the total the review showed. A page from before the quote (an old tab during a deploy) sends only the twelve, and they are forwarded that way.
- Shadow's `400` issues are shown in the website's own words for each field (`lib/booking/text.ts`); Shadow's messages are written for developers.

## The website's routes (browser → website)

Both live in `app/api/*/route.ts`, built from `lib/booking/handler.ts`, and answer with `Cache-Control: no-store`.

### `GET /api/availability?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD&guests=N`

- Only from this site's pages or the address bar (`Sec-Fetch-Site` and `Origin` are checked when a browser sends them).
- The website's own checks, before anything reaches Shadow or the cache: real dates, check-in from today in Vientiane, check-out after check-in, at most 365 nights, within two years, 1 to 20 guests. The house's own limits (nights, guests, how far ahead) are Shadow's to apply; the booking calendar keeps to the ones Shadow sends.
- Each answer is cached for **60 seconds per query** on each server instance, and identical lookups under way share one call to Shadow. The cache's key is the checked query (dates and a whole number of guests), never the text of the URL: parameter order, repeated parameters (the first counts), extra ones and `guests=02` all find the same answer, and the query sent to Shadow is rebuilt from the same values. Availability, "not configured" and Shadow turning the stay down (`400`, for example over the house's limits) are kept; a failure is asked about again straight away. A booking, or a 409, clears every cached answer about its nights.
- Answers: `200` Shadow's availability without `property`; `400 invalid_request` with issues; `429 rate_limited` (with `Retry-After`); `503 busy`; `503 not_configured`; `502 unavailable`.
- The checks, cache and limits are one function, `findAvailability` (`lib/booking/handler.ts`), which Shadow, the concierge, calls too ([below](#shadow-the-concierge)).

### `POST /api/booking`

- JSON only, from this site only (`415` for other content types, `403` from other sites), at most 16 KB (`413`).
- The body is exactly Shadow's body, checked strictly (`lib/booking/contract.ts`), then forwarded unchanged.
- The browser keeps one `client_ref` per distinct request (`clientRefFor` in `lib/booking/flow.ts`): sending exactly the same booking again, after a timeout or an error, reuses it, so Shadow answers `200` with the booking it may already have; any change, a new quote included, gets a new one.
- Answers: `201`, or `200` for a repeat: `{ "reference", "status", "hold_expires_at", "total", "currency" }` (Shadow's `id` stays on the server); `409 {"error":"taken"}`; `409 {"error":"price_changed","total","currency"}`; `400 invalid_request` with issues; `429 rate_limited` (with `Retry-After`); `503 busy`; `503 not_configured`; `502 unavailable`.

## Limits on both sides

The website has one key for Shadow, so its limits stay strictly inside Shadow's.

| Where | Limit | Code |
| --- | --- | --- |
| Shadow Check-in, booking requests per key | For example **30 in any rolling hour** (the contract). A resend of a `client_ref` it already has is answered `200`. Over the limit: `429`. | Shadow |
| Shadow Check-in, availability per key | Shadow's own figure (the contract gives only the `429`). It must stay above the website's 200 an hour per instance. | Shadow |
| Website, new booking requests per client (an IPv4 address or IPv6 /64) | **At most 3 in any hour and 6 in any day** (a new `client_ref` is a new request). Stricter than the earlier "3 at once, then one every 20 minutes". | `BOOKING_LIMITS.perClientHour`, `perClientDay` in `lib/booking/limits.ts` |
| Website, the same request sent again per client | At most 10 in any hour. Shadow answers a repeat with the booking it has, so it never counts as a new request: a guest retrying while Shadow fails is never locked out. | `BOOKING_LIMITS.repeatsPerClient` |
| Website, booking requests per server instance | 10 at once, then one every 6 minutes: **at most 20 in any hour**, repeats included | `BOOKING_LIMITS.perInstance` |
| Website, lookups per client | **At most 20 in any 10 minutes**, cached answers included | `LOOKUP_LIMITS.perClient` |
| Website, lookups per client that reach Shadow | **At most 8 in any 10 minutes**, so no one visitor can spend the instance's allowance on dates nobody else asks about | `LOOKUP_LIMITS.perClientUncached` |
| Website, lookups that reach Shadow, per server instance | 20 at once, then one every 20 seconds: **at most 200 in any hour** | `LOOKUP_LIMITS.perInstance` |
| Website, Shadow the concierge's lookups | At most 3 tool calls per guest message, on top of the lookup limits above, which they share with the booking form | `MAX_TOOL_CALLS` in `lib/concierge/limits.ts` |

- Lookups are counted the same whether they come from the booking form or from Shadow, the concierge (below): against the guest's own address, in one cache and one allowance per server instance.
- Only valid requests count, so a guest fixing a typo is never locked out; a request the instance turns away (busy) costs the guest none of their own allowance.
- Each `429` carries `Retry-After`, and the page says how long to wait from it ("in about 20 minutes"), as something that has come from this connection, which others may share.
- Inquiries have their own gate (see [INQUIRY_API.md](INQUIRY_API.md)): the contract gives booking requests their own per-key limit.
- Serverless hosting may run several instances, each with its own counts and cache; Shadow's limits are then the backstop, and its `429` is shown to guests as a busy line, never as their own fault.
- The client address is the last `X-Forwarded-For` entry (Vercel sets it). Behind any other proxy or CDN, that proxy must set it.

## What the guest sees

| Shadow answers | The website answers | The booking form shows |
| --- | --- | --- |
| 200 (availability) | 200 | The room types, with free beds each night, features, and the price per guest per night and total when Shadow sends one, otherwise "Price confirmed by the team". |
| 201 / 200 (booking) | 201 / 200 | A stamped confirmation: the reference, the hold time on the house's clock, the total or "the team confirms the price", "you pay at the house", check-in time and what to bring, and how to change or cancel. `pending` with no hold: "The team will confirm availability and your booking…; your beds aren't held for you until then." |
| 409 `unavailable` | 409 `taken` | "Sorry, those beds were taken while you were booking", fresh availability, the guest's details kept. |
| 409 `price_changed` | 409 `price_changed` | The review again, with an alert that takes focus: "The price changed while you were booking, so nothing has been booked yet. The total for your stay is now … (it was …)", the new total in the Price row and the stub; sending again books at it. |
| 400 | 400 | The step that can fix it, with the problem next to the field (dates, beds or details). |
| (the website's limit per client) | 429 `rate_limited` | "Several booking requests have come from this connection recently. Please try again in about … minutes", with WhatsApp and email. |
| 429, or the website's limit per instance | 503 `busy` | "Our booking line is busy right now", a Try again button, WhatsApp and email. |
| 503, or not configured on the website | 503 `not_configured` | "Online booking isn't open just now", with Booking.com, Agoda and the message form. |
| 401, 5xx, a malformed answer, no answer | 502 `unavailable` | "We couldn't send your request just now… sending it again won't book twice", with WhatsApp and email. |

## The booking form

`components/book/BookingFlow.tsx` (state), `BookingSteps.tsx` (the steps) and `DateRangePicker.tsx` (the calendar), with the logic in `lib/booking/calendar.ts` and `lib/booking/flow.ts`. It loads only on `/book`.

1. **Dates and guests.** An inline calendar of the house's days in Vientiane, following the WAI-ARIA date picker grid: one tab stop; arrows move by day and week, Home and End to the week's ends, Page Up and Page Down by month (with Shift, by year); Enter or Space chooses. Each day is named with its date, its part in the stay, and why it can't be chosen; each choice is announced. The calendar keeps to Shadow's minimum and maximum nights and booking window (fetched on arrival with a lookup of tonight for one guest), and the guest count to Shadow's maximum. "Today" follows the website's clock (the `Date` header of its answers), and is checked again before each lookup and when the page is shown again, so a page left open past midnight in Vientiane, or a device whose clock is behind, never offers yesterday.
2. **Beds.** The room types from Shadow, with the free beds on each night.
3. **Details.** Name, email and/or WhatsApp, how the team should reply, arrival time, a short message, and consent linking the privacy notice (in a new tab, so nothing typed is lost).
4. **Check and send.** Everything on one page, each part with its way back. The request carries the total shown here as its quote.
5. **Confirmation.** Kept in the tab's session storage (reference and dates, no contact details), so a reload shows it again.

The browser's Back button moves between steps. A link such as `/book?check_in=2026-10-03&check_out=2026-10-05&guests=2` (or the booking card's `check_in`, `nights` and `guests`) opens the form at the free beds for those dates; the message form below fills in the same dates. That holds for links followed without a reload too (next/link, as in Shadow's replies), from another page or from `/book` itself: the form reads the address from `useSearchParams`, starts again from the linked stay (keeping the guest's details), and tells a link from its own steps by the step each of its history entries carries, read in a layout effect because Next.js writes a link's entry while committing.

## Shadow, the concierge

With online booking on, Shadow's instructions point guests to `/book`, and he can look up free beds himself with `check_availability` (`lib/concierge/availability.ts`). He is a second caller of the same lookup, inside the same limits, and he only reads:

- **One path.** The tool's input is checked with zod (real `YYYY-MM-DD` dates, a whole number of guests from 1 to 20). The stay then goes through `findAvailability` (`lib/booking/handler.ts`), the function behind `GET /api/availability`: the website's own checks and window, the 60-second cache shared with the booking form, and the lookup limits above, counted against the guest's own address (the chat request's). There is no other way for Shadow to reach Shadow Check-in.
- **No prices.** Claude reads each room type's name, kind, fewest free beds across the nights and whether it can be booked for that many guests, copied field by field from the answer, so a price never reaches it. When nothing can be booked it reads why, from the website's checks or Shadow Check-in's own counts and limits: `past`, `check_out_not_after_check_in`, `too_short`, `too_long`, `outside_window`, `too_many_guests`, `not_taken_online` (Shadow Check-in's `400` about the dates), `fully_booked` or `booking_closed` (its `503`).
- **Limits and failures are answers.** `rate_limited` (with the minutes to wait), `busy` and `unavailable` come back as tool errors Claude relays, never as an error in the chat. A guest message allows at most 3 tool calls; a fourth is turned away with a `limit_reached` error Claude explains, and the reply ends there.
- **The hand-off.** When something can be booked, the server builds a card from Shadow Check-in's own answer (never from Claude's words) and streams it to the chat window: the dates, the number of guests, the room types that can be booked with their free beds, and a **Book these dates** link to `/book?check_in=…&check_out=…&guests=…`, which opens the booking form at those beds without a reload.
- **Never a promise.** Shadow says what is free and points to the button, in two to four sentences. Free now is not held: nothing is held until the guest sends a booking request. He never quotes a price, and a reply that starts quoting one is replaced by a line pointing to the booking page, Booking.com and Agoda (`lib/concierge/guard.ts`).

## Try it locally

`test/fake-shadow.ts` is a stand-in for Shadow Check-in's public API that checks requests by hand from this contract, the additions included (its rooms and rates are test fixtures, not facts about the house). In tests and the smoke test, `setRate()` changes a rate (a price change while booking), `state.holdsPerContact = 0` makes every request pending with no hold, and `state.quotes = false` plays a Shadow Check-in from before the price protection:

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

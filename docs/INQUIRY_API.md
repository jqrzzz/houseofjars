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

At least one of `email` and `phone` is required.

## Responses

| Status | Body | Meaning |
| --- | --- | --- |
| 201 | `{"id": "<uuid>", "status": "received"}` | Stored. |
| 200 | same | This `client_ref` was already received for the property (idempotent retry). |
| 400 | `{"error": "invalid_request", "issues": [...]}` | The body does not match the contract. |
| 401 | `{"error": "unauthorized"}` | Missing, unknown or revoked key. |
| 413 | | Body over 16 KB. |
| 429 | `{"error": "rate_limited"}` | Too many inquiries for this key (for example 30 an hour). |
| 503 | `{"error": "not_configured"}` | Shadow cannot accept inquiries right now. |

## How the website uses it

- **Booking form** → `POST /api/inquiry` on the website (`lib/inquiry/handler.ts`). The form sends everything except `source` and `conversation_summary`; the server validates it (`lib/inquiry/schema.ts`), sets `source: "website_form"` and forwards it. The browser keeps one `client_ref` per inquiry, so a retry after a network failure cannot create a duplicate.
- **Shadow** → the `prepare_inquiry` tool (`lib/concierge/tool.ts`), then `POST /api/concierge/send` (`lib/concierge/send.ts`). The tool sends nothing. The model supplies the guest's details but never `client_ref`, `source` or `consent`; the server builds a draft with a fresh `client_ref` and `source: "website_concierge"`, signs it (HMAC bound to the conversation) and the chat window shows every field. Only when the guest ticks the privacy box for that message and presses Send does the browser post the draft and its signature back; the server checks the signature and sends exactly that draft with `consent: true`, with no model call. Sending the same draft again reuses its `client_ref` (Shadow answers 200); a corrected draft gets a new one.
- Both paths call `submitInquiry` (`lib/inquiry/submit.ts`), which validates against the full contract before anything leaves the server.

What the guest sees:

| Shadow answers | `/api/inquiry` answers | The page shows |
| --- | --- | --- |
| 201 / 200 | 201 / 200 | "Your message is with the team." |
| 400, 413 | 400 | "Please check the form and try again." The website validates first (problems are shown next to each field), so Shadow should never see an invalid body. |
| 429 | 429 | "Please wait a few minutes", with WhatsApp and email. |
| 503, or not configured on the website | 503 | "Messages can't be sent from this form at the moment", with WhatsApp and email. |
| 401, 5xx, network error | 502 | "We couldn't send your message just now", with WhatsApp and email. |

The website's own `/api/inquiry` also rate-limits per IP (5 in a burst, then one every two minutes). Only valid inquiries count, so a guest fixing a typo is never locked out.

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

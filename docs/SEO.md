# Search engines and AI assistants

How the site helps Google, Bing and AI assistants (ChatGPT, Claude, Perplexity, Google's AI Overviews and AI Mode) find the house and quote it correctly, what to do once it is live, and how to check every quarter.

## What the site does

- **Pages worth finding.** Every page has a title that leads with its topic and ends with "House of Jars Hostel, Vientiane", a description written for what people search ("quiet hostel Vientiane", "Wattay airport to House of Jars"), a canonical address and a link-preview image. All facts are in the page's HTML, which is what AI crawlers read.
- **Answer-first guides** at `/guides`: from Wattay Airport to the house, the Lao Digital Immigration Form, what's nearby, and a quiet stay. Each opens with the question and a direct answer, shows when it was last reviewed, and lists where its facts come from. The FAQ, `/vientiane`, `/house-rules`, `/the-house` and the home page link to them, and each guide links on to two or three pages.
- **Structured data** (schema.org JSON-LD) on every page: the website; the hostel, which is also the house's organisation (name, address, phone, email, logo, its Booking.com, Agoda, Tripadvisor and Facebook pages, check-in and check-out times, 24-hour reception, languages, amenities and the room type); the page itself; and its breadcrumbs.
- **Indexing.** `sitemap.xml` lists every page with the date its content last changed. `robots.txt` welcomes search engines and AI assistants and keeps them out of `/api/`. Google and Bing verification tags and an IndexNow key come from environment variables (below).
- **For AI assistants.** `/llms.txt` (a short index) and `/llms-full.txt` (every fact, rule, answer and guide, with sources). This convention is young and no major assistant has said it reads these files, so they are a cheap extra, not a strategy.
- **A door for AI assistants and booking agents.** An assistant acting for a traveller (Claude, ChatGPT, Perplexity and others that speak the Model Context Protocol) can connect to `https://thehouseofjars.com/api/mcp`: no sign-in, read-only. Its tools: `house_information` (everything in `/llms-full.txt`), `check_availability` (free beds for a stay, from the booking page's own lookup, never a price; only when online booking is on) and `booking_link` (the booking page with the stay filled in). No assistant can book, hold a bed or send a message: the traveller sends the request on the site and the team confirms it. `/openapi.json` describes the same read-only doors for tools that read OpenAPI, the hostel's structured data carries a `ReserveAction` with the booking link's template, and `robots.txt` lets assistants fetching for a traveller (ChatGPT-User, Claude-User, Perplexity-User) use these doors while crawlers stay out of `/api/`. Code: `lib/agents/`.
- **Sharing.** Every page has a link preview (title, description and its own picture) for WhatsApp, LINE, WeChat, Messenger and the rest, and a Share button that opens the phone's share sheet (or copies the link on a computer).
- **Links assistants can use.** `https://thehouseofjars.com/book?check_in=2026-10-03&check_out=2026-10-05&guests=2#message` opens the message form with the dates and guests filled in. The guest still writes and sends the message; nothing is booked or paid on the site.

## Why some facts are missing from the search data

Every fact in `content/*.ts` has a source and a `confirmed` flag. The site treats them like this, and tests enforce it:

| Where a fact comes from | On the pages | In structured data | In llms files |
| --- | --- | --- | --- |
| Confirmed by the house, the house's own listings, or an official source | Stated plainly | Yes | Stated plainly |
| Guest reviews | Said as guests say it ("Guests say…") | Never | Marked "(from guest reviews)" |
| One source only, general practice in Laos, or an assumption | Hedged ("the name nods to…") | Never | Marked, "to be confirmed" |

Structured data has no way to say "guests say", so it carries only the first row. Confirming a fact (`confirmed: true`, see [CONTENT.md](CONTENT.md)) moves it into the structured data automatically: strong air-conditioning, for example, appears there once the house confirms it. Also deliberately left out: ratings and reviews (they belong to Booking.com and the others, and marking up your own reviews breaks Google's rules), prices and offers (the site publishes none), the map pin (until the house gives the coordinates), and FAQ markup (Google stopped showing FAQ results in May 2026; the answers are plain HTML, which is what assistants read).

## After the site goes live

Do these once, in this order. Use exactly the same name, address and phone everywhere:

- **Name:** House of Jars Hostel, Vientiane
- **Address:** 005/4, Unit 2, Khun Bu Lom Rd, Ban Anou, Chanthabouly District, Vientiane Capital, Laos
- **Phone and WhatsApp:** +856 20 23 978 946
- **Website:** https://thehouseofjars.com

1. **Site address.** In Vercel, set `NEXT_PUBLIC_SITE_URL=https://thehouseofjars.com` for Production.
2. **Google Search Console.** Add the site. The simplest proof is a Domain property (a DNS TXT record at the domain registrar). Or choose "HTML tag", put the token in `GOOGLE_SITE_VERIFICATION`, redeploy and press Verify. Then submit `https://thehouseofjars.com/sitemap.xml`, and use URL Inspection → "Request indexing" for the home page and the guides.
3. **Bing Webmaster Tools.** Sign in and import the site from Search Console (quickest), or verify with `BING_SITE_VERIFICATION`. Submit the sitemap. Bing's index also feeds other search tools, and ChatGPT search is widely reported to use it.
4. **IndexNow.** Make a key (for example `node -e "console.log(crypto.randomUUID())"`), set it as `INDEXNOW_KEY` in Vercel and redeploy. Check that `https://thehouseofjars.com/indexnow-key.txt` shows it, then run `INDEXNOW_KEY=<the key> npm run indexnow`. Run it again after every deploy that changes content (`npm run indexnow -- /faq /guides` sends just those pages). It exits with an explanation if the key isn't live yet or the search engines refuse it.
5. **Google Business Profile.** Claim and verify the listing: primary category Hostel, the website address, open 24 hours, the phone, photos, attributes (Wi-Fi, air-conditioning, breakfast), and a reply to every review. One 2026 study found that Google's AI Mode sends most hotel clicks to this profile rather than to hotels' own sites.
6. **Bing Places for Business.** Claim the listing (it can import from the Google profile).
7. **Apple Business Connect.** Claim the place card that Apple Maps and Siri use.
8. **Yelp.** Claim the listing: ChatGPT licenses Yelp's listings for local answers.
9. **Everywhere else.** On Booking.com, Agoda, Tripadvisor, Facebook and Hostelz, make the name, address and phone match the lines above, and add the website.
10. **Tell the site** (in `content/`, see [CONTENT.md](CONTENT.md)): the map coordinates and the Google Maps link (they add the map pin and map link to the structured data), the Hostelz page link, real photos, and which facts are right (`npm run content:check` lists them; run it with `-- --strict` before launch).
11. **Let the crawlers in.** Check the host's firewall or bot settings don't block search or AI crawlers (on Vercel: the Firewall's bot rules). If Cloudflare is ever put in front, turn off its "block AI bots" setting, which is on by default for new domains.

## Every quarter: check how the house shows up (about 30 minutes)

1. **Search Console:** Performance (queries, clicks; AI Overviews and AI Mode are counted here too) and Pages (is every page indexed?).
2. **Bing Webmaster Tools:** Search performance, and that IndexNow submissions arrive.
3. **Ask the assistants** the same questions each time, in a fresh chat: ChatGPT (with search), Claude (with web search), Perplexity, Google AI Mode, Gemini and Copilot.
   - Best quiet hostel in Vientiane
   - Clean hostel in central Vientiane with pod beds
   - House of Jars Vientiane check-in time
   - How do I get from Wattay airport to House of Jars?
   - Is House of Jars in Vientiane a party hostel?
   - Hostel near the Mekong riverside in Vientiane
   - Do I need the Lao Digital Immigration Form?
   - House of Jars Vientiane phone number
4. **Write it down** in a simple table: date, assistant, question, whether the house is mentioned (and where in the answer), whether the facts are right, and which sources it cites (this site, Google's profile, Booking.com, Tripadvisor, others).
5. **Act on it.** Fix a wrong fact where it comes from (this site's content, a booking site, the Google profile). If the house is missing, the strongest levers are reviews and complete profiles on Google, Booking.com and Tripadvisor. When you re-check a guide's facts, update its `reviewed` date in `content/guides.ts`; studies find assistants tend to cite fresher pages.

## Maintaining it

- **A fact changes:** edit it in `content/` (see [CONTENT.md](CONTENT.md)), deploy, then run `npm run indexnow`.
- **A new guide:** add it to `content/guides.ts`, add `app/guides/<slug>/page.tsx` and `opengraph-image.tsx` (copy an existing guide's), and give it a drawing in `components/guide/art.ts`. The tests check that its facts come from the content layer, that anything guests say is credited, and that its links work.
- **Checks:** `npm test` validates every page's structured data against schema.org and fails if a fact that isn't firm reaches it; `npm run smoke` repeats the check on the running site.

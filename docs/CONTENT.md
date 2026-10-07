# Editing the content

Everything the site says about the house comes from a few TypeScript files in `content/`. The pages, the structured data for search engines, `/llms.txt` and Shadow's knowledge all read the same files, so a change made here shows up everywhere at once.

## Where things live

| File | What is in it |
| --- | --- |
| `content/identity.ts` | Name, address, phone and WhatsApp, email, booking and social links, the story behind the name and the mark. The site names no owner: the house speaks as a brand |
| `content/stay.ts` | Check-in and check-out times, quiet hours, beds and dorms, bathrooms, breakfast, staff, amenities, atmosphere, house rules |
| `content/area.ts` | Neighbourhood and walking distances, map position, airport transport, the Lao Digital Immigration Form, the Plain of Jars |
| `content/travel.ts` | Facts for the travel guides: Laos–China Railway tickets, getting around Vientiane, a day in the city, crossing to Thailand. From official pages, news reports and travel guides, with the date they were checked; no prices, fares or disputed opening hours |
| `content/reviews.ts` | Ratings on other sites (with the date they were read), what guests praise, honest notes |
| `content/faq.ts` | The questions and answers on /faq (answers are built from the facts above) |
| `content/privacy.ts` | Statements in the privacy notice the house must decide, such as how long messages are kept |
| `content/guides.ts` | The guides on /guides: each question, its answer, the facts at a glance and the steps, built from the facts above |
| `content/open-questions.ts` | Things the site deliberately leaves out until the house tells us |
| `lib/site.ts` | Page titles and descriptions (used in search results and link previews) |

Headlines and short linking sentences are written in the pages themselves (`app/*/page.tsx`). They summarise facts from `content/` without adding new ones; if you change a fact that a headline mentions, such as breakfast, search the pages for it too.

## Facts and the confirm flag

Every fact is written with `fact(value, source, options)`:

```ts
checkIn: fact("14:00", sources.booking, { note: "Check-in from this time." }),
```

- `value` is what the site shows.
- `source` says where it came from, so anyone can check it.
- `confirmed` is `false` until the house (its team) has confirmed it. Add `confirmed: true` to the options once they have:

  ```ts
  checkIn: fact("14:00", sources.booking, { confirmed: true }),
  ```

- `note` is for whoever reviews it.

Until a fact is confirmed, its source decides how the site may say it (`content/certainty.ts`, and [SEO.md](SEO.md) for why):

- from the house's own listings (Booking.com, Agoda, Google, Tripadvisor, Hostelz, Facebook) or an official source (a government body, or a company or place about itself, such as the railway's app or COPE's website): stated plainly, and included in the structured data search engines read;
- from news reports: said as reported ("…, the Laotian Times reported"), never in the structured data;
- from travel guides, booking sites or reference works such as Wikipedia: said as theirs ("…, travel guides say"), never in the structured data;
- from guest reviews: said as guests say it ("Guests say…"), never in the structured data;
- seen in one source only, general practice in Laos, or an assumption: hedged, and never in the structured data.

A new kind of source has to be added to `sourceKinds` in `content/sources.ts`; until then, and for anything the house tells you directly, set `confirmed: true` once it is right.

Most facts were taken from public listings on 25 September 2026, so almost everything starts unconfirmed. To see the list:

```bash
npm run content:check
```

It prints each unconfirmed fact with its value, source and note, then the open questions. It never fails the build. Before launch you can run `npm run content:check -- --strict`, which fails while anything is still unconfirmed.

## Common changes

- **A fact is wrong.** Change `value`, set the `source` to where the correct version came from (for example `"The house, October 2026"`), and set `confirmed: true`.
- **Quiet hours.** In `content/stay.ts`, replace `quietHours: null` with, for example, `quietHours: fact("22:00–07:00", "The house", { confirmed: true })`. The rules page, the home page and Shadow pick it up.
- **The map position.** In `content/area.ts`, set `geo` to `fact({ latitude: 17.96, longitude: 102.61 }, "The house", { confirmed: true })` with the front door's real coordinates. The structured data then includes it. Don't guess.
- **The story behind the name.** `identity.nameStory` is a guess ("the name nods to the Plain of Jars…"). Replace it with the real story when the house tells it.
- **A new rating.** Add an entry to `ratings` in `content/reviews.ts` with the platform, score, what it is out of, a link and the date you read it. A site in `reviewSites` (Booking.com, Agoda, Tripadvisor) picks up its rating by platform name, so adding Agoda's score to `ratings` puts it on Agoda's badge in the rating strip.
- **Guests' own words.** Add each review the owner picks to `testimonials` in `content/reviews.ts`, word for word (shorten only with "…"), with the guest's first name, where they are from, the site, the month and what it is about. Keep `agreed: false` until the guest has said yes to being quoted on the website; the home page shows the quotes with `agreed: true`, once there are at least three. Never add quotes from reviews unless the guest has agreed.
- **A booking site's logo.** Use the brand's own logo file, unchanged (`components/ui/BrandMark.tsx`); never draw a look-alike. Agoda's is still to come: add its official SVG there and remove `"agoda"` from `hasBrandMark`'s exception.
- **Dorms.** `beds.dorms` is a list that follows "The dorms include …", for example `["a mixed dorm", "a 14-bed dorm"]`. When the house tells us about a female-only dorm or private rooms, add them here and remove the matching line from `content/open-questions.ts`.
- **An open question is answered.** Add the fact where it belongs and delete the question from `content/open-questions.ts`. Questions with a `guestTopic` are the ones Shadow tells guests he doesn't know yet.
- **A guide.** Guides in `content/guides.ts` read their facts from the files above, so most changes need no edit there. When you have re-checked a guide's facts, set its `reviewed` date; the page shows it and search engines see it. `facts` lists every fact the guide uses: its "Sources" footnote is built from it, and the tests fail if a guide uses a fact that isn't listed, or says what only guests say without saying so.

## Photos

The site is designed to look finished without photographs: drawings from `public/art/` stand in for them, inside the frames the photos will use. When real photos arrive, put them in `public/photos/` and pass them to the `PhotoFrame` that is waiting for them, for example the café on /the-house:

```tsx
<PhotoFrame
  caption="Breakfast in the café downstairs"
  photo={{ src: "/photos/cafe.jpg", alt: "Breakfast on the café counter: eggs, bread, fruit and coffee" }}
  drawing="cafe"
/>
```

The frames waiting for photos are the bathroom, the café and the luggage storage on /the-house. The site shows no portrait of the owner: the house speaks as a brand. The numbered pod drawing and the house in section on /the-house are diagrams, not stand-ins, so they stay; when the real layout of the house is known, make the drawing match it (see `content/open-questions.ts`).

`next/image` serves them as AVIF or WebP at the right size. Use photos the house owns; never copy them from booking sites.

## After editing

```bash
npm run content:check   # what is still unconfirmed
npm test                # the content and Shadow's knowledge still build
npm run build           # the site builds
```

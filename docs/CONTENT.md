# Editing the content

Everything the site says about the house comes from a few TypeScript files in `content/`. The pages, the structured data for search engines, `/llms.txt` and Shadow's knowledge all read the same files, so a change made here shows up everywhere at once.

## Where things live

| File | What is in it |
| --- | --- |
| `content/identity.ts` | Name, address, phone and WhatsApp, email, booking and social links, Nang, the story behind the name |
| `content/stay.ts` | Check-in and check-out times, quiet hours, beds and dorms, bathrooms, breakfast, staff, amenities, atmosphere, house rules |
| `content/area.ts` | Neighbourhood and walking distances, map position, airport transport, the Lao Digital Immigration Form, the Plain of Jars |
| `content/reviews.ts` | Ratings on other sites (with the date they were read), what guests praise, honest notes |
| `content/faq.ts` | The questions and answers on /faq (answers are built from the facts above) |
| `content/privacy.ts` | Statements in the privacy notice the house must decide, such as how long messages are kept |
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
- `confirmed` is `false` until Nang or the team has confirmed it. Add `confirmed: true` to the options once they have:

  ```ts
  checkIn: fact("14:00", sources.booking, { confirmed: true }),
  ```

- `note` is for whoever reviews it.

Most facts were taken from public listings on 25 September 2026, so almost everything starts unconfirmed. To see the list:

```bash
npm run content:check
```

It prints each unconfirmed fact with its value, source and note, then the open questions. It never fails the build. Before launch you can run `npm run content:check -- --strict`, which fails while anything is still unconfirmed.

## Common changes

- **A fact is wrong.** Change `value`, set the `source` to where the correct version came from (for example `"Nang, October 2026"`), and set `confirmed: true`.
- **Quiet hours.** In `content/stay.ts`, replace `quietHours: null` with, for example, `quietHours: fact("22:00–07:00", "Nang", { confirmed: true })`. The rules page, the home page and Shadow pick it up.
- **The map position.** In `content/area.ts`, set `geo` to `fact({ latitude: 17.96, longitude: 102.61 }, "Nang", { confirmed: true })` with the front door's real coordinates. The structured data then includes it. Don't guess.
- **Nang's own words.** Only if she wants to: in `content/identity.ts`, set `owner.note` to `fact("Her words, as she wrote them.", "Nang", { confirmed: true })`. They appear on the home and About pages. Never write one for her.
- **The story behind the name.** `identity.nameStory` is a guess ("the name nods to the Plain of Jars…"). Replace it with the real story when Nang tells it.
- **A new rating.** Add an entry to `ratings` in `content/reviews.ts` with the platform, score, what it is out of, a link and the date you read it. Never add quotes from reviews unless the guest has agreed.
- **Dorms.** `beds.dorms` is a list that follows "The dorms include …", for example `["a mixed dorm", "a 14-bed dorm"]`. When the house tells us about a female-only dorm or private rooms, add them here and remove the matching line from `content/open-questions.ts`.
- **An open question is answered.** Add the fact where it belongs and delete the question from `content/open-questions.ts`. Questions with a `guestTopic` are the ones Shadow tells guests he doesn't know yet.

## Photos

The site is designed to look finished without photographs: line drawings and stone-coloured frames stand in for them. When real photos arrive, put them in `public/photos/` and pass them to the `PhotoFrame` that is waiting for them, for example on /the-house:

```tsx
<PhotoFrame
  caption="A pod, curtain half drawn, reading light on"
  photo={{ src: "/photos/pod.jpg", alt: "A pod bed with its curtain half drawn and the reading light on" }}
  aspect="4 / 3"
/>
```

`next/image` serves them as AVIF or WebP at the right size. Use photos the house owns; never copy them from booking sites.

## After editing

```bash
npm run content:check   # what is still unconfirmed
npm test                # the content and Shadow's knowledge still build
npm run build           # the site builds
```

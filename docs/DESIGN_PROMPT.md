# The design system: a prompt for Claude Design

> **Update, 4 October 2026:** the design system was built in this project instead of in Claude Design: see `brand/README.md`. This prompt stays for reference, or for exploring a second direction in Claude Design.

Paste the prompt below into Claude Design and attach the files listed under "Attach". It asks for a design system built on what House of Jars already has (the arch logo, the orange, the signs), not a new brand. When it is done, bring the result back here and Claude applies it to the website, the menus and the signs.

## Attach

From `photos/` in this repository:

- `brand/logo-arch-orange.jpg` and `brand/business-card.jpg` (the logo, and the name in English and Lao)
- `signs/dormitory-h-door.jpg`, `signs/dormitory-rules-board.jpg`, `signs/bathroom-rules-white.jpg`, `signs/womens-bathroom-door.jpg`, `signs/glass-drinking-water-only.jpg` (the sign style)
- `menus/room-rate-sign.jpg`, `menus/breakfast-menu-staying-guests.jpg`, `menus/cafe-menu.jpg` (the menus to redesign)
- `house/front-entrance-sign-night.jpg`, `house/staircase-wall-of-jars-branded.jpg`, `rooms/dorm-corridor-pods-and-window.jpg`, `rooms/pod-bed-with-curtain-branded.jpg`, `house/tea-cup-and-teapot.jpg` (the mood of the house)
- `brand/quote-card-anais-nin.jpg` (the social style)

## The prompt

> Create a design system for **House of Jars**, a calm, clean pod hostel in Ban Anou, central Vientiane, Laos. Guests sleep in wooden pod beds with curtains, there is a café on the ground floor, breakfast is included, and the house is decorated with clay jars, warm wood, terracotta tiles and lamplight. Our guests are mostly Western travellers, with a growing number of Chinese visitors. The goal is the feel of a boutique hotel at a hostel price: everything clear at a glance, nothing confusing, few steps.
>
> **Refine what we have; don't reinvent it.** The attached logo, business card, signs and menus are our proven base: the arch logo, our orange (about #E46C44), near-black text, white boards and a clean geometric sans-serif. Keep that look and make it more consistent, polished and complete.
>
> Please make:
>
> 1. **Logo kit.** A clean vector redraw of the arch, with the same shape and proportions. Versions: the mark alone; the mark with "House of Jars"; the mark with the English and Lao names, as on our business card; one-colour versions in orange, black and white; an app icon and favicon; clear space and minimum sizes. Keep the master logo flat, so it works on signs, cards, embroidery and tiny screens. Show depth only in applications, such as a carved wooden sign, an embossed card, or a soft 3D render for social media.
> 2. **Colours.** Named tokens for our orange, ink, white, a warm cream, wood brown and terracotta, with light and dark versions for screens and print values for the printer. Include contrast rules. Our orange with white text is only about 3.2:1, so white on orange is for large headings only, and body text on orange is dark ink. Everything on screen must pass WCAG AA.
> 3. **Type.** One sans-serif family close to our signs, with matching Lao and Simplified Chinese fonts, and sizes for the web, for signs read from a few metres away, and for menus.
> 4. **Icons.** Simple pictograms in the style of our signs: no smoking, shoes off, quiet hours, fan and air conditioning, drinking water, glass, shower, women, men, locker, breakfast, coffee, Wi-Fi, luggage, motorbike parking.
> 5. **Photography guide.** Warm, evening, lamplit, real. Allowed edits: light, colour, straightening, noise and sharpness. Not allowed: adding or removing furniture, making rooms look bigger, changing views, or hiding anything a guest will see when they arrive.
> 6. **Website components, mobile first:**
>    - header and menu;
>    - a large photo with one clear line and a "Book" button;
>    - a pod bed card;
>    - a price block: US dollars first, then kip, baht and yuan, for example "US$8 a night · 185,000 kip · 290 baht · ¥60";
>    - date picker, booking summary and confirmation screens, so booking takes no more than three steps;
>    - house rules grouped by topic with icons;
>    - FAQ, area guide card, rating card and footer.
> 7. **Print templates:**
>    - **A redesigned menu (A4).** First, breakfast for staying guests, which is included, with what changing the drink costs, clearly labelled. Then the café menu with hot and iced prices in columns. Finish with one line on how to pay. It must be easy to read in five seconds.
>    - **Signs:** dormitory door signs (letter plus rules), an A3 rules board, small labels (Shower, Women, Men), stair strips, and the room-rate card.
>    - **Other print:** a business card, and social templates (a quote card, and a photo with the logo).
> 8. **Tone of voice.** Short, warm and clear: "please" first, rules grouped, firm where it matters, never cold. Show one example rewrite of our dormitory rules board in this tone.
>
> Deliver it as tokens, components and templates we can hand to a developer and a printer.

## Before printing anything

- **Typos on today's signs:** "take of your shoes" on the stair strips, and "withold" on the dormitory rules board.
- **Payment wording:** the room-rate card and the café menu say different things about cash and cards. The house should confirm what is accepted, and where, before the new menu and rate card are printed.
- **Prices:** The house should confirm current prices too.

# House of Jars brand kit

The source files of the house's design system. The full brand book (rules, voice, signs and print, media and AI, live components) is the design system page: https://claude.ai/artifact/V29Jch5uNp8WH6wkCBbgDT (private to the owner until shared).

- `logos/`: the arch mark traced from `photos/brand/logo-arch-orange.jpg` on its 12 × 18 grid (99.5% overlap): `mark-orange.svg`, `mark-ink.svg`, `mark-white.svg`, and `app-icon.svg` (white mark on jar orange, 1024 × 1024).
- `icons/`: the house's icon set, Phosphor Fill (MIT licence, `icons/LICENSE-phosphor.txt`), in ink on a 256 grid.
- The curtain weave: the stepped diamonds woven into the dorms' pod curtains, as three border motifs (`public/brand/weave-diamond.svg`, `weave-lozenge.svg`, `weave-hooks.svg`), each with a heart layer (`weave-*-heart.svg`). Gold thread (#e9c46a) and jar-orange hearts on the curtains' dark ground (`curtain` in `tokens.json`), with the fine ribbing of the cloth. One band per place: under the hero, along the booking ticket, along the top of the footer, the hem of the opening splash, and the top of guest emails. Abstract and original, no naga or other sacred figures.
- `tokens.json`: colours for Day and Evening (jar orange #e76e43 from the logo, teak and lamplight sampled from the photos), type (Figtree with Noto Sans Lao and Noto Sans SC), spacing, radii and shadows, each with its use and contrast.

The website applies it: the tokens are in `app/globals.css`, the mark in `components/brand/mark-shape.ts` (checked against `logos/` by `components/brand/brand-assets.test.ts`), the icons in `components/ui/icons.tsx`, the woven bands in `components/brand/WovenBand.tsx`, and the fonts in `app/fonts.ts`.

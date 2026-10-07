# Lantern Theatre: the final design spec for houseofjars

The design spec for the website's redesign, 5 October 2026: four creative directions were pitched and judged, and the winner, a paper lantern theatre, was merged with the best of the others (grafts are tagged *(lamplit)*, *(day)* and *(spirits)*). Before coding, read `AGENTS.md` and the Next 16.3 docs in `node_modules/next/dist/docs/`. The amendments at the end override anything above them.

---

## 1. Goal and acceptance criteria

**Goal.** The house appears folded from paper and lit from behind.

Within 10 seconds, a visitor sees the real dorm photo in an arch window. Three of the house's own lamps hang above it; they drop into place and light up. Beside them are the h1, the direct-price line and an orange Book button.

Within two minutes of scrolling, they have seen three things:
- the street front open;
- the two photographed floors lift apart;
- an orange thread walk the real arrival route from the glass door to pod H01, where the curtain closes.

Without reading a rulebook, they know where check-in is, where shoes come off, and that the house is built for sleep.

Drawings come from the house model in `lib/house`, and facts come from `content/`. Photos stay true. The mood is warm, hand-made and original; it borrows no studio's characters or scenes. Booking stays one orange button away, and every moving scene has a designed still.

**Acceptance criteria.** A reviewer checks these against the `npm run smoke` screenshots: 390×844 and 1440×900, in Day and Evening. There are also 5 theatre shots, at 10%, 35%, 60%, 85% and 100% of its scroll, plus one run with Still on.

1. **Hero.** In every viewport and theme, the first screen shows:
   - the real `dormCorridor` photo in an arch window mat, as the LCP;
   - three house lamps above it, unlit by Day and lit by Evening;
   - the h1 and `policies.directPriceShort`;
   - the Book button (jar orange, ink text) and Ask Shadow.

   No drawn layer or glow overlaps the photo's pixels.
2. **Theatre.** The 5 shots show, in order:
   - the street front;
   - the cutaway opening;
   - 1st floor lifted, with three HTML label tags;
   - the thread at Check in, then at Shoes;
   - pod H01 with its curtain closed.

   The 5 arrival steps (the model's `does` text) are in the server HTML. The rest frame equals the 100% frame. It is what Still, reduced-motion, Firefox and no-JS visitors see.
3. **Theme.** With the OS in dark mode and Day chosen on the site, the stage layers, inline art and all 13 drawings render in Day colours. Evening relights them.
4. **Still.** With Still on:
   - there is no splash;
   - every scene is at rest;
   - one second after load, `document.getAnimations().length` is 0 on every page.

   Reduced-motion screenshots match the Still ones.
5. **Honesty.**
   - Every house drawing has the caption "Drawn from our walk through the house: positions are approximate."
   - The 2nd floor appears only on `/the-house`, dimmed, with the caption "The 2nd floor is drawn as a copy of the 1st floor: not yet photographed."
   - No photo is recoloured or drawn over, and no new hue is added.
6. **No regressions.**
   - Lint, typecheck, `npx vitest run` and `npm run build` pass.
   - Smoke passes on every route: one h1, no console errors, no sideways scroll at 390 px, one JSON-LD, every hook in place.
   - Home JS is ≤ 200 kB gzip and home HTML ≤ 150 kB raw.
   - The game and the film fetch nothing until asked.

---

## 2. Art direction

### 2.1 The style: cut paper with an ink silhouette

Each shape is a sheet of paper. Ink stays on silhouettes *(lamplit)*, so new art and the 13 drawings stay one family.

| Element | Rule |
|---|---|
| Planes | Flat fills from the drawing class sheet: `.c .p .s .w .wd .b .a .y .g .r .cu .in .dusk`. |
| Card edge | The outline repeated at offset (1.5, 1.5) in the next darker tone. By Evening it becomes a lamplight rim at (0, −1.5). In SVG files it is an offset path, on large planes only (slabs, wall tops, pods, facade). On HTML stages it is `filter: drop-shadow(var(--edge-x) var(--edge-y) 0 var(--paper-edge))` on each layer `<img>`. A CSS filter on HTML is allowed; `<filter>` in SVG files is not. |
| Ink | Silhouettes only: 1.5 px, `#4a2f1b` by Day and `#dccdb6` by Evening, non-scaling, round caps and joins. Inner detail (window bars, pod numbers, cords, curtain folds) is 1 px at 60%. Nothing else is drawn as a line. |
| Deckle | Straight runs longer than 24 px get a jitter of up to 0.6 px. A mulberry32 generator seeded by the element id makes it, so builds stay byte-stable. |
| Depth | 3–4 planes per scene. Back planes mix 15–30% toward `--paper-far`. |
| Texture | A fibre `<pattern>`: a 24×24 tile of six hairlines, 4–7 px long, at 5% ink, under 400 bytes. HTML stages use `public/art/paper-fibre.svg` (1.2 kB) as a background at 6%. |
| Light | A stepped halo: a core plus 4 concentric rings, each adding 7%. Files use flat shapes, with no gradients or filters. React inline art may use one `radialGradient` with a `useId` id. By Day the core gets a 1 px `--glow-ring` outline, because lamplight does not read on rice *(spirits)*. |
| Chrome | Square, as today. The arch is the only curve in the UI. Text never sits on art; labels sit on solid `--paper-near` tags *(day)*. |

### 2.2 Palette

No new hues.

**Existing tokens:**
- `--jar-orange`: the primary CTA (ink text), the 2 px thread and outlined stop rings. On any screen, the primary button is the only jar-orange fill larger than 24×24 px *(spirits)*.
- `--lamplight`: light only, never text on Day grounds.
- The teak tokens: wood, cords and pins.
- `--rice`, `--surface` and `--white`: paper by Day.
- `--night`, `--night-raised` and `--curtain-night`: paper by Evening.
- `--stone` and `--stone-dark`: back planes and unlit shades.
- `--thread-gold`: the weave and curtain stripes.

**New themed tokens.** Add each one to `:root` and to both Evening blocks, identically and without braces, so `app/theme.test.ts` passes:

| Token | Day | Evening |
|---|---|---|
| `--paper-far` | `color-mix(in oklab, var(--stone) 35%, var(--rice))` | `color-mix(in oklab, var(--night-raised) 60%, var(--night))` |
| `--paper-mid` | `color-mix(in oklab, var(--stone) 60%, var(--rice))` | `color-mix(in oklab, var(--teak-night) 50%, var(--night))` |
| `--paper-near` | `color-mix(in oklab, var(--white) 60%, var(--rice))` | `var(--night-raised)` |
| `--paper-edge` | `color-mix(in oklab, var(--teak) 35%, var(--stone))` | `color-mix(in oklab, var(--lamplight) 55%, var(--night))` |
| `--edge-x` / `--edge-y` | `1.5px` / `1.5px` | `0px` / `-1.5px` |
| `--stage-light` | `color-mix(in oklab, var(--lamplight) 70%, var(--white))` | `var(--lamplight)` |
| `--glow-strength` | `0.45` | `1` |
| `--glow-ring` | `var(--teak)` | `transparent` |
| `--thread` | `var(--jar-orange)` | `color-mix(in oklab, var(--jar-orange) 80%, var(--lamplight))` |

### 2.3 The magic: light, paper and air

**Shadow is the only character.** All other magic is light or air from real fixtures. Add no spirits, creatures, festive lantern strings in the hero, naga or sacred figures. The staff-room `shrine` is drawn as modelled. It is never lit, never animated and never in `lightPoints()` *(day)*.

1. **House lamps** (`components/art/HouseLamp.tsx`). These are the café pendant and the stone-shade wall lamp from the `lamp` photo, never generic lanterns.
   - **Shape:** a 32×56 viewBox holding a 1 px cord (its length set by the `cord` prop), an 8×3 teak cap, and a squat bell shade 28 wide and 20 tall. The shade has a flat bottom, rounded shoulders, an ink silhouette and a card edge.
   - **Day:** unlit, with a `--stone` shade.
   - **Evening:** a `--lamplight` shade, with a glow disc 2.2× the shade's width.
   - **Size:** ≤ 600 bytes each.
2. **The thread.** A 2 px `--thread` line walks a model route in walking order. An 8 px lamplight bead with a teak ring rides it via `offset-path`. Stop rings are 10 px, outlined in jar orange.
3. **Jar glow** *(lamplit, spirits)*. Glow discs sit at the mouths of `jar-big` (in the café) and the landing jar: the house's name made visible. They light as the thread passes and stay lit by Evening.
4. **Arch wisp** *(lamplit)* (`ArchWisp.tsx`, ≤ 300 bytes). Warm air rises from a jar or cup and traces the arch of the mark.
   - **Path:** one open path in a 40×64 viewBox, mouth at (20,64), `pathLength="1"`. It is an S-curl followed by the crown of `ARCH_OUTLINE`: `M20 64C13 57 27 50 20 43C15 38 4 33 4 24C4 15.9 10.3 10.7 20 10.7C29.7 10.7 36 15.9 36 24`.
   - **Stroke:** 2 px, round caps. `--teak` at 70% by Day, `--lamplight` by Evening.
   - **Motion:** it draws on (1.6 s, `--ease-lamp`), then rises 16 px and fades (0.8 s). It plays once.
5. **Curtain.** A unit rect inside a `matrix()` that maps it onto the pod's front face (§3.3). It is filled `--curtain` with 3 px `--thread-gold` stripes at 40%, and it slides along its rail with `scaleX`.
6. **One dok champa petal.** A 14 px span masked by `/brand/dok-champa.svg` crosses a section once.
7. **Shadow on the scrim.** `ShadowFigure variant="silhouette"` uses the same paths in one fill (`--teak-night` by Day, `--curtain-night` by Evening), on a lamplit scrim. The full-colour figure stays beside it. Shadow points but never takes anything, and he is never shown working, because he is not staff *(lamplit)*.

### 2.4 Photos: real windows in a paper wall

**The mat.** `PhotoFrame` gains a cut-paper mat:
- a `--paper-near` ground, 1.25rem wide;
- a card edge as `box-shadow: var(--edge-x) var(--edge-y) 0 var(--paper-edge)`.

No decorative layer crosses into the picture. By Evening the mat gets a lamplight wash behind the photo, never over it. Photos keep their settle and drift motion, their alt text and their captions.

**Camera dots** *(lamplit)*. On the `/the-house` stage, a numbered `<a href="#photo-{key}">` marks where each photo was taken, with its caption visually hidden. The gallery repeats the numbers.

**Paper twins.** Each gallery photo gets a 6rem tile: the stage's floor layer cropped to the photo's place, with one glow disc. No new renders.

**Places.** `content/photos.ts` gains an optional `place: { area }`. Set it only where the area is confirmed in the model:
- `dorm-h`: `dormCorridor`, `dormFan`, `podCurtain`, `podLadder` and `locker`;
- `terrace`: `entrance`;
- `landing-1`: `stairsJar`.

`wallOfJars` and `lamp` get no place.

### 2.5 The 13 drawings

- **Redraw.** Redraw all 13 files in `public/art/` in the §2.1 style. Keep their sizes, viewBoxes and dark `@media` blocks, and keep them filter-free, so `drawings.test.ts` is unchanged.
- **Evening twins.** `scripts/art-evening.ts` (run with `npx tsx`) writes `public/art/evening/{name}.svg`, with the dark rules made unconditional.
- **Following the theme.** `Drawing` renders a `.for-day` and a `.for-evening` `<img>`, so drawings follow `data-theme`. Both are lazy; a lazy image hidden with `display:none` is never fetched. With `preload`, both are eager.
- **Moving drawings.** The tuk-tuk and the train also become inline React components (`TukTuk`, `PaperTrain`) that use page tokens.

---

## 3. The house model's paper outfit (`lib/house`)

### 3.1 The option

`types.ts` adds `type Outfit = "model" | "paper"`, and `StreetOptions`, `CutawayOptions` and `PlanOptions` gain `outfit?: Outfit`. The default stays `"model"`, so the 12 committed renders and the drift test stay byte-identical *(lamplit)*.

Setting `"paper"` changes four things:
1. **Stylesheet** (`paletteCss` gains `outfit`):
   - Face tones sit closer together: the left and right face mix is halved.
   - `h` hairlines are not emitted.
   - `o` strokes appear only on silhouettes.
   - No `gw` cones are drawn; the stage draws glow discs instead.
2. **`detail: "simple"`** in `fixtures.ts`. Fixtures are simplified, never removed, so every counted id stays (`fx-pod-H01` and the other pods, lockers, ladders, chairs, pendants).
   - A pod becomes a teak box with a curtain front and a lamp dot.
   - A locker stack becomes one block.
   - The aim is about 35% fewer paths.
3. **Card edges**, on slabs, wall tops, pod blocks and the facade only.
4. **Deckle.** `lib/house/deckle.ts` exports `deckle(points: readonly Vec2[], seed: string, max = 0.6): Vec2[]`. It applies to slab and wall polygons only.

Seeds are ids. `Math.random` is never used.

### 3.2 Layers on one shared stage geometry

`lib/house/paper.ts` is new and is used by server code and scripts only. Its layers share **one integer viewBox**, sized for all floors at `fitExplode: 2.5` plus the street front.

| Layer | Contents |
|---|---|
| `street` | The facade, awning, signs and posts, in the shared projection, with no neighbours. |
| `ground` | The ground-floor cutaway, with the facade cut at `FACADE_CUT`. |
| `ground-front` | Ground pieces in front of the facade (y < 0: awning, `sign-hanging`, posts, `jar-butts`) that must overlap the upper floors. It lifts with the ground floor. |
| `floor1` | The 1st floor cutaway, in its stacked position. |
| `floor2` | The 2nd floor cutaway, stacked, with `dim` and `data-confirmed="false"`. |

```ts
export type PaperLayerId = "street" | "ground" | "ground-front" | "floor1" | "floor2";
export interface StageGeometry {
  readonly viewBox: readonly [number, number, number, number];
  readonly liftPerLevel: number; // 90 = 2.5 m × 36 px
  readonly crop: (floors: readonly FloorId[]) => readonly [number, number, number, number];
}
export function stageGeometry(): StageGeometry;
export function renderPaperLayer(layer: PaperLayerId, theme: "day" | "evening"): string;
export function paperLayerSrc(layer: PaperLayerId, theme: "day" | "evening"): string; // "/house/paper-floor1-day.svg"
```

### 3.3 Overlays in the same coordinates

All overlay positions are in viewBox units, with the floors stacked. The page lifts a floor by `liftPerLevel × level`.

```ts
export interface StageStop { label: string; floor: FloorId; x: number; y: number; at: number /* share of the walk, 0..1 */;
  does?: string; rules: readonly string[]; area?: string }
export interface ThreadLayer {
  floors: Partial<Record<FloorId, string>>; // per-floor inline <svg aria-hidden>: <path class="th" pathLength="1"> + <circle data-stop data-at>
  link: string;                             // stair link, lifted pose
  stops: readonly StageStop[];
  shares: Partial<Record<FloorId, readonly [number, number]>>;
}
export function renderThreadLayer(routeId: string, o: { idPrefix: string; floors?: readonly FloorId[]; curtain?: string }): ThreadLayer; // ≤ 4 kB
export interface LightPoint { id: string; floor: FloorId; x: number; y: number; r: number;
  kind: "pendant" | "wall-lamp" | "window" | "jar" | "sign" | "fridge"; order: number /* walking order on "arrival" */ }
export function lightPoints(floors?: readonly FloorId[]): readonly LightPoint[];
export function anchorOf(id: string): { floor: FloorId; x: number; y: number } | undefined; // "area-…" | "fx-…"
export function faceMatrix(fixtureId: string, face: "front" | "right"): readonly [number, number, number, number, number, number];
export function planOverlay(floor: "ground" | "floor1"): { viewBox: readonly [number, number, number, number]; areas: readonly { id: string; d: string }[] };
export function walksJson(): string; // every route's ThreadLayer data
```

- **Theme.** Thread SVGs stroke with `var(--thread)` from the page, so they need no theme remap.
- **Curtain.** Passing `curtain: "pod-H01"` adds `<g data-curtain transform="matrix(…)"><rect width="1" height="1"/></g>`.

### 3.4 Files, tests and serving

**Files.** `npm run house:render` writes these new `HOUSE_RENDERS` entries:
- `public/house/paper-{street,ground,ground-front,floor1,floor2}-{day,evening}.svg`
- `public/house/paper-plan-{ground,floor1}-{day,evening}.svg`

The script also writes `public/house/walks.json`.

**Tests.** `lib/house/paper.test.ts` adds these checks to the existing determinism, `<filter`, viewBox and 400 kB checks:
- each layer is ≤ 80 kB raw;
- street + ground + ground-front + floor1 is ≤ 45 kB gzip per theme;
- all layers share one viewBox;
- every counted fixture id is present;
- each thread layer is ≤ 4 kB and deterministic;
- no light point is the shrine;
- `walks.json` equals a fresh `walksJson()`.

**Serving.**
- Layers and plans are static `<img loading="lazy" decoding="async" alt="">` elements, with width and height from the viewBox. They never enter the HTML or the RSC payload.
- Only the thread (≤ 4 kB) and the hero lamps (≤ 2 kB) are inline.
- `lib/house` is never imported into a `"use client"` file.

---

## 4. Motion system

### 4.1 Principles

1. **Paper hinges; it doesn't float.** Things rotate about a fold or slide in a slot. Nothing scales from its centre.
2. **Planes move at their depth.** Parallax runs at fixed rates: back 0, middle 0.15, front 0.35.
3. **Light before movement.** Most motion is the opacity of light.
4. **Phrases, not loops** *(spirits)*. Every ambient phrase comes to rest within 5 s and does not repeat while its scene stays in view. Shadow's existing blink is the only loop.
5. **One move at a time.**
   - No two signature moves share a viewport.
   - At most 6 animations run at once *(day)*.
   - Ambient movement stays within 6 px or 2° *(lamplit)*.
6. **The reader holds the clock.** Scroll-linked motion uses `linear` or `--ease-out`. Springs are for time-based moves only.
7. **Stillness is a pose.** Every element's **base style is its rest frame**, and animations only run from somewhere to that base. The rest frame is what Still, reduced-motion, Firefox and no-JS visitors see, and what screenshots capture.

**Hard rules:**
- Text, headings and the LCP never start at opacity 0.
- Booking is motion-free *(spirits)*: no ambient motion on CTAs, forms, prices, rating figures or the team photo.
- No light changes faster than 400 ms.

### 4.2 Tokens

Add these to `:root` only:

```css
--dur-press: 120ms; --dur-hover: 200ms; --dur-ui: 320ms; --dur-hinge: 420ms;
--dur-section: 600ms; --dur-scene: 900ms; --dur-lamps: 2400ms; --dur-phrase: 5s;
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);   /* the splash curve, named; --ease-out stays */
--ease-lamp: cubic-bezier(0.3, 0, 0.1, 1);       /* a filament warming */
--ease-sway: cubic-bezier(0.37, 0, 0.63, 1);
--ease-paper: linear(0, 0.24 8%, 0.62 20%, 0.9 33%, 1.025 47%, 1.01 62%, 1); /* time-based only */
```

### 4.3 Signature moves

| Move | What happens | Driver |
|---|---|---|
| **Curtain up** | The existing Splash, once per visit, re-skinned as teak fibre paper with a card-edged diamond hem. The boot script removes `html.splash` after 5000 ms, once the last hero phrase has ended (≤ 4.7 s). | time |
| **Lamplighting** | The hero lamps drop 12 px (700 ms, `--ease-paper`, 90 ms stagger). They light left to right (600 ms, `--ease-lamp`, 140 ms stagger), and the halo scales .9 → 1.03 → 1, one 3% catch *(day)*. Then they sway ±1.5° once over 2.4 s, all starting rightward, 120 ms apart, like one breeze *(lamplit)*. By Day they stay unlit, so only the drop and the sway run; switching to Evening lights them again. It starts 300 ms after load (1450 ms under `html.splash`, as the curtain clears the top of the screen). | time, CSS |
| **Open the house** *(day)* | The `street` layer fades and slides 12 units toward the viewer while the interior fades in. No zoom. | scroll |
| **Floor lift** | The 1st floor wrapper moves `translateY(calc(var(--u) * -90))`. The keyframes are on `transform` itself, never on an animated custom property. Its thread SVG moves with it, and the stair link fades in at the end. | scroll / IO fallback |
| **Thread walk** | Each floor path's `stroke-dashoffset` runs 1 → 0, in segments that stop at each `at`. Each ring settles (scale .6 → 1) as the thread reaches it. The bead rides `offset-path`, inside `@supports`. | scroll |
| **Lights on** | The glow discs light in walking order (600 ms, 40 ms stagger *(spirits)*, ≤ `--dur-lamps`). It plays on entry and after each theme switch: the `animation-name` changes per theme, which restarts the animation. It never plays inside the 450 ms theme fade. In the home theatre, the discs follow Act C instead. | time |
| **Curtain close** | H01's curtain goes `scaleX` .15 → 1 (`transform-box: fill-box; transform-origin: 0 50%`). By Evening, its lamp then lights. | scroll |
| **Pop-up** | A decorative plane hinges from `rotateX(62deg)` to 0 about its bottom edge (perspective 900px), over `view()` entry 10%–80%. Never on text. | scroll |
| **Tag swing** | HTML tags rotate −4° → 0 about their pin (`--dur-hinge`, 80 ms stagger). Never on ratings. | phrase |

### 4.4 The motion toolkit

These are client-only, with no new dependencies.
- `useMotionAllowed` does the job of `usePrefersReducedMotion`.
- There is deliberately no `useScrollProgress`. Only CSS timelines and `useActiveStep` read scroll, and nothing adds a scroll listener.
- `setMotion("still")` is the pause-all control.

```ts
// lib/motion/prefs.ts
export const MOTION_KEY = "hoj-motion";
export type MotionChoice = "full" | "still";
export function readMotion(): MotionChoice;
export function setMotion(choice: MotionChoice): void; // localStorage in try/catch, html[data-motion], event "hoj-motion"
export function motionAllowed(): boolean;              // not reduced and not still
// lib/motion/hooks.ts ("use client")
export function useMotionAllowed(): boolean;           // useSyncExternalStore; server snapshot false
export function useInView<T extends Element>(ref: RefObject<T | null>, o?: { rootMargin?: string; threshold?: number; once?: boolean }): boolean;
export function useActiveStep(container: RefObject<HTMLElement | null>, selector: string, rootMargin: string): number; // -1 before the first
// components/motion/StageLife.tsx ("use client", ≈1.5 kB), mounted once in app/layout.tsx
export function StageLife(): null;
// components/motion/MotionChoice.tsx ("use client"): fieldset "Motion", Full | Still, beside ThemeChoices
export function MotionChoice(props: { tone?: "deep" | "page" }): JSX.Element;
```

**What `StageLife` does:**
- On mount it sets `html[data-life]`. It rescans on `usePathname()` and adds no MutationObserver.
- It sets `data-live` on any `[data-stage]` within 25% of the viewport while the tab is visible. Every time-based ambient animation carries the class `.amb`, and CSS pauses it outside a live stage.
- It sets `data-played` the first time a `[data-phrase]` is 35% visible. Elements in view at mount get both attributes in one frame, so they never jump.
- When idle, it preloads the other theme's layers (`img[data-alt-src]`).

**Phrase contract.**
- A phrase whose first keyframe is not the rest frame is a transition. Its start pose is `:root[data-life] [data-phrase]:not([data-played])`.
- A phrase that starts and ends at rest (sway, wisp) is an animation under `[data-played]`.

**Boot script (`lib/theme.ts`).** It adds three things:
- `hoj-motion` → `data-motion="still"`;
- the splash timeout;
- `data-vt-phase`, from Vientiane time (UTC+7, no daylight saving).

The phases start at these times:
- `quiet` at 21:00;
- `morning` at 07:00;
- `day` at 10:30;
- `arrivals` at 14:00.

The boundaries come from `content/stay` when the script string is built. This adds about 400 bytes. `app/theme.test.ts` covers each key, storage that throws, and a mocked clock.

### 4.5 Still and reduced motion

`globals.css` gets a Still reset that mirrors the reduced-motion one. Under `:root[data-motion="still"]`:
- every element and pseudo-element gets `animation: none !important` and 0.01 ms transitions;
- `::view-transition-group(*)` gets `animation-name: none`.

New motion CSS sits inside `@media (prefers-reduced-motion: no-preference)`, under `:root:not([data-motion="still"])`.

The rest frames are:
- floors lifted;
- thread drawn and labels shown;
- curtain closed;
- lamps lit by Evening;
- the tuk-tuk parked at 40%.

Nothing loops for more than 5 s, so no per-scene pause buttons are needed (WCAG 2.2.2). The site-wide **Motion: Full / Still** choice sits in the footer and the mobile menu.

### 4.6 Page transitions

**The layout wrapper.** `app/layout.tsx` uses:

```tsx
<ViewTransition default={{ "nav-forward": "page-forward", "nav-back": "page-back", default: "auto" }}>
```

The boundary updates on every navigation, so pages need no wrappers of their own.

**Motion:**
- **Forward:** the old page fades over 200 ms and drops 0.75rem. The new one lowers from −1.25rem to 0 over 360 ms, `--ease-out`.
- **Back:** the mirror of forward.
- **Untyped navigations:** keep today's 300 ms cross-fade, with `site-header` frozen.
- **Reduced motion or Still:** a 200 ms fade.

**Typed links:**
- `["nav-forward"]` goes on in-content links deeper into the site: home links, cards, `ReadNext`, `GuideCards` and the BookingCard.
- `["nav-back"]` goes on `Breadcrumbs` and the Wordmark.

**Morphs** *(lamplit)*:
- new eyebrow senders `eyebrow-trips`, `eyebrow-guides` and `eyebrow-about`;
- a `booking-ticket` morph from the BookingCard to the `/book` panel.

### 4.7 Micro-interactions

- **Primary button:** sits on a 2 px `--paper-edge` and presses flat in `--dur-press`.
- **Underlines:** draw in like thread (`scaleX` from the left).
- **Card art:** lifts 4 px with `rotateX(4deg)` on hover or focus.
- **Menu and `<details>`:** unfold from a top hinge (`@starting-style`, `interpolate-size`).
- **Dialogs:** get an exit (`allow-discrete`).
- **Theme toggle:** the moon becomes the house lamp.

---

## 5. Pages

### 5.1 Home (`app/page.tsx`)

**Order:**
1. Hero
2. `WovenBand diamond` (unchanged)
3. ① Theatre and room niches
4. ② Standards
5. ③ Ratings
6. Team
7. ④ Ask Shadow
8. ⑤ Neighbourhood
9. BookingCard
10. `PageJsonLd`

Every hook stays:
- the skip link;
- `[data-ask-shadow]` "Is breakfast included?";
- `[data-hides-launcher]` on the hero and the BookingCard;
- `#booking-card-title`.

**Hero** (`components/home/Hero.tsx`):
- **Copy (unchanged):** "ສະບາຍດີ · Sabaidee", the h1 "A calm house in the heart of Vientiane.", the lede, `directPriceShort`, Book, Ask Shadow, and the `ratings[0]` chip.
- **Photo:** `dormCorridor` in a mat, with `preload` instead of `priority`.
- **Lamps:** three `HouseLamp`s hang above the arch's crown, at 22%, 50% and 78% across, with cords of 28, 44 and 36 px. Their halos sit behind the mat.
- **Motion:** Lamplighting on load. Over the hero's `view()` exit, the lamps rise 24 px, linear.
- **House-now line** *(day)*: five server-rendered spans. CSS shows the one matching `html[data-vt-phase]`.
  - **default (no JS):** "Check-in 14:00–21:00 · quiet hours 21:00–07:00 (Vientiane time, UTC+7)."
  - **quiet:** "Quiet hours in Vientiane until 07:00. The team is on site all night: message any time."
  - **morning:** "Morning in Vientiane: breakfast 08:00–10:30 in the café."
  - **day:** "Check-in opens at 14:00 (Vientiane time)."
  - **arrivals:** "Check-in is open until 21:00 (Vientiane time)."

  Every time is a `content/stay` variable.

**① The theatre** (`components/home/HouseTheatre.tsx`, built around `PaperStage`):
- **Section:** `<section id="the-house-story">`, 260svh tall on desktop and 200svh on phones, with `view-timeline: --theatre`. A "Skip the house story" link comes first.
- **Desktop:** text on the left (5/12) and the stage on the right (7/12). The stage is sticky at `top: calc(header + 2rem)` and `min(80svh, 46rem)` tall.
- **Phones:** the stage is sticky at `top: 0`, 48svh tall, with `overflow: clip`. It shows the ground floor and the 1st floor in the `crop(["ground","floor1"])` frame, with no pan or zoom.
- **No `data-hides-launcher`:** the dock and its Book button stay.

| `contain` range | Act | Stage | Text (server HTML) |
|---|---|---|---|
| 0–20% | A Open | `street` → interior | Eyebrow ① "The house" (morph `the-house`); h2 "Made for a good night’s sleep."; lede "`${building.cafe.value}`, dorms upstairs." |
| 20–45% | B Lift | The 1st floor lifts. Tags swing in at 30, 34 and 38%: "Café and front desk", "Dorm H: 14 pods" (count from the model) and "Shoes off at the stairs". | The same three phrases, as a list. |
| 45–95% | C Walk | The thread walks `arrival`; stop *i* lights at `45 + 50·at` %. At Check in, `jar-big` glows and one arch wisp rises. At Shoes, the landing jar and the cubbies glow. | An `<ol>` of the 5 stops (`<h3>{label}</h3><p>{does}</p>`). The active step gets the thread marker; the others go to `--text-soft`, which is still AA. |
| 95–100% | Curtain | H01's curtain closes. By Evening, its lamp lights. | "There is no pod 4, 13 or 14: `${beds.numbering.value.why}`." and "Quiet hours `${times.quietHours.value}`." Links to `/the-house#section` and to "Practise the walk: play Find your pod" (`/the-house#play`). |

**How the theatre is built:**
- It is pure CSS. Stage animations read `animation-timeline: var(--stage-timeline)` and `animation-range` custom properties, which `HouseTheatre` sets. Per-stop ranges are inline styles from `actRanges()`.
- **No scroll timelines:** `StageDirector` sets `data-act` and `data-step` from `useActiveStep`, and CSS transitions (`--dur-scene`) play the same states.
- **No JS:** the rest frame.
- The three room cards follow, as paper niches with Pop-up art.

**② Small things, done well** (deep band). The Ledger's ticks become running stitches: a `3 2` dash drawn on `view()`. The Stamp stays, and the bathroom cleaning row keeps its "guests say".

**③ What guests say.**
- The three ratings hang as tags on one drawn thread, each marked "As of 25 September 2026". The thread draws itself; the tags stay still.
- One petal crosses once, on entry: `offset-path`, rotating to 200°, over 4.8 s with `--ease-sway`.

**Team.** The `entrance` photo sits in an arch mat with the Evening wash. No people are drawn.

**④ Ask Shadow.** A lamplit scrim: a square plate with a CSS radial gradient. On it, the silhouette slides 0.75rem aside on entry, next to the existing 3D WebP. The four questions are unchanged.

**⑤ The neighbourhood.** A `Diorama` (inline SVG, ≤ 6 kB), 16:5 on desktop and 4:3 on phones:
- **back:** Mekong ribbons (rate 0);
- **middle:** rooftops with the riverside drawing's lantern strings (0.15);
- **front:** a `TukTuk` crossing 0 → 55% over `view()` cover. In the still it is parked at 40%.

The Ledger of places stays, the night market keeps its "guests say", and there is no map pin.

**BookingCard.**
- The ticket slides 1.25rem out of its slot.
- New line: "Your first morning: breakfast from 08:00." (from `breakfast.hours`).
- The form, hooks and band are unchanged.

The home page gains about 14 kB of HTML and ≤ 4 kB gzip of new JS.

### 5.2 `/the-house` (`app/the-house/page.tsx`)

1. **PageHeader:** unchanged.
2. **"Your pod":** `PodDiagram` becomes a paper pod. Its curtain slides open on entry, and its four plates hang as tags.
3. **"The house in section"** (`id="section"`): `HouseStage` shows all three floors.
   - **Lift:** floors lift on scroll in a 160svh section. Phones get a static exploded still.
   - **Walk chips:** a radio group of Arriving, Breakfast, Leaving early, A smoke, Water and Bathroom. "The team's round" appears only when `isFirm(staff.housekeepingRound)`.
   - **Choosing a chip:** loads `walks.json` once, swaps the thread paths and replays the walk in 2.4 s. A server-rendered `<ol>` of stops sits beside the stage. Without JS, all walks are listed in `<details>`.
   - **Overlays:** the old hotspots as `<details>` at `anchorOf()` ids, the camera dots, and both captions.
   - **Approval:** replacing `HouseCutaway` needs the owner's sign-off. The old file stays until then.
4. **"A look inside":** mats, numbers and paper twins, each with `id="photo-{key}"`.
5. **Other blocks:** unchanged.
6. **"Find your pod"** (`id="play"`): the launcher, with a still poster.
7. **End of page:** `ReadNext`, `BookingCard` and `PageJsonLd`.

### 5.3 Other pages

- **/house-rules: "Where each rule lives".**
  - A sticky `RulePlan` holds the paper plans of the ground floor and the 1st floor.
  - Each placed rule's `<li>` carries `data-places` from `placedHouseRules()` and a visible line, "Where: {where}".
  - A rule lights its areas when hovered (`:has()`, *lamplit*) or when it crosses the middle of the screen (`CurrentMarker`, ≤ 1 kB).
  - The plan is `aria-hidden`; the "Where" line carries the fact.
  - "When you arrive" gets the film (§7).
- **/vientiane:** the header art becomes a small `Diorama` in which the tuk-tuk rolls in once (900 ms). "On foot" keeps the riverside drawing, with parallax layers. No map.
- **/trips:** a `PaperTrain` slides into the header once (900 ms). By Evening its windows glow. `TripRequest` is untouched.
- **/faq:** the topic chips become square paper index tabs. Nothing moves.
- **/about:**
  - Three paper stone jars (seeded `stoneJar()`) pop up beside the Plain of Jars text. The name story keeps "nods to".
  - Beside the mark story, the mark builds from `MARK_PARTS`, and one arch wisp traces it.
- **/guides and the 8 guides:**
  - Cards become paper niches with Pop-up art and a glow on hover or focus.
  - Header art also shows on phones, as a 6rem tile.
- **/book:** calm.
  - The ticket morphs in.
  - Once dates are chosen, a mini rail appears *(day)*: "Check-in from 14:00 on Friday 9 October · breakfast 08:00–10:30 · check-out by 11:30 on Sunday 11 October".
  - With online booking, confirmation lights one lamp and ties the thread in a knot (1.2 s).
  - Still three steps or fewer. All hooks and labels are unchanged.
- **404:**
  - "This jar is empty." `OpenJar` becomes paper.
  - A tap or Enter wobbles it (±3°, 420 ms) and sends up one arch wisp *(spirits, lamplit)*.
  - `ShadowFigure` peers over the rim.
  - A `FindYourPodLauncher` button reads "Play Find your pod".
- **/privacy:** unchanged.

---

## 6. The game: "Find your pod"

**What it is.** Turn-based wayfinding on the paper plans. You are a small lamp light, never a person, and you cannot lose *(day)*.

**Nudges.** A mistake brings a nudge: Shadow's bust holds up the rule and its reason, word for word from `content/stay`. For example: "No shoes upstairs, on the dorm floors. Clean floors, as in most Lao homes."

**Errands:**
1. **"16:20, you've arrived: find pod H12."** The steps are:
   - the door;
   - check in at the desk (passport and deposit);
   - shoes off at the foot of the stairs;
   - shoes into a landing cubby;
   - climb into H12.

   The pod list teaches the custom: "The next pod isn't 13: the house skips 4, 13 and 14…" (`beds.numbering`).
2. **"23:50, back late."** The door is locked: knock on the glass, and the night staff opens it. Then shoes off, the cubby, your pod.
3. **"06:40, leaving early."** The steps are:
   - shoes and bag from the landing (packing in the dorm draws a nudge);
   - shoes on;
   - pack in the café;
   - check out (deposit back);
   - the night staff opens the door before 07:00.

**Win.** Each errand earns `3 − nudges` lamps, with a minimum of 1. When all three errands are done, the house lights in sequence and the curtain closes: "Sleep well. Quiet hours 21:00–07:00."

**After the win:**
- a secondary "Book direct" link;
- "Play again";
- Share: Web Share with "I found my pod at House of Jars: 8 of 9 lamps." and `/the-house#play`, falling back to copying the text.

Nothing is tracked.

**Controls:**
- Arrow keys and WASD move to the nearest neighbour within 60° of that direction.
- Tab walks a mirrored HTML list of moves and actions (`<button>`s), and Enter or Space acts. Tap targets are ≥ 44 px.
- An `aria-live="polite"` line names the place and the next task.
- The lamp moves by a `--dur-ui` transform, or jumps under Still. There is no frame loop and no per-frame DOM.

**States:** `intro`, `playing(errand)`, `nudge`, `errand-done`, `won`.

**Files:**
- `lib/game/types.ts`, and `lib/game/engine.ts`, which is pure, client-safe and has no `lib/house` import.
- `lib/game/build-graph.ts` (Node only): reads the model routes, `planOverlay`, the rules and `content/stay`.
- `lib/game/*.test.ts`, which checks that:
  - every errand is solvable (BFS);
  - every nudge text exists in content;
  - no pod is numbered 4, 13 or 14;
  - the committed JSON matches a fresh build.
- `scripts/house-game.ts`: writes `public/game/find-your-pod.json` (≤ 6 kB).
- `components/game/FindYourPodLauncher.tsx`: calls `import()` on hover, focus or click.
- `components/game/FindYourPod.tsx` and its `.module.css`: a native `<dialog>` with an h2 title.

**Engine.** It is a pure reducer, internal to P8, with five functions:
- `start(errand, graph)`
- `options(state, graph)`
- `play(state, move, graph) → { state, say, nudge? }`
- `neighbourInDirection(state, graph, dir)`
- `lamps(state)`

`GameGraph` holds the nodes (id, floor, x, y, area, label, actions), the edges, the pods, the rule texts and the plan viewBoxes. `GameState` holds the errand, node, clock, shoes (`on`, `carried` or `cubby`), bag, check-in and the number of nudges.

**Budget.** ≤ 16 kB gzip of JS, plus the JSON. The game reuses the `paper-plan-*` images and loads nothing before Play.

**Where it appears.** At `/the-house#play`, linked from the end of the home theatre and from the 404.

---

## 7. Video

**How it is recorded.** `scripts/film.ts` uses playwright-core (already installed) with `CHROMIUM_PATH`, against `npm run build && npm run start`. The site has **no film mode**. The script:
1. sets `hoj-splash` and the theme through `addInitScript`, and hides `[data-site-header]` and the dock;
2. steps `scrollTo` in 1/30 s increments, so scroll timelines come out exact;
3. pauses every time-based animation in `document.getAnimations()` and sets its `currentTime` each frame;
4. waits two rAFs, then screenshots each frame to the git-ignored `film-frames/{film}/%05d.png`.

It encodes with the system `ffmpeg`, adding no new dependency: VP9 WebM (`-crf 34 -b:v 0`) and H.264 MP4 (`-crf 23 -pix_fmt yuv420p`).

**The films:**
1. **"From the terrace to your pod"** (20 s):
   - in 9:16 (a 432×768 viewport at 2.5× DPR) and 1:1;
   - WebVTT captions from the stops' `does`;
   - a cut under 1 MB for the team to send on WhatsApp.
2. **"Lights on"** (8 s): Day turns to Evening.
3. **"No pod 4, 13 or 14"** (10 s), on the game's Dorm H plan. Chinese, Korean and Japanese subtitles are added only after native-speaker review.

**On the site.** Only `/house-rules` shows a film, under "When you arrive":
- `<video controls preload="none" playsinline width height poster>` with an English `<track>`;
- ≤ 1.2 MB WebM at 720p plus an MP4 fallback, in `public/film/`;
- it never autoplays.

`components/film/Film.tsx` reads `films.ts` and renders nothing until the files are committed.

---

## 8. Work packages

**Rules for every package:**
- Edit only the files you own. Changes to anyone else's file go to that package as a note.
- A package is done when `npm run lint`, `npm run typecheck`, `npx vitest run` and `npm run build` pass. `npm run smoke` must also pass against a production build, with its screenshots checked against §1.
- Copy: British spelling, colons rather than em dashes, en dashes in ranges, 24-hour times, no exclamation marks, credits on soft facts.

**P0 · Integration.** Owns `app/globals.css`, `app/layout.tsx`, `app/page.tsx` and `app/the-house/page.tsx`.

*Stage 1 lands first, within a day:*
- the §2.2 and §4.2 tokens;
- the `.for-day` and `.for-evening` rules, after the token blocks;
- the Still reset;
- `[data-stage]:not([data-live]) .amb { animation-play-state: paused }`;
- the `page-forward` and `page-back` classes (fade only under reduced motion or Still);
- `data-scroll-behavior="smooth"`;
- the typed layout `ViewTransition`.

*Stage 2:*
- mount `<StageLife/>`;
- compose §5.1 and §5.2;
- remove the home `Drawing house` echo.

*Done when:* `theme.test` passes, every hook is present, and the §1 budgets are met.

**P1 · House model outfit.**
- Owns:
  - `lib/house/types.ts`, `render.ts`, `palette.ts`, `fixtures.ts` and `render.test.ts`;
  - the new `lib/house/paper.ts`, `deckle.ts` and `paper.test.ts`;
  - `scripts/house-render.ts`, `docs/HOUSE_MODEL.md` and the generated `public/house/*`.
- Exports: everything in §3.2–3.3.
- *Done when:* the old renders are byte-identical and the §3.4 tests pass.

**P2 · Motion toolkit and chrome.**
- Owns:
  - the new `lib/motion/prefs.ts`, `hooks.ts` and `prefs.test.ts`;
  - the new `components/motion/StageLife.tsx`, `MotionChoice.tsx` and its `.module.css`;
  - `lib/theme.ts` and `app/theme.test.ts`;
  - `components/layout/*`;
  - `components/concierge/ConciergePanel.module.css` and `components/ui/button.module.css`.
- It guarantees these attributes: `html[data-motion|data-life|data-vt-phase]`, `[data-stage][data-live]` and `[data-phrase][data-played]`.
- *Done when:* the boot script is tested, Full/Still works by keyboard in the footer and the menu, and the dialog and menu have exits.

**P3 · Art, brand and photos.**
- Owns:
  - `public/art/**`, including `public/art/evening/*` and `paper-fibre.svg`;
  - `components/art/*`: `Drawing`, `drawings.ts` and `OpenJar`, plus the new `HouseLamp`, `ArchWisp`, `Petal`, `TukTuk`, `PaperTrain`, `Diorama`, `StoneJars`, `glow.module.css` and `evening.test.ts`;
  - `scripts/art-evening.ts`;
  - `components/brand/Splash.*` and `Wordmark.tsx`;
  - `components/shadow/ShadowFigure.*` (the silhouette must stay under 3.5 kB);
  - `components/PhotoFrame.*` and `content/photos.ts`.
- Interfaces:
  - `HouseLamp {cord: number; index: number}`
  - `ArchWisp {size?: number}`
  - `Diorama {variant: "home" | "vientiane"}`
  - `StoneJars {seeds: readonly number[]}`
  - the `.glow` class (`--x --y --r --i`)
  - `PhotoFrame`'s new `mat?: boolean` (default `true`) and `preload?: boolean` (replacing `priority`)
- *Done when:* the drawing, brand, Shadow and evening tests pass, and both themes have been checked.

**P4 · Stage.**
- Owns:
  - the new `components/stage/*`: `PaperStage`, `StageDirector`, `WalkPicker`, `PhotoTwin`, `RulePlan` and `CurrentMarker`;
  - the new `lib/stage/acts.ts` and `acts.test.ts`;
  - `components/house/*`: `PodDiagram` and the new `HouseStage`. `HouseCutaway` is left untouched.

```ts
interface PaperStageProps { id: string; floors: readonly FloorId[]; route?: string; open?: boolean; curtain?: string; lift: "scroll" | "static";
  labels?: readonly { text: string; anchor: string }[]; spots?: readonly { n: number; key: string; caption: string; anchor: string }[];
  hotspots?: readonly { id: string; title: string; text: string; anchor: string }[]; caption: string; note?: string }
// Ancestor CSS inputs: --stage-timeline, --act-a, --act-b, --act-c, --act-d (animation-range values)
export function actRanges(stops: readonly StageStop[], c: readonly [number, number]): { label: string; range: string }[];
// HouseStage {} · PhotoTwin { area: string } · RulePlan { scope: string } · CurrentMarker { selector: string }
```

- *Done when:*
  - only transforms animate, with `will-change` only during acts;
  - the IO fallback works in Firefox;
  - the rest frame equals the end frame;
  - nothing overflows at 390 px.

**P5 · Home sections.**
- Owns:
  - `components/home/*`: `Hero`, `HouseTheatre`, `RoomNiches`, `RatingTags`, `ShadowScrim` and `Neighbourhood`, each with no props;
  - `app/home.module.css`;
  - `components/ui/Ledger.*`.
- *Done when:* the LCP is unchanged, acceptance criterion 2 holds in Chrome, Firefox and Still, and all copy comes from `content/` or the model's `does`.

**P6 · Inner pages.**
- Owns:
  - `app/house-rules/*`, `app/vientiane/page.tsx`, `app/trips/page.tsx`, `app/faq/page.tsx`, `app/about/page.tsx`, `app/guides/page.tsx` and `app/not-found.*`;
  - `components/page/*`;
  - `components/guide/*`.
- *Done when:* every route passes smoke in both themes, and `content/guides.test` passes.

**P7 · Booking and content facts.**
- Owns `content/stay.ts`, `app/book/page.tsx`, `components/book/*`, `components/BookingCard.*`, and the new `lib/booking/stay-rail.ts` and its test. No zod import.
- Its first commit lands before anything else is built on these facts:
  - `beds.numbering = fact({ skipped: [4, 13, 14], why: "so no guest is given an unlucky bed" }, sources.team, { note: "Numbers from the owner's bed register; confirm the reason's wording before launch." })`
  - `staff.housekeepingRound = fact("About every hour", sources.assumption, { note: "From the house model's walk; ask the owner." })`

  The round fact is soft, so the round stays hidden for now.
- *Done when:* the booking smoke checks pass, and so do the `pages`, `structured-data`, `llms` and `certainty` tests. The rail must handle month ends.

**P8 · Game and film.**
- Owns:
  - `lib/game/*`, `components/game/*` and `components/film/*`;
  - `scripts/house-game.ts` and `scripts/film.ts`;
  - `public/game/*` and `public/film/*`;
  - `.gitignore`;
  - `package.json`, where it adds only the `house:game` and `film` scripts and no dependencies.
- *Done when:*
  - the game works by keyboard, touch and screen reader;
  - its JS is ≤ 16 kB gzip and lazily loaded;
  - the arrival film is ≤ 1.2 MB with captions.

**Order of work:**
1. P0 stage 1 and P7's facts.
2. P1, P2, P3 and P8, in parallel. P8 uses the existing `plan-*.svg` until P1 lands.
3. P4. It can stub its layers with `renderCutaway` until P1 merges.
4. P5 and P6, which need P3 and P4. P6 also needs P8's `Film` and launcher.
5. P0 stage 2.

---

## 9. Risks, the cut list, and what not to do

**Risks:**
- **Stacking across floors:** separate layers lose depth sorting between floors. `ground-front` covers this, and P1 compares stacked shots with `cutaway.svg`.
- **No scroll timelines:** the IO fallback covers visitors with JS; others see the still.
- **Raster memory:** keep at most 3 visible layers, set `will-change` only during acts, and test on a throttled mid-range Android.
- **Owner approvals:** the `HouseCutaway` swap, the wording of the 4/13/14 reason, and the round's frequency. The 2nd floor stays dimmed.
- **Busyness:** review every page with motion on and with Still. Where two things move in one viewport, cut one.
- **Translations:** CJK captions need native-speaker review.

**Cut first, in this order:**
1. Films 2 and 3.
2. Game errands 2 and 3.
3. Walk chips other than Arriving.
4. The home diorama.
5. Paper twins (keep the camera dots).
6. The House-now line.
7. Typed page transitions.
8. Act A (the story opens on the cutaway).

**Never cut:**
- the real hero photo in the arch;
- the paper style and its tokens;
- the home floor lift and thread;
- the stills and the Still choice;
- booking clarity.

**Do not:**
- **Picture:**
  - add creatures, jar spirits or a second mascot;
  - hang festive lantern strings in the hero;
  - draw sacred figures, or light the shrine;
  - add hues, put text on art, or decorate booking zones.
- **Motion:**
  - fold the facade with matrix keyframes;
  - zoom or pan through SVG;
  - animate custom properties per frame;
  - put springs on scroll-linked motion;
  - tie motion to the Vientiane clock;
  - autoplay video.
- **Code:**
  - inline a full cutaway, or ship `theme: "auto"` SVG;
  - put `<filter>` in `public/art` or `public/house`;
  - animate fills across many paths;
  - select a bare `[data-floor]`;
  - add routes, a second h1 or extra JSON-LD;
  - rename any smoke hook;
  - use `Math.random` or `Date.now` in render.
- **Facts:** don't state the 2nd floor, locker positions, the round's frequency or the numbering reason as firm before `content/` says so.

---

## 10. Amendments (owner's brief, 5 October 2026)

These override the sections above where they disagree.

1. **More air and wonder.** The owner asked for a magical, hand-drawn animated feel, so the theatre gets more light and air, still original and still phrases, never loops:
   - **A paper sky** behind the home theatre stage: a back plane (rate 0) with two or three cut-paper clouds that move with the scroll (parallax, not a loop). By Evening a paper moon and a few pin-prick stars fade in once, as a phrase.
   - **Lamp motes.** When lamps light (Lamplighting in the hero, Lights on in a stage), three to five warm motes (4–6 px `--lamplight` discs) rise 24–40 px and fade, within 3 s, once. They count towards the six-animation limit.
   - **A breath of wind.** Once per scene entry, the awning valance and the pod curtains lift by up to 2° and settle, as one phrase.
2. **The new house drawing is approved.** The owner asked for the new model to be used, so `/the-house` replaces `HouseCutaway` with `HouseStage`. Delete `HouseCutaway` once nothing uses it.
3. **The housekeeping round is firm.** The owner said it (`staff.housekeepingRound`, confirmed), so the "The team's round" walk chip shows on `/the-house`.
4. **Bed numbering is firm.** `beds.numbering` (skipped 4, 13 and 14, "so no guest is given an unlucky bed") is confirmed by the owner.
5. **Every photograph is drawn; real photographs only on the booking page (6 October 2026).** The owner asked for the whole site in the drawn style, with the real photographs kept for the moment a guest books, as Booking.com and Agoda show them before you pay. This overrides "photos stay real" in §1, §2.4 and §5:
   - **Drawn from the photograph.** Each photograph in `content/photos.ts` has a drawing (`scripts/art-paper/d/`, built to `public/art/` with its Evening twin), drawn at the shape of the frame it fills. A drawing is faithful: the same view, the same things in the same places, countable things kept to their count, nothing invented, nothing made nicer than it is, no legible words except the house's own name where it is painted on the real thing (the sign over the entrance, in Lao and English, from the site's fonts).
   - **One switch.** `PhotoFrame` shows a photograph's drawing, with the photograph's caption and the drawing's own alt text, unless the page passes `real`. Only `/book` does, in "Real photos" right after the booking itself, each photograph whole at its own shape.
   - **Everywhere else** (the hero, the team, "A look inside", the lockers, `/about`, the share image) shows the drawings. The hero's LCP is the dorm drawing.
   - **The paper twins go.** Beside a drawing, a crop of the house drawing says the same thing twice; the numbered dots stay and now read "Seen in…".
6. **An unhurried, premium pace (6 October 2026).** The owner asked for the motion to feel luxurious: same direction, slower and softer. Every time-based phrase, transition and page change takes about 1.6 times as long (`--dur-*` in `app/globals.css`, and the few timings written in place), with the same choreography in proportion. `--ease-out` lands long and soft, and `--ease-paper` glides into place with no overshoot: nothing bounces. A press still answers at once (`--dur-press` 160 ms). The lamps sway ±1° and pictures lean in 2% under the pointer. Scroll-linked scenes keep following the reader's scroll. Still and reduced motion are unchanged, and the splash class stays 8 s so the slower Lamplighting ends under it.

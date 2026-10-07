# The house, up close: final build spec for the immersive house explorer (Phase 2, items 5 to 9)

> **Status: a plan, not built yet.** The agreed design for "Walk through the house", the full-screen house a guest can explore. Building it is paused. When it is built, its decisions move into docs/DESIGN.md as amendment §10.14 and this file is retired.

The spec an engineer builds from, 7 October 2026. Spine: **Concept B, "the guided host"** (clear cards, plan crops with numbered steps, room framing as the phone fix, screen-space labels, delegated launchers). Grafts from **Concept A, "the dollhouse"** (floors as trays, the lift-off from the stage, van Wijk flights, coasting and rubber-band maths, zoom tiers in pixels per metre, Ask Shadow inside, picking by projection). Every conflict between the two is settled below. Facts and numbers were checked against the code on this date. Section 0 lists what each concept got wrong, so nobody builds a mistake back in.

Read `AGENTS.md` and the Next 16 docs it points to before coding. Build on top of **Workflow 1's integrated branch** (the floating dock Shadow, the hero lamps' catch, the silky band). This spec depends on its `HouseLamp` keyframes and its `shadowDock` asset.

---

## 0. What was checked, and what changes from the concepts

**Measured or read in the code (true):**

- **Stage frame.** The stage viewBox is `[-605, -557, 758, 991]` with `liftPerLevel` 90 (one level is 9.0817% of the world's height). `crop(["floor1"])` is `[-527, -355, 680, 519]` and `crop(["ground"])` is `[-605, -153, 758, 587]`.
- **Lights and walks.** `lightPoints()` gives 19 lights, none of them the shrine. Floor 1 has only `wall-lamp-1` and `window-h-small`; floor 2 has `wall-lamp-2` and `window-j-low`. `walks.json` is 15.0 kB raw and 3.25 kB gz, with 7 routes. Arrival's stops are the areas entrance, desk, stairs-ground, landing-1 and dorm-h. Breakfast's are landing-1, stairs-ground and café. Leaving early's are landing-1, café, desk and entrance.
- **Phone framing** (the free area once the chrome is drawn) proves Concept B's point:
  - whole-house fit is 0.45 px per unit (16 px per metre);
  - fitting a single floor gives 0.45 to 0.50, so no gain;
  - framing a room with the half sheet up gives 0.73 (Dorm H, 26 ppm), 1.20 (bathrooms, 43 ppm) and 1.5 to 2.1 (desk, stairs, toilet, water).
- **Desktop framing** (1440 × 900, with the panel): whole house 0.75, a floor 1.2 to 1.35, rooms 1.9 to 5.2.
- **Fine layers are cheap and worth it.** A paper layer at `detail: "full"`, rendered from a scratch copy of `render.ts`, measures:
  - ground: 85.3 kB raw, 21.6 kB gz;
  - floor 1: 80.0 kB raw, 18.3 kB gz;
  - floor 2: 78.6 kB raw, 17.4 kB gz.

  At room zoom the dorm reads far better: the pods open to show white bedding, pillows and ladders, where the simple layer shows closed brown boxes. **One defect:** in the full-detail paper pen the café's pendant cords disappear, so the shades float. That fix belongs to the look-fix round.
- **Plans.** The paper plans are 272 × 950 (floor 1) and 272 × 1072 (ground). They print the area names, so `paper-plan-floor1` says "Women's bathroom". **A 2nd-floor card cannot reuse the 1st-floor plan.** A `paper-plan-floor2-*` render is needed (`renderPlan("floor2")` already exists for the model outfit).
- **Global CSS.** `html:has(dialog[open]) { overflow: hidden }` is already in `app/globals.css:379`. No scroll-lock rule needs adding.
- **The `/the-house` h1 is "Inside the house"** (`PageHeader`). The dialog title must differ.
- **Shadow's panel.** `ConciergeLauncher` opens it from a document-level `[data-ask-shadow]` click listener, and the panel uses `showModal()`. A second modal stacks above the explorer, so **an Ask Shadow button inside the explorer needs no new code.**
- **Shadow's knowledge has no place facts today.** "Where is the women's bathroom?" has no answer in `buildHouseKnowledge()`.
- **Links.** `linkify()` keeps `search` on internal links. Next's `Link` calls its `onClick`, then returns if `e.defaultPrevented`.
- **History.** Next patches `history.pushState` and `replaceState` and dispatches `ACTION_RESTORE` inside `startTransition`. The root layout wraps pages in `<ViewTransition default={{…, default: "auto"}}>`. Only `/book` reads `useSearchParams`, and home and `/the-house` read only the pathname. So a search-only write should cause no page cross-fade, but this is guarded (§12.4) and smoke-checked.
- **Motion tokens:** `--dur-ui` 520 ms, `--dur-hinge` 680 ms, `--dur-section` 960 ms, `--dur-scene` 1440 ms, `--ease-in-out cubic-bezier(.65,0,.35,1)`.
- **Workflow 1's bulb catch** (`HouseLamp.module.css`, `lamp-halo-day` and `lamp-halo-evening`), 1600 ms on `--ease-sway`:
  - opacity 0 → .7 at 10% → .4 at 18% → .9 at 30% → .72 at 38% → 1 at 56%;
  - scale .9 → 1.03 at 70% → 1.
- **Budgets now:** home HTML 144.1 of 150 kB, home scripts 178.1 of 200 kB gz.

**Corrections to the concepts:**

| Claim | Fix |
|---|---|
| A: the 2nd-floor cards reuse the 1st-floor plan | Wrong: it prints "Women's bathroom". Render `paper-plan-floor2-{day,evening}` and widen `planOverlay` to `"floor2"`. |
| A: dialog title "Inside the house" | Duplicates the `/the-house` h1 for screen readers. The title is **"Walk through the house"**. |
| A: flicker "0 → .55 → .2 → .8 → .6 → 1 over 1200 ms" | Invented. Use Workflow 1's catch exactly, shared by a test (§11.1). |
| A: explorer chunk ≤ 22 kB gz | Not credible for this feature list. The budget is ≤ 30 kB gz JS plus ≤ 7 kB gz CSS. |
| A: add a scroll lock to `globals.css` | Already there. |
| B: zoom capped at 3 px per unit | Too low on desktop: entrance (4.8), water (5.2) and desk (3.7) couldn't be framed crisp. The cap now depends on the device (§6.6). |
| B: 320, 420, 600 and 900 ms timings | Those are pre-§10.6 numbers. Use the tokens. |
| B: "each dip lasts at least 400 ms" | False: Workflow 1's dips are about 130 ms, under its own amendment (an exception to the 400 ms rule, small lights only). Extend that exception to the explorer's discs (§18). |
| B: when hulls overlap, "the nearer one (smaller u+v)" | Backwards. In painter's order, smaller u+v is drawn first, so it is further back. Pick the frontmost: the **larger** u+v (§9). |
| B: "the first number of a stack is the top bunk" | True on the right (H01 over H02, H03/H05, H06/H07). False on the left (H08 under H09, H10/H11, H12/H15, H16/H17). Each pod's tier comes from its own `variant`. Never print that rule. |
| B: step fixtures must lie in the card's own area | Fails for real cases: `luggage-space` is in `cafe`, not `desk`, and the landing's doors belong to the rooms they open. Use a distance rule (§4.4). |
| A and B: the DESIGN amendment is "§10.11" | Taken three times by Workflow 1 (dock, lamps, band), which integration renumbers 11 to 13. The explorer's amendment is the **next free number, expected §10.14**. |
| Both: missed | Next's history sync runs in a transition (§12.4). Chrome's close-request rules affect staged Esc (§14.4). Focus can be lost when Shadow's chip opens the explorer from inside his own modal (§13.3). The fine layer's pendant cords. |

**Scores (0 to 10).** For performance, 10 means the lowest risk.

| | Wonder (first frame) | Clarity, legibility | Cut-paper brand | Feasibility in budget | Accessibility | Performance | Total |
|---|---|---|---|---|---|---|---|
| A, the dollhouse | 9 | 6.5 | 8 | 7 | 7.5 | 6 | 44 |
| B, the guided host | 7 | 9 | 8.5 | 8 | 8.5 | 7.5 | 48.5 |

---

## 1. Decisions at a glance

| Question | Decision |
|---|---|
| Route or overlay | **An overlay.** A native modal `<dialog>`, portalled to `document.body`, opened over home or `/the-house`. No new route, and no intercepting or parallel routes (DESIGN §9). |
| Where it lives | `ExplorerHost` is mounted once in `app/page.tsx` and once in `app/the-house/page.tsx` (≤ 1.5 kB gz). Everything else is a lazy chunk, fetched on intent or click. |
| Launchers | Server-rendered `<a data-explore href="/the-house?room=…#section">` with no JS of their own. One capture-phase listener in the host intercepts them (and any link to an explorer URL, Shadow's chips included). |
| Art | The existing paper layers as `<img>` twins (never inlined). **Fine layers** for the focused floor at room zoom. Plan crops in the cards (simple, fine and plans: §4). |
| Camera | One transform on one `.world` element, with zoom baked into its layout at rest, so the vector art re-rasters crisp (§6). |
| Floors | **Trays.** Choose a floor and the trays above lift away and vanish; the one below sinks and dims. |
| Labels | **Screen-space** paper plates (text never scales). They are tiered by pixels per metre and de-collided at rest. |
| Cards | **13 guest cards** with a plan crop and numbered steps that match pins in the art. Facts come from `content/` with credits, and rules from `rulesAt()`. Staff areas get a "Staff only" plate. |
| Walks | Arriving, Breakfast and Leaving early, plus three more from the cards. The camera glides **stop to stop** with the thread drawing under it, and captions are spoken by Shadow's bust. It plays on once chosen and pauses on any input. Still means manual Next only. |
| Day and Evening | One lamp toggle calls the site's `setTheme`. Lamps in view catch on with Workflow 1's flicker, and a few motes rise. No loops. |
| Shadow | A greeting panel ("Shall I show you round?"), Ask Shadow from cards (MVP) and a floating avatar (polish). His knowledge gains "places, and the link that shows each". His links render as **Show me** chips. |
| URL | `/the-house?room=bath-women`, `?pod=H07`, `?walk=arrival&stop=3`, `?floor=floor1`, `?explore` (§12). |
| Deps | **No new npm packages.** Gestures, flights and inertia are about 5 kB gz of our own code. |
| Motion off | Every move is a cut, nothing plays by itself, lamps are simply lit, and there are no motes. One second after any input, `document.getAnimations().length === 0`. |

---

## 2. The experience

### 2.1 Ways in

| Where | Element (server HTML) | Without JS |
|---|---|---|
| Home theatre, bottom-right corner of the stage frame | `ExploreLink variant="tag"`: a square paper tag reading **Step inside**, with a 14 px glyph of four corner ticks, in the empty paper the iso drawing leaves. `href="/the-house?explore#section"`, `data-explore-from="theatre"` | Goes to `/the-house#section` |
| Home theatre closing links (`TheatreWords links`) | A third link, **Step inside the house** (`data-explore`, same href) | Same |
| `/the-house`, beside the h2 "The house in section" | `ExploreLink variant="button"` (secondary button) **Step inside** | Stays on `#section` |
| `/the-house` stage frame corner | Tag, as on home, `data-explore-from="house-stage"` | Same |
| `/the-house#look-inside`, each "Seen in Dorm H, 1st floor" link | `href="?room=dorm-h#section"` plus `data-explore` | Reloads at `#section` |
| Direct link | `/the-house?room=bath-women` (§12) | `/the-house` |
| Shadow | His reply contains `https://…/the-house?room=bath-women`, which renders as the chip **Show me: Women's bathroom** (§13) | A normal link |

### 2.2 Opening

**Prefetch.** On `pointerover`, `focusin` and `touchstart` (passive, delegated) on any `[data-explore]`, the host starts `import("./HouseExplorer")` and fetches `/house/explorer.json` and `/house/walks.json`. It uses module-level promises that reset on failure, as `loadGame()` does. It fetches no art.

**On click** (MVP):

1. `dialog.showModal()` runs at once.
   - If the chunk is still loading, a shell shows the bar and the line "Opening the house…" (`role="status"`), as `FindYourPod`'s `Shell` does.
   - The dialog enters with the site's dialog entrance (`@starting-style`, opacity plus translate 1.25rem, over `--dur-ui`).
2. The world appears at the first frame (§2.3). Then, by Evening, the lamps in view catch on (§2.8).
3. The panel or sheet rises over `--dur-ui` (`--ease-out`), 200 ms after the world.

**The lift-off from the stage** (polish, `data-explore-from` set and the source stage at least 50% on screen):

- **Frame 1 is the page's own house, pixel for pixel.** Read the source's `[data-world]` rect `R`:
  - `z0 = R.width / 758`;
  - `cx0 = vx + (Fx − R.left) / z0`;
  - `cy0 = vy + (Fy − R.top) / z0`.
- Each tray starts at the source floor's current lift: its computed `transform` translate divided by `--u`. On the source figure, `data-explorer-away` sets `visibility: hidden` on its `.frame`, so no double house shows.
- The dialog's own background starts transparent. The backdrop warms to `--paper-far` while one flight (`--dur-scene`, §6.5) carries the camera to the first frame.
- On home, the 2nd-floor tray comes down into place from 40 units above, fading in.
- If the source is in act none or a (the street front still on), skip the lift-off and use the plain entrance.

**Direct link or Shadow with a `room`.** The first frame is that room's floor in focus pose. Then a flight (`--dur-section`) frames the room and the card rises: about 1.2 s in all.

**Still or reduced motion:** the target frame at once, with no fades.

### 2.3 The first frame

- **The table.** `--paper-far` with `/art/paper-fibre.svg` at 6% (as `.fibre`).
- **The house.** Three trays in the rest pose (lifted 90 units per level), fitted to the free area. The 2nd floor is pale, as its sheet draws it.
- **Floor plates** hang at each tray's left end:
  - "Ground floor · café and front desk";
  - "1st floor · Dorm H, women's bathroom";
  - "2nd floor · Dorm J, men's bathroom".
- **The Shoes-off pin.** A paper plate "Shoes off here" with a jar-orange left rule and an orange-ringed pin, at `anchorOf("area-stairs-ground")`. It is visible at every zoom, in every pose and on every floor. It is never filled orange (§3).
- **Captions,** bottom-left of the drawing on a plate:
  - "Drawn from our walk through the house: positions are approximate." (DESIGN §1.5);
  - "The 2nd floor is drawn as a copy of the 1st floor: not yet photographed." whenever the 2nd floor is in view.
- **The panel (desktop) or peek sheet (phone).** Shadow's bust (`ShadowFigure variant="bust"`) and the h3 **"Shall I show you round?"**, then:
  - **Walk me through:** three chips, "Arriving · 5 stops", "Breakfast · 3 stops" and "Leaving early · 4 stops";
  - **Rooms,** grouped by floor in house order (§4.3), each a button;
  - a hint line that depends on the pointer: "Drag to look around · pinch to lean in · tap a room" (touch) or "Drag to look around · scroll to zoom · click a room" (fine pointer).
- Nothing plays by itself. The first useful thing is a choice.

### 2.4 Gestures

| Input | Does |
|---|---|
| One-finger or mouse drag | Pan. Coasts on release and rubber-bands at the edges (§6.7, §6.8). |
| Pinch | Zoom about the midpoint, panning with it. The zoom gives at the limits and springs back. |
| Wheel / Ctrl+wheel (trackpad pinch in Chrome and Firefox) | Zoom about the cursor (§7.3). |
| Safari `gesturestart` / `gesturechange` | Zoom (`preventDefault`, so Safari never zooms the page). |
| Tap on the art | A guest room: frame it and open its card. A staff area: the plate "Staff only" for 2.4 s, no card. Empty table: up one level (room → floor → house). |
| Tap on a room plate | The same as tapping the room. |
| `+`, `−` and `⤢` buttons (bottom-right of the drawing) | Zoom ×1.5 about the centre, or fit the current target. This is the single-pointer alternative WCAG 2.5.1 and 2.5.7 require. |

No double-tap, so there is no tap delay. A tap is one pointer, under 8 px of movement and under 300 ms. Any input interrupts a flight, a coast or a walk move: the camera stays where it is and the input takes over.

### 2.5 Floors: the trays

The **floor rack** is one radio group with the legend "Floor", in this DOM order: **Whole house · 2nd floor · 1st floor · Ground floor**.
- On desktop and landscape it is a vertical stack of square paper index tabs on the right edge of the drawing, in house order.
- On portrait phones it is a horizontal row under the bar, in the same order (the rack laid on its side), so arrow keys and reading order never disagree.

Choosing a floor F (pose `focus(F)`, table in §10):
1. Trays above F **lift away**: they rise 3 levels, fade and become `visibility: hidden`.
2. The tray directly below F **sinks** 40 units and dims to 0.4. Trays further below hide.
3. 120 ms later the camera follows, flying to fit F's crop. The trays lead and the hand follows.
4. F's room plates swing in (`tag-swing`, 130 ms stagger).
5. The live region says the floor's `say` line, for example "1st floor: Dorm H at the front, the landing with the shoe cubbies, the women's bathroom at the back."

F's world position never changes between poses, so the camera's target for a floor is the same in every pose. **Whole house** reverses all this.

### 2.6 Rooms: the close-up card

Tapping a room, its plate, a panel list item or a `room=` link does five things:

1. **Pose** `focus(room.floor)`.
2. **Camera.** It flies (`--dur-section`) to fit `room.box` in the free area (minus the sheet at *half* on phones, or the panel on desktop), with a 12% margin, capped at `zbMax`.
3. **Spotlight.** The rest of the tray goes into shade (§11.3). On the ground floor, `ground-front` fades to 0.25 while a ground card is open, so the glass door under the awning shows. This fixes HOUSE_MODEL's known gap.
4. **Step pins.** Numbered plates ① to ④ sit at each step's `at` in the art (screen space).
5. **The card** replaces the greeting in the panel, or rises to *half* in the sheet (§4.3 for its content). Focus moves to the card's h3 (`tabindex="-1"`). The live region says "1st floor. Women's bathroom."

Each step in "How it works" is a button. Pressing it flies the camera to that step's `box`, so the steps double as close-ups ("The showers", "The built-in bar").

The fine layer of that floor is requested, and it cross-fades in over the simple one once decoded (§4.2).

**Closing a card** (×, Esc, "Back to Shadow", or a tap on empty table) fades the spotlight and pins. The camera stays where it is, with no fly-back, and focus returns to what opened the card.

### 2.7 Guided walks

**Chips:** Arriving, Breakfast and Leaving early. "More walks" (a disclosure in the panel) holds A smoke, Water and Women's bathroom, which can also be started from their cards ("Walk me there"). The team's round is left out of the guest explorer. It stays on `/the-house`'s chips.

Choosing a walk:
1. **Pose** `walk(route)`: the floors the walk visits rest at their lift; floors above the highest visited floor lift aside (§10). The walk's thread is laid on its paper casing per floor (`caseThread`), undrawn.
2. **Caption mode.** The panel or sheet shows:
   - the walk's name and `when`, and "Stop 1 of 5";
   - Shadow's bust beside the caption: the stop's label (h3) and its full `does` at 1.125rem/1.45;
   - "Rules here" (up to 2) in a `<details>`;
   - the controls ◀ Back · ❚❚ Pause / ▶ Play · Next ▶ · End.
3. **Each leg** (stop k−1 → k):
   - the camera flies to the stop at walk zoom: `zWalk = clamp(min(free.w, free.h) / 300, 1.0, min(2.6, zbMax))`, centred on the ring;
   - over the same duration the thread draws from `at[k−1]` to `at[k]`, across floors by share, and the lamplight bead rides ahead (§11.2);
   - a leg that changes floor (Shoes off → Shoes) draws the dotted stair link in the middle 25% of the leg. Both floors are already at rest lift in walk pose, so the link's lifted geometry is exact;
   - on arrival the ring settles (`scale .6 → 1`, `--dur-hinge`). At "Shoes" the cubbies glow (`STOP_GLOWS`). The caption changes and is announced.
4. **Pace.**
   - Playing: wait `dwellMs(does) = clamp(2000 + 55 × does.length, 4500, 10000)` after landing, then go on.
   - These pause it: any pointer, wheel or key in the drawing, and keyboard focus entering the caption controls (keyboard and screen-reader users then drive with Next).
   - Back and Next step once and keep the play or pause state.
5. **The end of Arriving (Pod H01).**
   - H01's curtain slides closed (`scaleX .15 → 1`, from `curtain.matrix`). By Evening its lamp glows through.
   - The caption offers "That's the way in. See Dorm H up close?" (opens the card) and the other walks.
6. **Still or reduced motion:** nothing plays by itself. Next cuts to the stop with the thread drawn to it.

### 2.8 Day and Evening: the lamps

**The toggle.** A lamp toggle in the bar: a house-lamp glyph with the visible text **Lamps on** and `aria-pressed`, pressed meaning Evening.
1. It first pre-decodes the other theme's sheets for the visible trays (`img.decode()`, raced against 400 ms).
2. It then calls `setTheme(resolved === "dark" ? "light" : "dark")` from `components/layout/theme-store.ts`. This is the site's own choice, kept in storage, with the theme cross-fade. The sheets swap through the global `.for-day` and `.for-evening` twins.

**Lamps on** (switching to Evening, or opening by Evening), with motion allowed:
- **The catch.** Up to **6** glow discs in view light with Workflow 1's catch, nearest the free area's centre first (ties by `order`), **240 ms apart** (the hero's stagger), 1600 ms each, starting 480 ms after `data-theme-fade` clears. Every other disc is simply lit.
- **The motes.** One `<Motes count={4}>` rises once from the brightest lit pendant in view on the ground floor, or the floor's wall lamp upstairs (`wall-lamp-1` or `wall-lamp-2`). It also rises once per session on the first card opened by Evening in a room with a light in view.
- Everything is at rest within 5 s.

**Lamps off (Day).** Discs sit at `--glow-strength` 0.45, as on the stages. Nothing animates on the switch.

**No loops.** No stutter in the explorer (the hero keeps its own) and no dip on arriving in a room: a light flickering while you read distracts.

### 2.9 Shadow inside

- The greeting (§2.3) and the walk captions use his bust. He points; he never carries anything and is never shown working (DESIGN §2.3). He is never drawn inside the paper world.
- **Ask Shadow about this room** (MVP) is the last action on every card: a plain `<button data-ask-shadow="Tell me about the women's bathroom.">`. `ConciergeLauncher`'s listener opens his panel, which stacks above the explorer. Closing it returns focus to this button.
- **The floating avatar** (polish): the Workflow 1 dock Shadow (`shadowDock` WebP, 49 × 72 at 1×) with its soft lamplight-orange glow, at 2.75rem. It sits bottom-right on desktop and at the end of the sheet's top row on phones. It is a `<button data-ask-shadow="…">`, its prefill following the open room. It drifts 2 px (the dock's float) only while no flight or walk runs, and it is still under Still.

### 2.10 Closing

Close with × ("Close the house"), Esc (staged, §14.4) or the browser's Back.
- **Polish:** if the source stage is on screen, the reverse lift-off (`--dur-section`). The source frame unhides in the same frame the dialog closes.
- **Otherwise** the dialog exit (opacity plus translate 0.75rem, `allow-discrete`, as `FindYourPod.module.css`).
- Focus returns to the launcher. The URL loses its explorer keys (§12.3). The page's scroll position is untouched.

---

## 3. Layout and visual treatment

**Phone, portrait (390 × 844):**

```
┌────────────────────────────────────┐
│ Walk through the house  [☾Lamps on][×]│ bar 56 px, --paper-near, card edge
│ [ House ][ 2nd ][ 1st ][ Ground ]  │ floor row 52 px (radio group)
├────────────────────────────────────┤
│   ┌2nd floor · Dorm J…┐            │ the drawing, full bleed;
│        ░pale tray░                 │ free area excludes the sheet
│   ┌1st floor · Dorm H…┐            │
│        ▒tray▒                      │
│   ┌Ground floor · café…┐           │
│        ▓tray▓ ●Shoes off here      │
│ Drawn from our walk… approximate. [+]│
│                                [−]│
│                                [⤢]│
├────────────────────────────────────┤ sheet: peek 128 px
│ ▬▬  (☺) Shall I show you round?    │ handle: tap cycles peek → half → full
│ [Arriving 5][Breakfast 3][Leaving… │ chips scroll sideways
└────────────────────────────────────┘
```

- **Card open:** the sheet is at *half* (46svh). The room is framed above it, lit, with the rest in shade and pins ① to ④. The sheet holds the card (§4.3), scrolling inside (`overscroll-behavior: contain`).
- **Walk:** the sheet is about 200 px with the caption and controls, and the camera at walk zoom above.
- **Landscape phone (844 × 390):** the rack is a left rail, the panel a right sheet at 50% width. Plates hide below 15rem of free height.

**Desktop (1440 × 900):**

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ Walk through the house                                      [☾ Lamps on]  [× Close]│
├──────────────────────────┬─────────────────────────────────────────────────┬──────┤
│ (☺) Shall I show you     │                                                 │ ⌂    │
│ round?                   │          the house, height-bound (z ≈ 0.75)     │ 2nd  │
│ Walk me through          │          trays lifted, plates on cords          │ 1st  │
│ (Arriving)(Breakfast)…   │                                                 │ Grnd │
│ Rooms                    │                                                 │      │
│  Ground floor: Terrace,… │ Drawn from our walk…            [+][−][⤢]       │      │
│  1st floor: …            │                                    (Shadow◐)    │      │
└──────────────────────────┴─────────────────────────────────────────────────┴──────┘
```

Layout switch: a panel layout at `(min-width: 56rem), (orientation: landscape) and (min-width: 40rem)`, otherwise a sheet. The whole house is height-bound on desktop and width-bound on phones, so the panel and the sheet cost the first frame almost nothing (fits measured in §0).

**Cut paper, not a map viewer:**

- **Chrome.**
  - Every control is a square paper tag with a card edge (`box-shadow: var(--edge-x) var(--edge-y) 0 var(--paper-edge)`), in the `WalkPicker` chip look.
  - The arch appears only in the launcher's tag glyph.
  - No compass, scale bar, minimap (the rack is the minimap), grid, search box, round floating buttons, blur shadows or `backdrop-filter`.
- **Plates.** The `.plate` vocabulary: solid `--paper-near`, Figtree 650, a 1 px cord and a 5 px pin. Room plates are 0.875rem, fixture tags and pins 0.8125rem; step pins are 1.375rem squares with an orange 1.5 px ring and ink numerals. **Text never sits on art.**
- **Jar orange** (DESIGN §2.2) appears only in:
  - the 2 px thread and its stop rings;
  - the step-pin rings and the Shoes-off pin's rule and ring;
  - the Stairs card's rule band (as the site's shoe rule).
  
  Nothing in the explorer is an orange fill larger than 24 × 24 px. The dorm cards' "Book a bed" is a secondary text link (owner decision, §21).
- **Light only from real fixtures** (`lightPoints()`), never the shrine. No new hues. Veils are `--paper-far` or `--night`.
- **Typography.** The dialog title is an h2 in the display face at `--step-1`. Captions are `--step--1`, `--text-soft`. Walk captions are 1.125rem.
- **Honest marks** are part of the look: "drawn as a copy" on the 2nd floor, "approximate" where the model says `confirmed: false`, and "guests say" on review facts.
- **No WovenBand inside the explorer.**

---

## 4. Data

### 4.1 Data flow

```
lib/house/house-of-jars.ts ─┐
lib/house/paper.ts ─────────┤  (stageGeometry, anchorOf, lightPoints, faceMatrix, planOverlay)
lib/house/render.ts ────────┤  (areaRects, renderPlan, LayerOptions.detail)
lib/house/rules.ts ─────────┤  (rulesAt)                      scripts/house-render.ts
lib/house/context.ts ───────┤  (areaFacts: new export)  ──▶   (npm run house:render) writes:
lib/house/rooms.ts (new) ───┤  (ROOM_CARDS)                     public/house/explorer.json
content/stay.ts, certainty ─┘  (facts, withCredit)              public/house/paper-fine-*-{day,evening}.svg
        │                                                       public/house/paper-plan-floor2-{day,evening}.svg
        └─▶ lib/house/explorer.ts: explorerData(), explorerJson(), explorerRooms()
                 └─▶ lib/concierge/knowledge.ts: "Places in the house" (server only)

client: ExplorerHost → import("./HouseExplorer") + fetch explorer.json + walks.json
        (never imports lib/house; types only from lib/explorer/types.ts)
```

`explorer.json` embeds `content/` text, as `walks.json` already embeds walk `does`. A content edit therefore needs `npm run house:render`, and a drift test fails until it is run.

### 4.2 Renders to add (`lib/house/render.ts`, `paper.ts`)

**`LayerOptions.detail?: "simple" | "full"`** (default `"simple"` for the paper outfit). Thread it to `fixtureNodes`. Line 474 becomes:

```ts
isoParts(f, paper ? { ...ctx, detail: o.detail ?? "simple", siblings } : ctx, floor.ceiling)
```

**`renderPaperLayer(layer, theme, { detail })`** and `paperLayerSrc(layer, theme, detail = "simple")`. The full detail is served as `/house/paper-fine-{floor}-{theme}.svg`. Fine layers exist for `ground` (without front pieces, as `ground`), `floor1` and `floor2` (`dim`).

**Look-fix round** (do it, then check by rasterising with sharp at 3 px per unit):
1. Pendant cords vanish at full detail in the paper pen (the café's 7 pendants float). Map the cord's class to the paper pen's inner-detail stroke (`id`, 1 px at 60%), as simple detail draws it.
2. Compare each fine floor against the simple one at 1.6 and 3 px per unit, Day and Evening, for:
   - painter's-order slips;
   - lost silhouettes;
   - ink on inner detail heavier than 1 px at 60%.

**`HOUSE_RENDERS`** adds:
- `paper-fine-{ground,floor1,floor2}-{day,evening}.svg`;
- `paper-plan-floor2-{day,evening}.svg` (`renderPlan("floor2", { outfit: "paper", theme })`, which keeps its "not yet seen" note).

`planOverlay(floor: "ground" | "floor1" | "floor2")`: the code is already generic, so only the type widens.

**Budgets (tests in `paper.test.ts`):**
- each fine layer ≤ 100 kB raw and ≤ 25 kB gz (measured 79 to 86 and 17 to 22);
- `paper-plan-floor2-*` ≤ 25 kB raw and ≤ 6 kB gz.

Fine layers carry the same invariants as the far sheets: one viewBox, no `<filter`, every counted fixture id present, deterministic, and drift-checked.

### 4.3 The 13 room cards

**Room ids are the model's area ids, and they are the `room` URL values.** House order is also the order of "Next room ›" and of the panel's room list.

| # | `room` | Floor | Title | Also opens | How it works (fixture ids → pins; text restates the model) | Good to know (source; soft facts credited) | Rules here (≤ 3) | Walk |
|---|---|---|---|---|---|---|---|---|
| 1 | `terrace` | Ground | Terrace | — | ① `bench-terrace` (+`table-terrace-1/2`) "A bench and two small tables outside the café." ② `jar-butts` "Smoke a few steps further out, by the small jar for cigarette butts." (append "where it stands is assumed" from `confirmed: false`) ③ `door-front` "In through the glass door on the left of the shopfront." | smoke route stop 1 `does` ("No smoking on the terrace or at the café's front: the smoke drifts straight inside.") | smoke-past-the-terrace, bikes | `smoke` stop 1 |
| 2 | `entrance` | Ground | Front door | — | ① `door-front` "The glass door on the left of the shopfront." | `times.frontDoorLocked` (firm): "Locked 23:30–07:00: knock on the glass and the night staff open the door." | front-door-locked, no-outside-food, no-pets | `arrival` stop 1 |
| 3 | `cafe` | Ground | Café and the bar | — | ① `counter` "The counter: the café and the front desk in one." ② `bar` + `stool-bar-1..3` "At its street end, the built-in bar, a little higher than the counter, with 3 high stools." ③ `table-*`, `chair-*`, `bench-seat`, `table-tall-*` "5 low tables with 10 chairs, the bench seat and 2 tall round tables." ④ `jar-big` "The big clay jar." | `breakfast.items` + `breakfast.hours` (firm); `building.cafeDrinks` (firm): "Coffee and tea 08:00–19:00." | eat-in-the-cafe, pack-downstairs | `breakfast` stop 3 |
| 4 | `desk` | Ground | Front desk | — | ① `counter` "Show your passport and pay the 100,000 kip deposit for your padlock and towel." (`arrival` stop 2 `does`, deposit from `policies.deposit`) ② `luggage-space` "Luggage can wait beside the desk." | `times.checkIn`/`checkInUntil`/`checkOut`; `staff.hours`, `staff.languages` (firm) | check-in-hours, passport, deposit (+ "All house rules" link: 9 apply) | `arrival` stop 2 |
| 5 | `stairs-ground` | Ground | Stairs: shoes off | — | ① `stairs-up` (its foot) "Take your shoes off at the foot of the stairs and carry them up." ② button "See the cubbies" → `landing-1` "They go in the cubbies on the 1st floor landing: every guest's, Dorm J's too." | the shoe rule and its why from `rules.house` (confirmed), under the jar-orange rule band | no-shoes-upstairs, registered-guests-upstairs | `arrival` stop 3 |
| 6 | `water` | Ground | Free water | `corridor` | ① `water-dispenser` "Free drinking water at the dispenser, at the start of the corridor, with glasses in the cupboard below." (`water` stop `does`) | — | — | `water` stop 1 |
| 7 | `toilet-ground` | Ground | Toilet | — | ① `door-toilet` "Past the stairs, through its own door." ② `toilet-ground` + `sink-toilet` "A toilet and a small sink." | "The showers are upstairs: the women's bathroom on the 1st floor, the men's on the 2nd." (model) | — | — |
| 8 | `landing-1` | 1st | 1st floor landing | — | ① `shoe-cubbies` "You arrive facing the shoe cubbies: 30, 5 across and 6 high." (counts from `grid`) ② `door-dorm-h` "Dorm H through the door at the front." ③ `door-bath-women` "The women's bathroom at the back." ④ `stairs-floor2` "The stairs carry on up to Dorm J and the men's bathroom." | — | no-shoes-upstairs, registered-guests-upstairs | `arrival` stop 4 |
| 9 | `dorm-h` | 1st | Dorm H | — | ① `door-dorm-h` "In through the door." ② `pod-H01…H07` "Up the right side to the window: H01 to H07." ③ `pod-H08…H12, H15` "Back down the left: H08 to H12, then H15." ④ `pod-H16, H17` "Across, inside the door: H16 and H17." | `beds.perBed` (firm, as a list); `beds.numbering` (firm): "No pod 4, 13 or 14, so no guest is given an unlucky bed."; "One locker per pod, with the same number: where each stack stands is approximate." (`LOCKER_NOTE`); `times.quietHours` | quiet, eat-in-the-cafe, pack-downstairs | `arrival` stop 5 |
| 10 | `bath-women` | 1st | Women's bathroom | — | ① `door-bath-women` "The door is in the front wall, by the right wall." ② `vanity-women` "The sinks are on your right: 2 basins, mirrors, a hand dryer and a hair dryer." ③ `shower-women-1/2` "Turn left into the little corridor: 2 showers on your left, each with its own heater." ④ `stall-women-1..3` "3 toilets on your right, in stalls along the back wall." | `bathrooms.hotShowers` (firm); `bathrooms.cleaning` (soft): "Cleaned several times a day, guests say."; `staff.housekeepingRound` (firm): "The team looks over the house about every hour."; "The men's bathroom is on the 2nd floor." | — (floor-wide rules shown on landings and dorms only) | `bathroom-women` stop 1 |
| 11 | `landing-2` | 2nd | 2nd floor landing | — | ① `painting-2-1/2` "Two paintings and no cubbies: your shoes stay on the 1st floor." ② `door-dorm-j` "Dorm J at the front." ③ `door-bath-men` "The men's bathroom at the back." | — | no-shoes-upstairs, registered-guests-upstairs | — |
| 12 | `dorm-j` | 2nd | Dorm J | — | as Dorm H with J numbers (pods per the model) | as Dorm H | as Dorm H | — |
| 13 | `bath-men` | 2nd | Men's bathroom | — | as the women's with `-men` ids | as the women's, with "The women's bathroom is on the 1st floor." | — | — |

- **Every 2nd-floor card** opens with "Drawn as a copy of the 1st floor: not yet photographed."
- **Staff areas** (`staff-kitchen`, `kitchen`, `store-stairs`) have no card: a tap shows a muted "Staff only" plate, and a `room=` naming one is dropped (overview). The shrine is never labelled, lit, carded or mentioned.

**Card anatomy**, top to bottom, all from `ExplorerRoom`:
1. eyebrow (the floor's name) and title (h3);
2. a one-sentence lead;
3. **the plan crop** with pins ① to ④;
4. **How it works** (`<ol>`, step buttons whose numbers match the pins);
5. **Good to know** (2 to 4 lines);
6. **Rules here** (rule plus why; at most 3, then "All house rules" → `/house-rules`);
7. **In here** (counted contents, collapsed `<details>`);
8. **Not yet confirmed** (collapsed `<details>`, from `areaFacts().assumed`);
9. actions: **Walk me there** (if `walk`), ‹ Previous room / Next room ›, **Ask Shadow about this room**, and, on dorm cards, **Book a bed** (secondary link to `pages.book.path`).

The **plan crop** is `<svg viewBox={planCrop} role="img" aria-label={steps joined}><image href={plan[theme]} …/>…pins…</svg>`, the `FindYourPod` board technique (nested `<svg viewBox><image>`). It shows both theme twins via `.for-day` and `.for-evening` on the `<image>`. The crop is the area's rects plus 0.35 m, in plan coordinates (`planOverlay(floor).areas`). The pins in the crop are `aria-hidden`; the `<ol>` carries the same words.

**Rules shown.** `cardRules(area)` is `rulesAt(model, id)` filtered: keep a rule if it names the area, its parent or a fixture in it. Keep a rule that matches **only by floor** on `landing-*` and `dorm-*` cards. The order is content's, capped at 3, with `moreRules` set when cut.

### 4.4 `lib/house/rooms.ts` (new, server only)

```ts
export interface RoomCardSpec {
  readonly id: GuestRoomId;                 // area id
  readonly title?: string;                  // default area.name ("Café and the bar" overrides "Café")
  readonly opens?: readonly string[];       // sub-areas that resolve here ("corridor" → water)
  readonly lead: () => string;              // one sentence; also Shadow's knowledge line for the room
  readonly steps: readonly { readonly fixtures: readonly string[]; readonly text: () => string; readonly link?: GuestRoomId }[];
  readonly facts: readonly { readonly fact: Fact<unknown>; readonly line: () => string }[]; // withCredit() applied by explorer.ts
  readonly walk?: { readonly route: string; readonly stop: number };    // 1-based
  readonly ask: string;                     // Ask Shadow prefill
  readonly book?: true;
}
export const ROOM_CARDS: readonly RoomCardSpec[];   // the 13, in house order
export const STAFF_AREAS: readonly string[] = ["staff-kitchen", "kitchen", "store-stairs"];
```

- **Text is functions,** so counts and times are read from the model and `content/stay` at build time and never typed. Write "2 showers", not "two showers", where the number is a model count. This keeps the count test simple.
- **The rule for each step:** every fixture exists, is on the card's floor, and its box lies within **1.0 m** (plan distance) of the card's area rects, or of the rects of an area the card `opens`.
- **No new claims.** Step text may only restate the model: notes, walk `does`, the owner's facts of 7 October 2026 and `content/`. The test (§17.1) checks counts, and a reviewer checks the wording against `docs/house-context.md`.

### 4.5 `lib/house/context.ts`

Export `areaFacts(model, areaId): { contents: string; items: { name: string; n: number; labels: string[] }[]; assumed: string[] }`. This is today's private `counted()`, `contents()` and `assumed()`. `describeHouse()` uses it, so the cards and `docs/house-context.md` cannot disagree.

Cards filter `items` through a guest allowlist that drops `ceiling-light`, `track-light`, `fuse-box`, `dehumidifier`, `extinguisher`, `printer`, `shrine`, `ac-outdoor` and `fan-exhaust`. Pods and lockers keep their ranges: "14 pods (H01 to H17, with no H04, H13 or H14)".

### 4.6 `public/house/explorer.json` (generated by `explorerJson()`)

Coordinates are stage viewBox units. **Anything that lives inside a tray is *stacked*** (the tray lifts it), as `anchorOf` gives. **Camera boxes are in the *rest pose*** (lifted by 90 × level). The client derives screen positions with `lifted(p, floor) = [p[0], p[1] − 90 × level]`.

```ts
// lib/explorer/types.ts (type-only; imported by lib/house/explorer.ts and the client)
type Pt = readonly [number, number];
type Rect = readonly [number, number, number, number];          // x, y, w, h
type Poly = readonly number[];                                   // x0,y0,x1,y1,… (closed)
type Matrix = readonly [number, number, number, number, number, number];
type FloorId = "ground" | "floor1" | "floor2";

export interface ExplorerData {
  v: 1;
  viewBox: Rect;                      // [-605, -557, 758, 991]
  lift: 90;
  floors: ExplorerFloor[];            // ground, floor1, floor2
  front: { day: string; evening: string };              // paper-ground-front-*
  rooms: ExplorerRoom[];              // the 13, house order
  staff: { id: string; floor: FloorId; hulls: Poly[]; anchor: Pt }[];
  aliases: Record<string, string>;    // { corridor: "water" }
  tags: ExplorerTag[];                // fixture-group and number plates
  pods: ExplorerPod[];                // 28, for the pod picker and number plates
  lights: { id: string; floor: FloorId; x: number; y: number; r: number; kind: string; order: number }[]; // lightPoints()
  shoes: Pt;                          // anchorOf("area-stairs-ground"), stacked
  curtain: { pod: "pod-H01"; floor: "floor1"; matrix: Matrix }; // faceMatrix("pod-H01", "right")
  walks: { id: string; label: string; when?: string; place?: string; spine: boolean }[]; // from components/stage/walks.ts order
  captions: { house: string; floor2: string };
}
export interface ExplorerFloor {
  id: FloorId; name: string; level: 0 | 1 | 2; confirmed: boolean;
  crop: Rect;                         // stageGeometry().crop([id]): rest pose, camera fit
  hull: Poly;                         // tray silhouette (convex hull of slab + walls to 2.2 m), stacked: topmost-tray test
  footprint: string;                  // slab polygon "M…Z", stacked: tray shadow
  say: string;                        // live-region and aria-describedby line
  sheets: { day: string; evening: string; fineDay: string; fineEvening: string };
  plan: { day: string; evening: string; viewBox: Rect };
}
export interface ExplorerRoom {
  id: string; floor: FloorId; name: string; eyebrow: string;
  opens: string[];
  anchor: Pt;                         // anchorOf(`area-${id}`), stacked: the room plate's pin
  hulls: Poly[];                      // one hexagon per area rect (+ opened rects): its prism z 0–2.2 m, stacked
  box: Rect;                          // bbox of hulls, rest pose: camera framing
  planCrop: Rect;                     // plan coordinates
  lead: string;
  steps: { n: number; text: string; at: Pt; plan: Pt; box: Rect; link?: string }[]; // at stacked; box rest pose
  facts: string[];                    // credited
  rules: { rule: string; why: string }[];
  moreRules: boolean;
  items: string[];
  assumed: string[];
  walk?: { route: string; stop: number };
  note?: string;                      // 2nd-floor caveat
  ask: string;
  book?: true;
}
export interface ExplorerTag { floor: FloorId; room: string; at: Pt; text: string; tier: "room" | "near"; confirmed: boolean }
export interface ExplorerPod { label: string; room: "dorm-h" | "dorm-j"; tier: "upper" | "lower"; at: Pt; face: Matrix; plan: Rect }
```

- **Fixture-group tags** (`tier: "room"`), generated from model counts:
  - bathrooms: "2 sinks", "2 showers", "3 toilets";
  - café: "Built-in bar · 3 stools", "Big clay jar", "Drinks fridge";
  - desk: "Luggage waits here";
  - landing 1: "Shoe cubbies · 30";
  - landing 2: "Two paintings";
  - water: "Free water";
  - toilet: "Toilet".
- **Number tags** (`tier: "near"`): one per pod stack, "H01 · top / H02", the tier from each pod's `variant`. One per locker stack, "Lockers H15–H17" with `confirmed: false`, shown as "approx.".
- **Budget:** ≤ 32 kB raw and ≤ 9 kB gz (estimated 24 / 7). The JSON is deterministic and written by `npm run house:render`.

---

## 5. Files

### 5.1 New: server and scripts (never imported into a `"use client"` file)

| File | Exports |
|---|---|
| `lib/house/rooms.ts` | `ROOM_CARDS`, `STAFF_AREAS`, `RoomCardSpec` (§4.4) |
| `lib/house/explorer.ts` | `explorerData(): ExplorerData`, `explorerJson(): string`, `explorerRooms(): readonly { id; floor; name; lead; walk? }[]` (for Shadow), and internal helpers `prismHulls(area)`, `planCrop(area)`, `trayFootprint(floor)`, `trayHull(floor)`, `cardRules(area)`, `fixtureTags(floor)` |
| `components/stage/walks.ts` | `WALKS` (moved from `HouseStage.tsx`) with `spine` flags; `STOP_GLOWS` (moved from `PaperStage.tsx`) |

### 5.2 New: client

| File | Kind | What |
|---|---|---|
| `lib/explorer/types.ts` | types | §4.6 |
| `lib/explorer/url.ts` | pure, client-safe | `EXPLORER_KEYS`, `parseExplorerParams(search, rooms?)`, `explorerHref(target)`, `explorerTarget(href, origin)`, `ROOM_NAMES` (id → title, tested against the JSON), `POD_PATTERN`, `WALK_IDS` |
| `lib/explorer/state.ts` | pure | `ExplorerState`, `ExplorerAction`, `explorerReducer(state, action, data)`, `targetOf(state, data): CameraTarget`, `poseOf(state)`, `trayStates(pose)` |
| `lib/explorer/camera.ts` | pure | `Camera`, `Free`, `fit`, `zoomAt`, `clampCamera`, `rubber`, `coastStep`, `springStep`, `flight`, `zLimits`, `worldTransform`, `worldToScreen`, `screenToWorld`, `easeInOut` (§6) |
| `lib/explorer/pick.ts` | pure | `pickRoom(data, pose, world: Pt): { kind: "room" \| "staff"; id } \| null` (§9) |
| `lib/explorer/lod.ts` | pure | `tierOf(ppm, pose, cardOpen, dorm)`, `placeLabels(rects, priorities)` (§8) |
| `lib/explorer/walk.ts` | pure | `legPlan(walk, from, to)` (per-floor dash spans, the link slice, bead spans), `dwellMs(text)`, `walkPose(route, stops)` |
| `lib/stage/thread.ts` | pure | `caseThread(svg)`, `dressCurtain(svg)` (dedupes `PaperStage` and `WalkPicker`) |
| `components/explorer/ExplorerHost.tsx` | client, page bundle, ≤ 1.5 kB gz | Delegated listeners, prefetch, the URL on mount and `popstate`, open and close, the portal |
| `components/explorer/ExploreLink.tsx` | server | `<a data-explore href>` in `"tag"`, `"button"` and `"link"` variants, with the corner-ticks glyph (no JS) |
| `components/explorer/HouseExplorer.tsx` + `.module.css` | lazy chunk | Dialog shell, reducer, effects wiring the engine |
| `components/explorer/engine.ts` | lazy chunk, DOM | `createCameraEngine(view, world, opts)` → `{ flyTo, cut, panBy, zoomBy, setFree, current, onSettle, destroy }`; `attachGestures(view, engine, { onTap, onInteract })` |
| `components/explorer/ExplorerWorld.tsx` | lazy | Trays, sheets (simple and fine twins), overlays (lights, thread, beads, rings, curtain, spotlight, tray shadow) |
| `components/explorer/ExplorerLabels.tsx` | lazy | The screen-space plate layer and motes |
| `components/explorer/FloorRack.tsx` | lazy | The radio group |
| `components/explorer/ExplorerPanel.tsx` | lazy | Greeting, rooms, walks; sheet snapping |
| `components/explorer/RoomCard.tsx` | lazy, pure render | `RoomCard({ room, theme, onStep, onWalk, onPrev, onNext })` |
| `components/explorer/WalkCaption.tsx` | lazy | Caption and controls |

### 5.3 Changed

| File | Change |
|---|---|
| `lib/house/render.ts` | `LayerOptions.detail`; the pendant cord at full paper detail; `HOUSE_RENDERS` entries |
| `lib/house/paper.ts` | `renderPaperLayer(…, { detail })`, `paperLayerSrc(…, detail)`, `planOverlay` floor2 |
| `lib/house/context.ts` | `areaFacts()` export, used by `describeHouse()` |
| `scripts/house-render.ts` | Writes `explorer.json` |
| `content/certainty.ts` | `withCredit(fact, line)` (moved from `said()` in `lib/concierge/knowledge.ts`) |
| `lib/stage/acts.ts` | `captionText`, `readFor` (moved from `scripts/film.ts`, which imports them) |
| `components/stage/StageArt.tsx` | `data-world` on `.world`; `action?: ReactNode` rendered in `.frame` |
| `components/stage/PaperStage.tsx` (+`.module.css`) | `action` pass-through; `.action` corner slot; `[data-explorer-away] .frame { visibility: hidden }`; `caseThread` and `dressCurtain` from `lib/stage/thread.ts` |
| `components/stage/WalkPicker.tsx` | `caseThread` from `lib/stage/thread.ts` |
| `components/house/HouseStage.tsx` | `action` tag; `WALKS` from `components/stage/walks.ts` |
| `components/home/HouseTheatre.tsx`, `TheatreWords.tsx` | Tag action; a third closing link that is an `ExploreLink variant="link"` |
| `app/page.tsx`, `app/the-house/page.tsx` | Mount `<ExplorerHost />`; on `/the-house`, the h2-side button and the Seen-in links' `href` and `data-explore` |
| `components/concierge/ConciergePanel.tsx` (+`.module.css`) | Explorer links render as chips (§13.3) |
| `lib/concierge/knowledge.ts`, `prompt.ts` | §13 |
| `components/art/glow.module.css` | Catch keyframes and `[data-catch]` (§11.1) |
| `scripts/smoke.ts` | §17.2 |
| `docs/DESIGN.md`, `docs/HOUSE_MODEL.md` | §18 |

---

## 6. The camera

All in `lib/explorer/camera.ts`, pure and unit-tested. The DOM side is in `components/explorer/engine.ts`.

### 6.1 State and mapping

`Camera = { z, cx, cy }`:
- `z` is CSS px per stage unit (`ppm = 36 × z`);
- `(cx, cy)` is the rest-pose stage point at the centre `F = (Fx, Fy)` of the **free area**.

The free area is the drawing region minus the chrome over it:
- phone: the sheet at its current snap, inset 16 px;
- desktop: the rack's 56 px on the right, inset 32 px.

It is measured by one `ResizeObserver` on the drawing region and the sheet, never in the frame loop.

```
screen(p) = F + (p − c) · z            world(s) = c + (s − F) / z
```

When the free area changes (a sheet snap, a resize), keep the picture still: `c ← c + (F' − F) / z`. Then, if the target is a room, step or stop, re-fit with a 520 ms flight (a cut under Still).

### 6.2 The one transform

`.world` is laid out at the **baked zoom** `zb`: `width: calc(var(--zb) * 758px); height: calc(var(--zb) * 991px)`, with `left: 0; top: 0` in the drawing region and `transform-origin: 0 0`.

```
transform = translate3d(Fx − (cx − vx)·z px, Fy − (cy − vy)·z px, 0) scale(z / zb)
```

Check: a point lays out at `(p − v)·zb`. Scaled, that is `(p − v)·z`; translated, `F + (p − c)·z` ✓.

Everything inside the world is positioned **in percentages** of it:
- trays at `inset: 0`;
- images at 100%;
- discs at `--x` / `--y` / `--r` in %;
- overlay SVGs in the viewBox.

Changing `--zb` therefore moves nothing on screen and starts no transition.

### 6.3 Zoom about a point, and fit

```
zoomAt(cam, s, k):  z' = clampZ(z·k);  c' = c + (s − F)·(1/z − 1/z')      // the point under the fingers stays put
fit(rect, free, margin): z = min(free.w / (rect.w·(1+2m)), free.h / (rect.h·(1+2m)));  c = centre(rect)
```

Margins:
- house: 0.02;
- floor: 0.04;
- room: 0.12;
- a step's box: 0.25.

### 6.4 Clamp

Bounds are the union of the visible trays' crops in their current pose (rest pose for `focus` and `rest`). Per axis, with `half = free.w / (2z)`:
- if `bounds.w · z ≤ free.w`, then `cx = centre`;
- else `cx ∈ [x0 + half − slack, x1 − half + slack]` with `slack = 0.2 · free.w / z`. Likewise for y.

`clampCamera` is idempotent.

### 6.5 Flights (van Wijk and Nuij, ρ = 1.4)

Work in `(ux, uy, w)` with `w = free.w / z`.

```
d² = (ux1−ux0)² + (uy1−uy0)²
if d < 1e-6:  S = |ln(w1/w0)| / ρ;  at(t): k = exp(sign·ρ·t·S) → (ux0+t·dx, uy0+t·dy, w0·k)
else:  d1 = √d²
       b0 = (w1² − w0² + ρ⁴d²) / (2·w0·ρ²·d1);   b1 = (w1² − w0² − ρ⁴d²) / (2·w1·ρ²·d1)
       r0 = ln(√(b0²+1) − b0);                    r1 = ln(√(b1²+1) − b1);    S = (r1 − r0) / ρ
       at(t): s = t·S;  u = w0/(ρ²·d1)·(cosh r0 · tanh(ρs + r0) − sinh r0)
              → (ux0 + u·dx, uy0 + u·dy, w0·cosh r0 / cosh(ρs + r0))
duration = clamp(S × 560 ms, --dur-ui (520), --dur-scene (1440))
```

- **Time** is eased with `easeInOut`, a JS cubic-bezier solver for `--ease-in-out (.65, 0, .35, 1)`, whose control points are read from the CSS token once on open.
- **Long hops** rise a little and settle, like a hand lifting and setting down. Short ones don't.
- **Any** `pointerdown`, `wheel` or `keydown` in the drawing cancels the flight where it is.
- **Still or reduced motion:** `cut(target)` and then bake.

### 6.6 Zoom limits and the bake cap

```
MAX_BAKE_PX = 8192                                   // longest side of the baked world, in device px (WP0 may set 6144 on iOS)
zbMax = min(6, MAX_BAKE_PX / (devicePixelRatio × 991))   // 2.76 at DPR 3, 4.13 at DPR 2, 6 at DPR 1
zMax  = 1.25 × zbMax                                  // a little over-zoom, softened, then springs back to zbMax
zMin  = 0.9 × fit(house)                              // below it, it rubber-bands and springs back to fit
```

Room framing uses `min(fit(room.box), zbMax)`. On phones every room fits under the cap; on DPR 2 desktops the entrance and the water corner show a little context.

### 6.7 Rubber band and inertia

- **Rubber band** (a drag past the clamp): `shown = L·(1 − 1/(d·0.55/L + 1))`, with `L = 0.25 ×` the free dimension in px.
- **Zoom past its limits:** the same in `log z`, coefficient 0.35.
- **Inertia** (Full motion only):
  - velocity is `Σ Δp / Σ Δt` over the pointer samples of the last 80 ms;
  - on release with `|v| > 0.05 px/ms`, coast: `p(t) = p0 + v·τ·(1 − e^(−t/τ))`, τ = 325 ms;
  - it stops at `|v| < 0.01 px/ms` or after 1200 ms;
  - if the coast's end `p0 + v·τ` is past the clamp, it hands over to a **critically damped spring** (no overshoot): `x(t) = T + (x0 − T + (v0 + ω(x0 − T))·t)·e^(−ωt)`, ω = 14 s⁻¹, about 400 ms.
  - Under Still, release stops dead and an out-of-bounds camera snaps.

### 6.8 Bake on settle (crisp at any size)

The camera is settled when there is no pointer down, no flight, no coast and no wheel event for 160 ms, and `|z/zb − 1| > 0.02`. Then:
1. Write `--zb = min(z, zbMax)`: one layout of `.world`, and the `<img>` SVGs re-raster at their new size × DPR.
2. Write `transform` with `scale(z / zb)` (1 below the cap).
3. Set `data-tier`, and `data-z` (for tests) on the dialog.
4. On the next frame, run the label collision pass (§8) and fade the winners in.

**Pre-bake** before a zoom-in flight: `zb = min(max(z_from, z_to), zbMax)`, so a flight only ever downscales a crisp raster. It re-bakes on landing if needed.

`.world` keeps `will-change: transform` while the explorer is open (one layer), so pans never re-raster; only bakes do. A bake may take one long frame (≤ 50 ms on the throttled profile) because it happens only at rest.

---

## 7. Input

### 7.1 Pointer (`attachGestures`)

- Up to two pointers, with `setPointerCapture`. `pointermove` only stores the latest positions; one `requestAnimationFrame` applies them.
- **Pan** uses the centroid's delta.
- **Pinch** uses `k = dist / distPrev` about the midpoint, then pans by the midpoint's movement. Going from two pointers to one re-bases without a jump.
- `.view` has `touch-action: none`. Listeners are non-passive on `.view` only.

### 7.2 Labels while moving

Screen-space plates follow every frame (§8): at most 24 transform writes, for plates within 64 px of the screen. During a pinch, plates for the next tier don't appear until the bake.

### 7.3 Wheel and trackpad

- **MVP:** wheel → zoom about the cursor. `k = exp(−deltaY × 0.0018)`, or `× 0.05` per line when `deltaMode === 1`. Each event is clamped to [0.8, 1.25], accumulated per frame. Ctrl+wheel behaves the same, so a trackpad pinch never zooms the page.
- **Polish (trackpad pan):** `deltaMode === 0`, no `ctrlKey`, and either `deltaX ≠ 0` or a non-integer `deltaY` → pan by `(deltaX, deltaY)`. Otherwise zoom.
- Safari's `gesturestart`, `gesturechange` and `gestureend` → `preventDefault`, and zoom by `e.scale` ratios about the cursor (MVP).

### 7.4 Keyboard

The keyboard is active while the drawing (`.view`, `tabindex="0"`) has focus, which meets WCAG 2.1.4 for single-key shortcuts.

| Key | Action |
|---|---|
| ← ↑ → ↓ | Pan 12% of the free area (Shift: 40%): a 520 ms flight, or a cut |
| `+` `=` / `−` `_` | Zoom ×1.5 about the centre |
| `0` | Fit the current target (floor or house) |
| Home | Whole house |
| Page Up / Page Down | Floor up / down |
| Enter / Space | Open the card of the guest room under the centre point (`pickRoom` at `c`) |
| Esc (anywhere in the dialog) | Staged close (§14.4) |

When focus is in the walk controls, ← and → also step back and next.

---

## 8. Labels and zoom tiers

**Tiers** are set at settle, with ±10% hysteresis:

```
ppm = 36 × z
tierOf: byPpm = ppm < 22 ? "house" : ppm < 40 ? "floor" : ppm < 80 ? "room" : "near"
        tier  = max(byPpm, pose is focus ? "floor" : "house", cardOpen ? "room" : "house",
                    cardOpen && dorm && ppm ≥ 55 ? "near" : "house")
```

| Tier | Plates shown |
|---|---|
| `house` | Floor plates (3), the Shoes-off pin |
| `floor` | The focused floor's room plates (and muted "Staff only" plates), the Shoes-off pin |
| `room` | + fixture-group tags for rooms in view; step pins while a card is open. **The fine layer** of the focused floor is wanted. |
| `near` | + pod-stack and locker-stack number plates (polish, with the pod picker) |

**Placement.** `screen(lifted(anchor, floor))`, transformed per frame with `translate3d`, never `left` or `top`, and never scaled.
- Plates belong to a floor. Only floors in `rest` or `focus` show theirs, because a moving tray's plates are hidden (fade 200 ms) for the length of its transition.
- **Collisions** are resolved at settle only, greedy in priority order: Shoes off > step pins > room plates > fixture tags > number plates > floor plates. Losers fade out over 200 ms. Plate sizes are measured once after `document.fonts.ready`, and again on a tier change.
- **Plates are pointer conveniences:** `aria-hidden="true"`, `tabindex="-1"`, and a ≥ 44 × 44 px hit area via `::after`. The keyboard and screen-reader path is the panel's room list and the drawing's Enter (§14).

---

## 9. Picking

`pickRoom(data, pose, w)` is O(rooms) point-in-polygon, run once per tap and never on move:

1. **Which tray?** Test visible trays top-most first. Un-lift: `ws = [w.x, w.y + 90 × level]` (for a sunk `below` tray, + 40 more). If `ws` is inside the tray's `hull`, it is that tray; otherwise try the next one down.
2. **Which room on that tray?** Collect the rooms (and staff areas) with any hull containing `ws`. Sub-area hulls come before parents (desk and entrance before café; water before corridor).
3. **Several candidates:** take the **frontmost**: the larger `u + v` at the area's plan centre (`u = x`, `v = 16 − y`). In painter's order it is drawn later, so in front. Everything in a room stands ≤ 2.2 m, so the frontmost prism is what the guest sees there.
4. **None:** invert the projection at the floor plane as a fallback.
   - `p = X / (cos30·36)`, `q = (Ys + z_floor·36) / (sin30·36)`;
   - `u = (p + q)/2`, `v = (q − p)/2`, giving model `(x = u, y = 16 − v)`;
   - test the area rects.
5. Resolve `aliases` (`corridor → water`). A staff hit returns `{ kind: "staff" }`.

Test: every room's `anchor` at z = 0 picks its own card.

---

## 10. Poses and trays

Each tray (`ground`, `floor1`, `floor2`, `ground-front`) moves only through the individual properties `translate` (in percent of its own box: `translate: 0 calc(var(--k) * -9.0817%)`) and `opacity`. The transition is `translate var(--dur-section) var(--ease-in-out), opacity var(--dur-section) var(--ease-out), visibility var(--dur-section) allow-discrete`. Under Still and reduced motion it is cut.

| `data-tray` | `--k` | opacity | Notes |
|---|---|---|---|
| `rest` | level | 1 | The theatre's pose; `walks.json`'s stair links line up |
| `focus` | level | 1 | `z-index: 3` |
| `below` | level − 0.45 | 0.4 | Sinks 40 units; only the floor directly below the focus |
| `aside` | level + 3 | 0 | Then `visibility: hidden` (stops rastering) |
| `hidden` | level | 0 | Then `visibility: hidden` (floors two or more below) |
| `dim` | level | 0.4 | At rest lift, faded (a floor below a walk that does not visit it) |

| Pose | ground | floor1 | floor2 | ground-front |
|---|---|---|---|---|
| `overview` | rest | rest | rest | rest, above floors 1–2 (as `PAPER_LAYERS`) |
| `focus(ground)` | focus | aside | aside | with ground, above it; 0.25 while a ground card is open |
| `focus(floor1)` | below | focus | aside | follows ground (below), under floor1 |
| `focus(floor2)` | hidden | below | focus | hidden |
| `walk(route)` | `rest` if the walk visits it; `aside` if above the highest floor it visits; `dim` if below the lowest | ″ | ″ | follows ground |

Walk poses today:
- arrival, breakfast, leaving early: ground and floor1 `rest`, floor2 `aside`;
- smoke, water: ground `rest`, floor1 and floor2 `aside`;
- women's bathroom: ground `dim`, floor1 `rest`, floor2 `aside`.

This gives at most 3 rastered layers (DESIGN §9) in any focus pose, and 4 in overview, as on `/the-house` today.

---

## 11. Light, thread, spotlight, tray shadow

### 11.1 Lamps

Discs are `i.glow` from `glow.module.css`, placed at `--x`, `--y` and `--r` in % (`StageLights` data), inside their tray, so they scale with the drawing as light pools should. The pod's lamp is a `glow.disc` at H01's face, lit by Evening only (as `PaperStage`'s `.podLamp`).

**Shared catch** (add to `components/art/glow.module.css`):

```css
/* The explorer's Lamps on: Workflow 1's bulb catch (HouseLamp.module.css lamp-halo-*), on a disc. */
@media (prefers-reduced-motion: no-preference) {
  :global(:root:not([data-motion="still"])) :global([data-lamps="catch"]) .glow[data-catch]::before {
    animation: lights-catch-day 1600ms var(--ease-sway) calc(var(--i, 0) * 240ms) both;
  }
  :global(:root[data-theme="dark"]:not([data-motion="still"])) :global([data-lamps="catch"]) .glow[data-catch]::before {
    animation-name: lights-catch-evening;
  }
}
/* + the prefers-color-scheme twin, and the existing data-theme-fade pause, as for lights-on */
@keyframes lights-catch-day     { from { opacity: 0; scale: .9 } 10% { opacity: .7 } 18% { opacity: .4 } 30% { opacity: .9 } 38% { opacity: .72 } 56% { opacity: 1 } 70% { scale: 1.03 } }
@keyframes lights-catch-evening { /* identical stops */ }
```

The explorer sets `data-catch` and `--i` (0 to 5) on the chosen discs, then `data-lamps="catch"` on the world. It removes `data-lamps` after 3.6 s, so a later reflow never replays the catch.

A test in `components/art/lamplighting.test.ts` (Workflow 1's file) asserts that `lights-catch-*` has exactly the stops of `lamp-halo-*`.

### 11.2 Thread, bead, rings, curtain

**Thread markup.** Each floor's walk thread comes from `walks.json` through `caseThread()`. It sits in an `<svg>` in the viewBox inside its tray: `.thc` casing plus `.th` thread, `pathLength=1`, styled as on the stages.

**The stair link** comes from `walks.json`'s `link`, valid because walk pose rests visited floors at their lift.

**`legPlan(walk, atFrom, atTo)`** returns:
- for each floor path with share `[a, b]` overlapping `[atFrom, atTo]`, a slice of the leg's time proportional to its length, plus `dashFrom` and `dashTo`, with `dash(at) = 1 − clamp((at − a)/(b − a), 0, 1)`;
- the link slice: the middle 25% of the leg when it changes floor;
- bead spans: `offset-distance` from `(atFrom − a)/(b − a)` to `(atTo − a)/(b − a)` (× 100%) on each floor's own `offset-path`, inside `@supports (offset-path: path("M0 0h1"))`.

**Animating it.** Web Animations, with delays and durations taken from the leg's flight duration and the same easing curve. An interrupt calls `finish()` on them, so the thread is drawn to the stop. While a walk runs, `[data-thread]` and the bead svg have `will-change: transform`, so dash repaints never re-raster the trays.

**Rings** are HTML spans (12 px, jar-orange 2.5 px ring), settling `scale .6 → 1` over `--dur-hinge` on arrival. **Stop glows** come from `STOP_GLOWS`.

**The curtain** is `dressCurtain` markup on a unit rect with `transform="matrix(curtain.matrix)"` in floor 1's overlay. It closes with `scaleX .15 → 1` (`transform-box: fill-box; transform-origin: 0 50%`).

### 11.3 Spotlight

One inline `<svg>` in the focused tray, in the viewBox:

```html
<svg class="spot" viewBox="-605 -557 758 991" aria-hidden="true">
  <mask id="x-spot"><rect x="-605" y="-557" width="758" height="991" fill="#fff"/><path fill="#000" d="{room.hulls as M…Z}"/></mask>
  <path d="{floor.hull}" mask="url(#x-spot)" fill="var(--veil)"/>
</svg>
```

- `--veil` is `--paper-far` at 55% by Day and `--night` at 55% by Evening.
- A mask is used because the room's per-rect hexagons overlap, and `evenodd` would re-fill the overlaps.
- **Only its opacity animates** (`--dur-hinge`).
- **Polish:** a running-stitch outline of the room's floor polygon at z = 0 (a rectilinear union of its rects, computed in `explorer.ts`), in `--thread`, 2.5 px, `stroke-dasharray: 3 2`, drawn on once.

### 11.4 Tray shadow (polish)

`<svg class="shadow">` in each tray, under its sheets: the floor's `footprint` offset (6, 10) units. It is filled `--paper-edge` at 45% by Day and `--night` at 55% by Evening. It is hidden in `rest` and `overview` (the slabs already carry card edges) and fades in on `focus` and `below`, so separated trays cast hard cut-paper shadows. Offsets, never blurs.

Layer images in the explorer **do not** carry `PaperStage`'s CSS `drop-shadow`: a filter on a large composited layer costs every frame.

---

## 12. The URL contract

### 12.1 Keys

| Key | Values | Meaning |
|---|---|---|
| `explore` | flag | Open, whole house |
| `floor` | `ground`, `floor1`, `floor2` | Open on that floor |
| `room` | the 13 card ids, plus aliases (`corridor`) | Open its card (implies its floor) |
| `pod` | `/^(H\|J)(0[1-9]\|1[0-7])$/` excluding 04, 13 and 14 | Open the dorm card with that pod picked (polish; MVP opens the dorm card) |
| `walk` | `arrival`, `breakfast`, `leaving-early`, `smoke`, `water`, `bathroom-women` | Start the walk |
| `stop` | 1 … n (with `walk`), clamped | Start at that stop |

- The explorer opens when **any** key is present.
- **Precedence:** `walk` (+`stop`) > `pod` > `room` > `floor` > `explore`.
- Unknown values are dropped silently. A staff area falls back to the overview.
- **Canonical writer** `explorerHref(t)`, with keys in that fixed order and nothing else. Examples:
  - `/the-house?room=bath-women`
  - `/the-house?pod=H07`
  - `/the-house?walk=arrival&stop=3`
  - `/the-house?floor=floor1`
  - `/the-house?explore`

  Every link the site or Shadow writes points to `/the-house`.
- **The camera is never written.** The URL is semantic: links stay clean and survive layout changes.

### 12.2 In place

On a host page the explorer writes its keys to the current path: `/?room=…` on home, whose canonical tag stays `/`. It keeps `location.hash` and any unrelated parameters (none today).

### 12.3 History

- **A user opening it** pushes one entry (`pushState`), so Back closes it.
- **Room, floor, pod and walk-stop changes** call `replaceState`, debounced 300 ms after settle.
- **Closing from the UI:** `history.back()` if the explorer pushed. Otherwise (opened from a loaded deep link) `replaceState` to the path without explorer keys.
- **`popstate`:** apply the URL (open, update or close) with no further history operation. A flag prevents `close → back → popstate → close` loops.
- **On mount**, the host reads `location.search` in a `useEffect`. This covers direct loads and soft navigations from other pages, because Next updates the URL in its insertion effect before page effects run. No `useSearchParams`, so no Suspense bailout.

### 12.4 Guarding the page transition

Next applies `pushState` and `replaceState` through `ACTION_RESTORE` inside `startTransition`, and the layout's `<ViewTransition default: "auto">` animates any transition that mutates its subtree.
- Nothing on home or `/the-house` reads search params, so no mutation is expected.
- **Defence anyway:** `ExplorerHost` renders its subtree inside `<ViewTransition default="none">` (as `Section.tsx` does for its morph).
- **Smoke check:** after a floor change and a room change, no running animation targets a `::view-transition` pseudo-element (§17.2).

---

## 13. Shadow

### 13.1 Knowledge (`lib/concierge/knowledge.ts`)

A new section, built from `explorerRooms()`. It is deterministic and inside the cached block, so the prompt stays byte-identical per `siteUrl`:

```
## Places in the house, and the link that shows each one in the drawing of the house
- Women's bathroom (1st floor): The women's bathroom is on the 1st floor, past the stairs: its door is by the right wall. The sinks are on your right; turn left for the showers and the toilets. Show it: https://…/the-house?room=bath-women
- … (all 13, each with its card's lead)
- A guest's own pod: https://…/the-house?pod=H07 (H or J and two digits; there is no 04, 13 or 14)
- The way in from the street, stop by stop: https://…/the-house?walk=arrival
- Breakfast: https://…/the-house?walk=breakfast · Leaving early: https://…/the-house?walk=leaving-early
```

About 700 tokens (test: ≤ 3.5 kB). It also gives Shadow the place facts he lacks today. `said()` moves to `content/certainty.ts` as `withCredit()`.

### 13.2 Prompt (`lib/concierge/prompt.ts`, under "How to answer")

"When a guest asks where something is in the house or what a place looks like (a bathroom, the showers, the shoe cubbies, their pod, the front desk, breakfast), answer in a sentence first, then give that place's link from 'Places in the house': the chat shows it as a Show me button. At most two such links, and only when the question is about a place."

### 13.3 Chips (`ConciergePanel` `Message`)

A `linkify` part with `part.internal && explorerTarget(part.href)` renders as:

```tsx
<Link href={part.href} onClick={onNavigate} data-explore className={styles.showMe}>Show me: {label}</Link>
```

`label` is `ROOM_NAMES[room]`, "your pod, H07", or the walk's name. It is a paper chip with the corner-ticks glyph.

- **On a host page,** `ExplorerHost`'s **capture-phase `window` click listener** intercepts it (any `a[data-explore]`, or any same-origin `a` whose URL parses as an explorer target; button 0, no modifier keys). It calls `preventDefault()`, so Next's `Link` sees `e.defaultPrevented` and does not navigate. Its `onClick` still runs `onNavigate`, closing the chat.
- **Focus.** When the click comes from inside another open dialog, the host opens (or flies) on the next animation frame, after the chat has closed. Focus then lands in the explorer, not on the inert dock.
- **On any other page** the `Link` navigates to `/the-house?room=…` and the host opens it on mount.
- If the explorer is already open (Shadow asked from inside it), it flies to the target.
- **No new tool and no protocol change.** Shadow keeps `prepare_inquiry` (plus `check_availability` with online booking).

---

## 14. Accessibility

### 14.1 The dialog

`<dialog aria-labelledby="x-title" aria-describedby="x-say">`, h2 **"Walk through the house"**, opened with `showModal()`. The rest of the page is inert, and the page keeps its one h1.

Initial focus goes to the panel's h3 ("Shall I show you round?"). On a `room` or `pod` link it goes to the card's h3; on a `walk` link, to the caption's h3. All of these take `tabindex="-1"`. On close, focus returns to the launcher (native).

### 14.2 DOM and tab order

1. **The bar:** the title; **Lamps on** (`aria-pressed`); Close ("Close the house").
2. **The floor rack:** `fieldset` and `legend` "Floor" with native radios, one tab stop, arrow keys inside.
3. **The panel or sheet:** greeting, walk chips (a radio group), the room list (buttons grouped by floor); **or** the card; **or** the walk caption and controls. On phones the sheet is drawn at the bottom but stays third in the DOM, so guidance comes before the drawing.
4. **The drawing:** `div.view[role=group][aria-roledescription="drawing"][tabindex=0]`, with the label "The house drawn in paper, {floor or 'whole house'}" and `aria-describedby="x-keys x-say"`. It has a visible focus ring. `x-keys` is a visually hidden list of the keys (§7.4).
5. **Zoom controls:** "Zoom in", "Zoom out", "Fit to view".
6. **The floating Ask Shadow button** (polish).

### 14.3 Live region and equivalents

**One live region,** `p[role=status][aria-live=polite][aria-atomic=true]` in the panel. It is written on discrete changes only, never per frame:
- "1st floor: Dorm H at the front, …";
- "Women's bathroom.";
- "Stop 2 of 5. Check in. At the café counter, which is also the front desk, …";
- "Closer: pod numbers shown" (a keyboard zoom that changes tier);
- "Lamps on.";
- "Staff only.".

**Equivalents.** Layer images are `alt=""`. Plates, pins, rings, beads and motes are `aria-hidden`. Everything the drawing shows is in the room list, the cards and the captions as text. The plan crop is `role="img"` with an `aria-label` made of its steps.

**Targets, contrast, zoom.**
- Targets ≥ 44 × 44 px.
- Plates are ink on `--paper-near` (AA); "Staff only" and captions use `--text-soft` (AA).
- At 200% text zoom the bars wrap and the panel scrolls.

### 14.4 Staged Esc

Order: Esc closes the card, then ends the walk, then closes the explorer.

Implement it in a **`keydown` listener on the dialog** that calls `preventDefault()` on Esc while a card or walk is open. That prevents the close request at its source. Do not rely on `preventDefault()` in `cancel`: Chrome's close-watcher rules make `cancel` uncancellable without fresh user activation, and Esc is not activation. An Android back gesture (a close request with no keydown) closes the explorer outright.

---

## 15. Still and reduced motion

Gating uses the existing pattern:
- CSS: `@media (prefers-reduced-motion: no-preference)` with `:root:not([data-motion="still"])`;
- JS: `motionAllowed()` from `lib/motion/prefs.ts`, plus a listener for `MOTION_EVENT` (`useMotionAllowed()` in React).

| Thing | Full motion | Still or reduced |
|---|---|---|
| Open / close | Entrance or exit fade; the lift-off (polish) | The target frame at once |
| Room, floor, step, walk leg, keyboard pan | Flight, interruptible | Cut, then bake |
| Drag release | Coast, then spring | Stops; out of bounds snaps |
| Trays | Lift, sink, fade | Snap |
| Walks | Play on with caption-paced dwell | Manual Next only; the thread is drawn to the stop |
| Lamps | Catch (≤ 6 discs), motes | Lit, still |
| Plates | Swing in, fade | Shown at rest |
| Floating Shadow | 2 px drift | Still |

The rAF loop stops whenever the camera is idle, so idle battery use is zero. One second after any input under Still, `document.getAnimations().length === 0`.

---

## 16. Performance and budgets

**60 fps budget** on the throttled mid-range Android profile (Chromium, 4× CPU):
- ≤ 4 ms of JS per frame during pinch, pan, flight or walk: one camera solve, one `.world` transform, ≤ 24 plate transforms and the bead;
- no layout reads in the loop (rects come from `ResizeObserver`; plate sizes are measured once);
- no React render per frame: camera state lives in the engine's closure, and React changes only on discrete events.

**Must never animate:**
- layout properties (the only layout write is the bake at rest);
- a `viewBox`, or any attribute inside a layer sheet (they are `<img>`);
- `filter`, `mask`, `clip-path`, `box-shadow` or `backdrop-filter` on trays, the world or anything over it (the spotlight's mask is static; only its opacity moves);
- custom properties per frame (`--zb` is written only at rest);
- fills across many paths;
- plate font sizes;
- panel content during a flight.

**Allowed while moving:**
- `transform`, `translate`, `scale`, `rotate` and `opacity` on `.world`, trays and plates;
- `stroke-dashoffset` and `offset-distance` on the thread and bead (their own layer);
- `visibility` (discrete).

**Concurrency.** At most 6 ambient animations (the lamp catch is ≤ 6 at 240 ms apart; motes count). Plus the camera (rAF, not an Animation) and up to 4 tray transitions, never at the same moment as the catch.

**Raster.** `aside` and `hidden` trays are `visibility: hidden`. At most 3 rastered sheets in focus poses and 4 in overview. A fine sheet stays mounted for the last focused floor only; once it is opaque, the simple sheet under it goes `visibility: hidden`. Hidden-theme twins are never fetched (`display: none` with `loading="lazy"`); after open, the other theme's visible sheets are pre-decoded on idle.

| What | When | Budget (gz unless noted) |
|---|---|---|
| `ExplorerHost` JS | With home and `/the-house` | ≤ 1.5 kB; home scripts stay ≤ 200 kB (178.1 now + Workflow 1's delta) |
| Launcher markup | In HTML | Home ≤ +0.4 kB (≤ 150 kB raw; 144.1 now + Workflow 1's delta); `/the-house` ≤ +0.6 kB |
| `HouseExplorer` chunk | Intent prefetch, else click | ≤ 30 kB JS + ≤ 7 kB CSS (smoke-measured after the click) |
| `explorer.json` + `walks.json` | Same | ≤ 9 kB (≤ 32 kB raw) + 3.3 kB |
| Simple sheets, current theme | On open (ground, floor1 and front are cached from home's theatre) | 19.9 + 13.4 + 12.5 + 1.9 = 47.7 kB |
| Fine sheet, one floor | First room-tier view of that floor | ≤ 25 kB (measured 17.4–21.6) |
| Plan, one floor | First card on that floor | 3.9–6.7 kB (floor2 ≤ 6 kB) |
| Other theme's twins | Idle, after open | Mirror of the above |

**Cold open from a direct link:** about 97 kB before the full first frame. **From home with intent prefetch:** about 62 kB. **Targets:** open to first frame ≤ 300 ms with the chunk prefetched; a settle bake ≤ 50 ms on the throttled profile. CSP is unchanged: everything is same-origin `img-src` and `connect-src 'self'`, with no inline scripts added.

---

## 17. Tests

### 17.1 Unit (vitest, node environment; seeded mulberry32 where random, never `Math.random`)

- **`lib/explorer/camera.test.ts`:**
  - `zoomAt` keeps the focal point's screen position (200 seeded cases);
  - `fit` contains and centres its rect with the margin;
  - `clampCamera` is idempotent and keeps the bounds overlapping the free area;
  - `rubber` is monotonic and stays below `L`;
  - `flight` hits both endpoints exactly, its duration lies in [520, 1440], and it never zooms past `max(zA, zB)` on a pure zoom;
  - a coast stops within 1200 ms and the spring never overshoots;
  - `zLimits`: `zbMax × 991 × dpr ≤ 8192` for DPR 1, 2 and 3;
  - a bake (changing `zb` with `z` fixed) leaves every world point's screen position unchanged;
  - `worldTransform` maps known points.
- **`lib/explorer/pick.test.ts`:**
  - every room's anchor picks its own card;
  - a point on the 2nd-floor tray over the 1st floor picks the 2nd floor;
  - a point on a Dorm H pod's top over the landing picks `dorm-h` (frontmost);
  - the desk's anchor picks `desk`, not `cafe`;
  - a staff anchor returns staff;
  - empty table returns null.
- **`lib/explorer/url.test.ts`:**
  - round trips;
  - precedence (`room` beats `floor`; `pod` implies its dorm);
  - unknown values and staff areas are dropped;
  - `pod=H04`, `H13`, `H14` and `J18` are refused;
  - `stop` is clamped;
  - stable key order;
  - `explorerTarget` accepts only same-origin `/the-house?…` and `/?…` with explorer keys.
- **`lib/explorer/state.test.ts`:**
  - the pose table (§10) for each action;
  - closing a card keeps the pose;
  - a walk on `smoke` sets floor1 and floor2 aside;
  - `targetOf` returns the room box for a card, the stop for a walk, and the crop for a floor.
- **`lib/explorer/lod.test.ts`:** tier thresholds with hysteresis, the open-card and dorm rules, and `placeLabels` keeping the higher priority.
- **`lib/explorer/walk.test.ts`:**
  - `legPlan("arrival", stop 3 → 4)` spans ground then floor1 with a link slice;
  - legs on one floor have none;
  - dash and bead values agree with `shareAlong` at each stop;
  - `dwellMs` lies in [4500, 10000].
- **`lib/house/explorer.test.ts`:**
  - `public/house/explorer.json` equals `explorerJson()` (drift), ≤ 32 kB raw and ≤ 9 kB gz;
  - exactly 13 cards, ids as §4.3, each a guest area;
  - every step fixture exists, is on the card's floor, and lies within 1.0 m of the card's rects (or an opened area's);
  - numbers written in card text equal model counts (showers, toilets, basins, bar stools, low tables, chairs, cubbies);
  - every non-firm fact line matches its `creditCues` pattern;
  - every 2nd-floor card carries the copy note;
  - nothing mentions, labels or lights the shrine, and staff areas have no card;
  - each room's `box` lies inside the viewBox and contains its anchor (lifted);
  - pod tiers equal each pod's `variant`, and **no text says the first number is the top bunk**;
  - `curtain.matrix` equals `faceMatrix("pod-H01", "right")`;
  - `ROOM_NAMES` equals the card titles;
  - `describeHouse()` still matches `docs/house-context.md` (via `areaFacts`).
- **`lib/house/paper.test.ts`** (extend):
  - fine layers: one viewBox, no `<filter`, every counted id, deterministic, ≤ 100 kB raw and ≤ 25 kB gz;
  - `paper-plan-floor2-*` is in `HOUSE_RENDERS`, ≤ 25 kB raw and ≤ 6 kB gz;
  - `planOverlay("floor2")` works;
  - pendant cords are present at full detail (each `pendant-*` group holds its cord stroke).
- **`components/explorer/RoomCard.test.ts`:** `renderToStaticMarkup` for `bath-women` (4 steps in order, a "guests say" line, `data-ask-shadow`) and `dorm-h` (pod ranges, Book link). No Book link on `bath-women`.
- **`components/art/lamplighting.test.ts`** (Workflow 1's): the `lights-catch-*` stops equal the `lamp-halo-*` stops.
- **`lib/stage/acts.test.ts`:** `captionText` and `readFor`, moved.
- **`components/house/HouseStage.test.ts`:** still passes with `WALKS` from `walks.ts`.
- **`lib/concierge/knowledge.test.ts`:** every explorer link in the knowledge parses with `explorerTarget`, is on `siteUrl`, and covers all 13 rooms; the section is ≤ 3.5 kB and byte-stable.
- **`lib/concierge/prompt.test.ts`:** the place rule sits before "# House knowledge".
- **`lib/concierge/chat.test.ts`:** `explorerTarget` on good, foreign-host, malformed and `//evil` URLs.

### 17.2 Smoke (`scripts/smoke.ts`: a new `explorer(browser, viewport, scheme)` plus the others listed)

Phone 390 × 844 runs with `hasTouch`; desktop is 1440 × 900; each in Day and Evening.

1. **Lazy.** Load `/` and scroll through the theatre, and load `/the-house`. Before any hover or tap on Step inside, there is no request for the explorer chunk, `explorer.json`, `walks.json`, `paper-fine-*`, `paper-floor2-*` (on home) or `paper-plan-floor2-*`. The existing home budgets still pass.
2. **Open from home.** Click Step inside.
   - `getByRole("dialog", { name: "Walk through the house" })` is visible, and there is still one h1;
   - focus is on "Shall I show you round?";
   - the URL has `explore`;
   - no console errors and no sideways scroll;
   - screenshot `explorer-open-{viewport}-{scheme}.png` after settle.
3. **Floors.** Check "1st floor": the radio is checked, the floor2 tray is `visibility: hidden` after the transition, and the live region reads "1st floor:…". Screenshot.
4. **Card.** Rooms → "Women's bathroom":
   - the card h3 is visible with 4 steps;
   - the plan crop's `<image>` has loaded;
   - the URL is `?room=bath-women`;
   - `data-tier` is `room`;
   - after 2 s a `paper-fine-floor1-*` image is complete.
   
   Screenshot `explorer-room-*`.
5. **Deep links.** `/the-house?room=dorm-h` opens on the card with "H01 to H17" in "In here". `/the-house?walk=arrival&stop=3` opens on "Shoes off". `/the-house?room=staff-kitchen` opens the overview.
6. **Walk.** Choose Arriving and press Next four times.
   - the live region reads the 5 stop labels in order;
   - at "Shoes" the floor1 tray is `rest` and the link path is drawn;
   - at "Pod H01" the curtain group's transform is unscaled.
   
   Screenshots at stops 3 and 5.
7. **Evening.** Press Lamps on.
   - `html[data-theme="dark"]`;
   - no visible `.for-day` art inside the dialog (`checkVisibility`);
   - while it plays, every running animation in the dialog is `lights-catch-*` or `mote`, and there are ≤ 6 `lights-catch` animations;
   - after 5 s `document.getAnimations().length === 0`.
8. **Keyboard.**
   - the Tab order is as §14.2;
   - in the drawing, `+` raises `data-z` after settle, PageUp checks the next floor and Enter opens the centre room;
   - Esc closes the card, Esc closes the dialog, and focus is back on the launcher;
   - Back after opening closes the dialog, and Forward reopens it.
9. **Touch.** A CDP `Input.dispatchTouchEvent` pinch (two points spreading 120 px) raises `data-z`. A touch tap on Dorm H's plate opens its card.
10. **Still** (`hoj-motion=still`). Open, choose a floor, open a room, press Next in a walk. One second after each, `document.getAnimations().length === 0`, and the `.world` transform equals the target framing. Screenshot `still-explorer-*`.
11. **Never animate.** During a floor change and a walk leg at full motion, every running `CSSTransition`, `CSSAnimation` and `Animation` targets only `transform`, `translate`, `scale`, `rotate`, `opacity`, `stroke-dashoffset`, `offset-distance` or `visibility`.
12. **No page transition on URL writes.** During and after steps 3 and 4, no animation's `effect.pseudoElement` starts with `::view-transition`.
13. **Shadow.** A canned `/api/concierge` reply (the existing `route.fulfill` and `encodeEvent` approach) whose text contains `${base}/the-house?room=bath-women`:
    - the chip "Show me: Women's bathroom" is visible;
    - on `/the-house`, clicking it opens the explorer at the card with no navigation (the same document), the chat closed and focus in the explorer;
    - on `/faq` it navigates to `/the-house` and opens.
14. **Budgets.** The existing home checks. The scripts loaded after clicking Step inside are ≤ 30 kB gz JS and ≤ 7 kB gz CSS. The `/the-house` HTML delta is logged.

**Manual gate before merge:**
- iPhone Safari: pinch, crispness after settle at max zoom, memory at `zbMax`, no blank tiles or flash on bake;
- a mid-range Android Chrome: frame times in pinch and walk;
- macOS Safari: trackpad pinch via gesture events;
- Firefox;
- a VoiceOver or NVDA pass: open → walk → card → Ask Shadow → close.

---

## 18. Doc amendments the build makes

**`docs/DESIGN.md` §10.14** ("The house, up close (owner's brief, 7 October 2026)"). Use the next free number after Workflow 1's three amendments, expected 14:

- (a) **Zoom and pan inside the explorer only.** User-driven zoom and pan are allowed there, as a camera transform on one element with the zoom baked into layout at rest. Animating a `viewBox` stays forbidden. Scroll scenes stay zoom-free, so §9's rule holds for the theatre and the stages.
- (b) **The 2nd floor in the explorer.** The explorer shows the 2nd floor, dimmed, with its caption, wherever it opens, home included. This narrows §1.5.
- (c) **An overlay, not a route.**
- (d) **Guided walks.** They may play on by themselves once chosen, paced by their captions, and pause on any input. Nothing plays by itself under Still or reduced motion.
- (e) **Lamps on in the explorer.** It reuses the hero's bulb catch on at most six discs in view, 240 ms apart, once per switch or open. This extends §10.11's exception to the 400 ms rule (small lights, never more than three changes a second). No stutter.
- (f) **Fine paper layers** (`detail: "full"`) are committed for the explorer's room zoom. The simple layers stay everywhere else.

**`docs/HOUSE_MODEL.md`:**
- the files table: `rooms.ts`, `explorer.ts`;
- the committed pictures: `paper-fine-*`, `paper-plan-floor2-*`, `explorer.json`;
- `LayerOptions.detail` and `planOverlay("floor2")` in the API block;
- a short "The explorer" note under "The paper stage": trays move by `translate` in percent, plates are in screen space, and `explorer.json` drifts with content (run `npm run house:render`).

---

## 19. Build plan: two passes

### Pass 1: MVP (the promise, solid)

| WP | What | Done when |
|---|---|---|
| 0 | **Spike** (½ day): `.world` + 4 simple layers + `camera.ts` bake + pinch, on iOS Safari and a mid-range Android Chrome | Crisp after settle at `zbMax`, no blank tiles or flash on bake, ≥ 55 fps pinch on the throttled profile. Set `MAX_BAKE_PX` (8192, or 6144 if iOS fails). |
| 1 | Data: `LayerOptions.detail`, fine layers + the look-fix round (pendant cords), `paper-plan-floor2`, `planOverlay` floor2, `areaFacts`, `withCredit`, `rooms.ts`, `explorer.ts`, `house-render` writes, `walks.ts`, `thread.ts`, `captionText`/`readFor` moved | §17.1 data tests green; fine floors reviewed as PNGs at 1.6 and 3 px per unit, Day and Evening |
| 2 | Pure client: `url`, `state`, `camera`, `pick`, `lod`, `walk` | §17.1 client tests green |
| 3 | `ExplorerHost` (capture listener, prefetch, URL on mount, `popstate`, the `ViewTransition` guard), `ExploreLink` launchers on home and `/the-house`, dialog shell, world, trays and poses, engine (flights, coast, rubber band, bake), gestures, wheel, Safari gestures, keyboard, staged Esc, Still | Smoke 1–3, 8–12 |
| 4 | Panel and sheet (snaps), greeting, room list, 13 cards with plan crops, steps as fly-to buttons, spotlight, screen-space plates with tiers and collisions, the Shoes-off pin, the fine-layer swap, card "Ask Shadow" | Smoke 4–5 |
| 5 | Walks: 3 spine walks + 3 from cards; thread, bead, rings, link, cubby glow, H01's curtain; captions with the bust, dwell, pause rules | Smoke 6 |
| 6 | Lamps: the shared catch in `glow.module.css` + equality test, ≤ 6 discs, motes, pre-decode before switching. Shadow: knowledge, prompt rule, chips | Smoke 7, 13 |
| 7 | Budgets, the a11y pass, docs (§18), the manual device gate | Smoke 14, all green, device notes recorded |

### Pass 2: polish (the magic)

In order:
1. The **lift-off** from the stage and the reverse on close, carrying mid-act floor lifts.
2. **Tray shadows.**
3. The **floating Ask Shadow** avatar (Workflow 1's dock asset and glow).
4. The **pod picker** (`?pod=`, outline on the plan crop, a glow at the pod's face, "Your locker has the same number, H07…" with `LOCKER_NOTE`) and **near-tier number plates**.
5. The running-stitch room outline.
6. The trackpad pan heuristic.
7. A lamp pool behind the house (a static radial gradient moved only by transform toward the focus, Evening only).
8. "Copy link" in the card (`${siteUrl}/the-house?room=…`).
9. The `PodDiagram` link "See the pods in the house" → `?room=dorm-h`.
10. A desktop hover outline.

---

## 20. The cut-list

**Cut first, in this order, if time runs short:**
1. hover outline;
2. lamp pool;
3. stitch outline;
4. Copy link;
5. trackpad pan heuristic (the wheel always zooms);
6. pod picker and number plates (dorm cards keep their ranges);
7. floating Ask Shadow (keep the card's Ask Shadow);
8. tray shadows;
9. the lift-off (keep the dialog entrance);
10. fine layers (the simple layers stay vector-crisp at any zoom);
11. walk autoplay (keep manual Next);
12. motes (keep the catch).

**Never cut:**
- the full-screen house, crisp at any size (the bake);
- floors lifting apart;
- the 13 cards with plan crops and honest credits;
- the three walks with readable captions;
- Day and Evening with the shared catch;
- keyboard and screen-reader parity;
- Still cuts;
- lazy loading;
- deep links;
- Shadow's Show me link.

**Not doing, and why:**

- **No WebGL, canvas re-render, three.js, CSS 3D tilt or orbit.** The iso projection is the drawing's truth.
- **No new npm runtime package.** No pan-zoom or gesture library: they cost 10–25 kB and fight the bake.
- **No new route,** intercepting route or parallel `@modal` slot.
- **No inlined full layer SVG,** no `viewBox` animation, no CSS filter, mask or clip-path on trays or the world, no per-frame custom properties.
- **No camera position in the URL,** and no per-frame React state.
- **No minimap,** compass, scale bar, grid or search box.
- **No first-person walking or avatar.** *Find your pod* already is that.
- **Shadow is never drawn inside the paper world,** and never walks a guest or carries anything. No LLM calls inside the explorer.
- **No autoplay on open, no loops, no stutter in the explorer,** no dip on arriving in a room, no sound.
- **No double-tap zoom,** no long-press, no drag-to-resize sheet (the handle taps through peek, half and full).
- **No Fullscreen API** (iOS ignores it for elements) and no orientation lock: the dialog is `100dvh`.
- **No WovenBand in the explorer.** No new hues, no orange fills over 24 px.
- **No facts beyond the model and `content/`.** The 2nd floor stays a copy, locker positions stay approximate, the butt jar's place stays assumed, pendant counts are not stated, there is no "first number is the top bunk" rule, and the shrine is never shown, lit or named.
- **No availability or prices in the explorer.** One secondary "Book a bed" link on the dorm cards.
- **The team's round is not a guest walk** in the explorer.
- **No `lib/house` import in client code.** Everything reaches the client through `explorer.json` and `walks.json`.

---

## 21. Risks and owner decisions

**Risks:**

1. **iOS large SVG rasters.** Mitigated by the device-scaled bake cap (§6.6), one focused tray at room zoom, and visibility-hidden off trays. WP0 gates it on a real iPhone; only Chromium is available here.
2. **History and Next's router.** Writes run as transitions: guarded by the nested `ViewTransition` and smoke 12. Back and Forward and soft navigations go through `popstate` and the on-mount read, with a loop guard.
3. **Staged Esc** relies on `keydown.preventDefault()` (§14.4). The Android back gesture closes the explorer outright, by design.
4. **Content drift.** `explorer.json` embeds `content/` text. The drift test fails until `npm run house:render` runs, as for `walks.json`.
5. **Fine-layer look.** One look-fix round is known (pendant cords). If they look busy at full screen, they are the tenth cut.
6. **Budget headroom** after Workflow 1: home must stay ≤ 150 kB HTML and ≤ 200 kB JS. The host and launchers add ≤ 1.5 kB gz and ≤ 0.4 kB. Smoke enforces both.
7. **Workflow 1 dependency.** The catch keyframes and the dock asset. If the explorer is built before that merge, write the keyframes with Workflow 1's stops, use `ShadowFigure variant="bust"` for the avatar, and add the equality test when both exist.

**For the owner** (defaults in brackets):
- Show the 2nd floor, dimmed and captioned "drawn as a copy", when the explorer opens from the home page? (yes)
- In the dorm cards, a quiet "Book a bed" text link, or the orange Book button? (the quiet link)
- Guided walks play on by themselves once chosen, pausable, or always wait for Next? (play on)
- The title "Walk through the house" with the launchers reading "Step inside"? (yes)

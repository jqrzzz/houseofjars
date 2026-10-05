# The House Model

One model of the real building that every picture and animation of House of Jars is drawn from: illustrated maps, the guest tour, staff cleaning guides, login screens, videos. "One skeleton, many outfits": the model in `lib/house/house-of-jars.ts` is the skeleton; each view (street, dollhouse cutaway, exploded floors, floor plans) is an outfit generated from it. When something in the house changes, one line of data changes and every picture follows.

The model comes from the owner's walk of 5 October 2026 (the `place-walk` skill). **Counts are exact. Positions and sizes are approximate** (no tape measure), but the arrangement is true: what is next to what, which side, which floor. Anything assumed rather than seen carries `confirmed: false` and a note (in the SVGs, `data-confirmed="false"`).

## Files

| File | What it holds |
| --- | --- |
| `lib/house/types.ts` | The shapes of the data: floors, areas, walls, fixtures, routes. |
| `lib/house/house-of-jars.ts` | The House of Jars itself (`houseOfJars`), built with `dormFloor(level, letter, bathroom)` for Floors 1 and 2. |
| `lib/house/palette.ts` | Materials (day and Evening, three tones each), role classes, the stylesheet. |
| `lib/house/geometry.ts` | Boxes, panels, extruded polygons, cylinders, turned shapes (jars), text on a wall; the isometric and plan projections; painter's sorting; path writing. |
| `lib/house/fixtures.ts` | The fixture library: how each kind of thing is drawn, in 3D and as a plan symbol. |
| `lib/house/render.ts` | The views: `renderStreet`, `renderCutaway`, `renderPlan`, and `HOUSE_RENDERS` (the committed set). |
| `scripts/house-render.ts` | `npm run house:render`: writes the committed SVGs to `public/house/`. |
| `lib/house/*.test.ts` | Model integrity and the walk's counts, geometry, rendering, and the drift check on `public/house/`. |

The website's `/the-house` page still uses its old drawing (`public/art/house.svg`) until the owner approves the new one.

## Coordinates (metres)

- `x`: across the house, from the **left** party wall (`x = 0`) to the **right** one (`x = 4.0`), as you stand in the street facing the house.
- `y`: depth, from the front facade (`y = 0`) to the back wall (`y = 16.0`). The terrace is in front, at negative `y` (`-2.6` to `-0.15`).
- `z`: height. In the model, every fixture's and wall's `z` is **relative to its floor**; the renderers add the floor's height. (The roof, `houseOfJars.roof`, is absolute.)
- Outer walls are drawn outside the interior box, 0.15 thick.

| Floor (owner's name) | id | Floor `z` | Ceiling | What is there |
| --- | --- | --- | --- | --- |
| Ground floor (the lobby) | `ground` | 0 | 3.6 | Terrace, entrance, café with the counter that is also the front desk, stairs, water, toilet, staff room and kitchen |
| Floor 1 | `floor1` | 3.8 | 6.7 | Dorm H (House), the landing with the shoe cubbies, the women's bathroom |
| Floor 2 | `floor2` | 6.9 | 9.8 | Dorm J (Jars), the landing, the men's bathroom (not photographed: copied from Floor 1; the floor itself is `confirmed: false`) |

Slabs between floors are 0.2 thick; the roof slab runs from 9.8 to 10.0, with a low tiled edge at the front. Each upper floor's `opening` is the hole in its slab over the flight from the floor below; the renderers cut the slab and the floors around it.

**Isometric view** from the front right, above: with `u = x` and `v = 16 - y`, `X = (u - v) cos30 S`, `Y = (u + v) sin30 S - z S`, `S = 36` px per metre. The front-right corner is nearest. The camera sees tops, faces toward the street (the viewer's left, a little darker) and faces toward the right (darker still).

**Plans** are top-down, street at the bottom, left party wall on the left, 50 px per metre (84 for the terrace plan).

## Changing the model after a change in the house

Edit `lib/house/house-of-jars.ts`, then run:

```sh
npm run house:render   # redraws public/house/
npx vitest run lib/house   # checks the model and that the pictures match it
```

The tests fail while `public/house/` differs from a fresh render, so the pictures never drift from the model. They also check that ids are unique, every fixture sits inside its area (to 5 cm), no two solid fixtures share volume (unless one is `mountedOn` the other), nothing stands in a doorway, no route walks through furniture, each slab opening covers the stairs below it, and the walk's counts (12 pods and 12 lockers per dorm, 3 toilets and 2 showers per bathroom, 5 low tables and 10 chairs in the café, and so on).

Everything the pictures show comes from the model, so a copy of the model with something changed draws that change: every renderer takes `model` (default `houseOfJars`), for a what-if or a test.

Examples:

- **A table moved.** Change its centre in `LOW_TABLES`; its two chairs follow.
- **Something new** (a second fridge): add a fixture with a unique `id`, its `type`, `area`, `box` (`centred(x, y, w, d, h, z0)` or `box(x0, x1, y0, y1, z0, z1)`), and `faces` if it has a front. Use an existing `type` when one fits; a new kind of thing also needs a builder in `fixtures.ts` (3D parts and a plan symbol).
- **Floor 2 confirmed.** Drop `confirmed: false` from the `floor2` floor, and in `dormFloor` the `level === 2` unconfirmed marks for what the owner checked (and add the shoe cubbies if Floor 2 has them too). Update the counts test if a number changed.
- **Which pod and locker carries which number, confirmed.** Fix the labels in `dormFloor` (the pod `columns` and the locker `stacks`) and update `POD_NOTE` and `LOCKER_NOTE`, or remove `confirmed: false` once the dorm's back end is confirmed too.
- **The stairs moved.** Move the stairs fixtures and the upper floors' `opening` with them; the slab holes, the floors around them and the plans follow.
- **A room that is not a rectangle.** Give its area `more` rectangles (the staff room reaches behind the stairs this way).
- **A route.** Add it to `routes`: one segment per floor, points as `[x, y]` or `[x, y, z]` (on stairs), optional stops. The test fails if a flat stretch crosses a fixture standing on the floor.

### What is assumed today (`confirmed: false`)

- **All of Floor 2** (copied from Floor 1), except its two small windows, which show in the street photo.
- **The staff room and kitchen** inside (lockers, counter, door).
- **Which pod and locker carries which number.** The numbers themselves are the owner's: H01 to H12 on Floor 1 and J01 to J12 on Floor 2 (the plates in the photos are too blurry to read). Their order is not known: ask the owner, one side at a time, before the labels go into a tour or a cleaning guide.
- **The back end of the dorms.** Photos f2-04, f2-05 and f2-08 show a crosswise pod column closing the aisle at the back, a locker stack beside it, and the door to its right; the model still draws the aisle running straight to a door in the middle. Confirm it with the owner, then in `dormFloor`: add the crosswise column facing -y, move the dorm door to about x 2.7 to 3.6 beside a locker stack, shorten the right-hand columns to leave the way in, re-split the columns so there are still 12 pods, and update the arrival and bathroom routes.
- **The ground floor's stairs.** Photo f1-12, from the foot of the flight, shows a plain plastered wall on the climber's right and the teak panel with the café floor beyond it on the left: the model has the sides the other way round. The flight may also turn at a landing near the top (the walk lists a clay jar on the landing; where it stands is not known). Where the stairs open to the café is assumed.
- **The corridor behind the café.** Photos f1-10 and f1-11 do not pin down its plan: f1-10 shows the hand-wash basin right beside the toilet's door; f1-11 shows the basin and the staff room's doorway on the same plastered, tiled wall, the teak cupboards opposite, and the extinguishers and clay jars against a blank end wall. The model puts the basin and dryer beside the toilet's door, the staff door in the corridor's side wall past the stairs, and the extinguishers and jars against the blank end wall.
- **The pendant lamps** over the café: seen in photos f1-03, f1-05 and f1-08; how many and where is approximate.
- **The flight to Floor 2** rising back over the first one (approximate).

## Views

```ts
import { renderCutaway, renderPlan, renderStreet } from "@/lib/house/render";

renderStreet({ theme, neighbours, depth, idPrefix, title, model });
renderCutaway({ theme, explode, fitExplode, floors, labels, labelSize, highlight, route, idPrefix, title, model });
renderPlan("ground" | "floor1" | "floor2" | "outside", { theme, labels, idPrefix, title, model });
```

- `theme`: `"auto"` (default: day colours, the Evening palette under `prefers-color-scheme: dark`), `"day"` or `"evening"`.
- Bad options throw: no floors to draw, an unknown floor, route or highlighted area, an explode that is not a number of metres (0 or more), and an `idPrefix` that is not a CSS identifier (it becomes part of every id and of the stylesheet's class).
- **Street**: the closed building: facade with the big arch (it echoes the logo), ledge band, windows, the three outdoor AC units, the awning on two posts with the "hostel" sign (white letters on orange), the hanging sign, door, grid window with its bamboo blind, the bench and two small tables on the tiled terrace. The awning's roof is drawn see-through so the shopfront under it reads. The side wall and roof are cropped `depth` metres back (default 4, so the facade leads; `depth: 16` draws the whole building), the cut edges dashed. `neighbours: true` adds NinetyNine 99 Bar (left) and Swedish Baking (right) as low-detail slices cropped the same way.
- **Cutaway** (dollhouse): the same camera with the right wall, the roof and each floor's ceiling taken away. Conventions, so the rooms show:
  - the facade (and anything outside: the awning's posts, the terrace) is cut 1.0 m above each floor, the cut drawn in hairline; what hangs on the outside of the facade above the cut (outdoor AC units, the awning, the signs) is not drawn; what hangs on its inside (the dorms' AC units over the windows) is;
  - inner partitions, and the flight between Floors 1 and 2, are drawn to 2.2 m (above the door heads); the outer walls and the ground floor's wooden stair enclosure keep their full height; in each bathroom the stall nearest the camera is drawn cut open at 0.7 m so one toilet shows;
  - what hangs on the right wall (bathroom mirrors, dryers, the rules sign) goes with it; the pods against the right wall lose their outer panels with it, so their beds show;
  - `explode` (metres) lifts each floor by `explode x S x level` pixels; `fitExplode` (metres) makes the viewBox big enough for that explode too, without moving anything (for lifting the floors at runtime); `floors` draws only some floors;
  - `labels` adds area labels with leader lines; each label takes the first clear place around its anchor (above, to a side, below), so no pill covers another or another label's dot, and a label whose anchor a floor above hides is left out; `labelSize` sets their size (default 19 px of the viewBox; use about 32 for a picture shown at phone width);
  - `highlight` (area ids) outlines those areas, with their sub-areas (the café keeps its counter, water corner and entrance), and fades the rest: a floor with nothing highlighted fades as one group; on a floor with something highlighted the other areas and their fixtures become opaque ghosts (nothing shows through), and their labels dim;
  - `route` draws a guest's path: in short pieces sorted with the walls and furniture, so whatever stands in front hides it, with the whole path again on top, faint, so the hidden stretches stay traceable; its stops are labelled; with the floors lifted apart, a dotted link joins the end of one floor's stretch to the start of the next.
- **Plans**: on their own paper (so the frame text reads whatever the page's theme), walls as thick ink (the facade broken at every window), areas tinted by kind, fixtures as simple symbols (pods numbered, "lower"/"upper"; lockers by stack; stairs with an arrow that starts where you stand and points the way you walk, "Up" or "Down" at its tail, two half arrows split by a break line where a flight up stands over the flight down), things that hang above dashed, a "Street" marker, "Approximate, not to scale", and a floor's note when it has not been seen yet. A small area's label can sit beside it (`planAnchor`) with a short leader.

### The committed pictures (`public/house/`)

| File | View |
| --- | --- |
| `street.svg` | Street view (cropped 4 m back) |
| `street-neighbours.svg` | Street view between the neighbours |
| `cutaway.svg` | Dollhouse, floors stacked |
| `cutaway-exploded.svg` | Dollhouse, floors lifted 2.5 m apart, labelled |
| `cutaway-exploded-phone.svg` | The same with labels for phone width (32 px) |
| `cutaway-arrival.svg` | Ground floor and Floor 1 lifted apart, with the arrival route |
| `cutaway-ground.svg`, `cutaway-floor1.svg` | One floor each, labelled: the clearest pictures of the lobby and of a dorm floor |
| `plan-ground.svg`, `plan-floor1.svg`, `plan-floor2.svg`, `plan-outside.svg` | Plans |

All are `theme: "auto"`. Other combinations come from the functions.

## The id and data-attribute contract (for animators)

With `p` the `idPrefix` (default empty):

- Each floor: `<g id="{p}floor-ground" data-floor="ground" data-level="0">` (and `data-confirmed="false"` on a floor not seen yet), drawn bottom to top. Nothing of one floor is drawn inside another floor's group. The renderer's own `explode` writes `transform="translate(0,-90)"` on it (2.5 m on Floor 1).
- Each area: `<g id="{p}area-cafe" data-area="cafe" data-kind="shared">` holds its floor; a sub-area adds `data-parent="cafe"`. Fixtures are not nested in areas (painter's order decides their order) but carry `data-area` and `data-room` (the room: the area's parent, or the area itself), so `[data-room="cafe"]` selects everything in the café, counter and water corner included.
- Each fixture: `<g id="{p}fx-pod-H01" data-fixture="pod" data-label="H01" data-area="dorm-h" data-room="dorm-h">`; a fixture `mountedOn` another is nested in its host's group (the basins in `fx-vanity-women`). `data-confirmed="false"` marks what was not seen.
- Walls: `<g data-wall="{wall id}">` (several pieces may share a wall id).
- Routes: `<path id="{p}route-arrival-ground" data-route="arrival" data-floor="ground">`, one per floor, inside that floor's group (so it moves with it): the whole stretch, drawn faint on top. The solid dashes are short `class="rt"` paths sorted into the floor's drawing; stops are rings with `data-stop`. With `explode > 0`, `<g id="{p}route-arrival-link-ground-floor1" data-route-link="arrival">` after the floors joins two floors' stretches at the rendered explode (hide it while animating the explode).
- Labels: one `<g id="{p}labels-ground" data-labels data-floor="ground">` per floor, drawn after all the floors so no floor covers them, with the same translate as their floor. Each label is a `<g data-label-area="cafe" data-text="Café" data-ax="…" data-ay="…">` (a route stop's has `data-label-stop`): the anchor in viewBox units, before the labels group's translate, so a page can lay its own HTML labels (in Figtree, at a fixed size) over the picture instead. Plans have the same labels group inside their floor group.
- Neighbours (street view): `<g id="{p}neighbour-left">`, `<g id="{p}neighbour-right">`; the roof: `<g id="{p}roof">`.
- All ids are unique within one SVG; `<title>` and `<desc>` come first, `role="img"`. Use a different `idPrefix` for each drawing inlined on the same page.

### Exploding the floors at runtime

The same exploded picture the renderer draws can be produced, and animated, with CSS on the floor groups alone. Three things to know:

1. **Inline the SVG** in the page (CSS from the page cannot reach into an SVG shown with `<img>`).
2. **Leave room.** The viewBox fits the explode the SVG was rendered with, and an inline SVG clips what leaves it. Render with `fitExplode` set to the largest explode you will animate to (`renderCutaway({ fitExplode: 2.5 })`), or render at the largest explode and animate back to 0: a CSS `transform` replaces the `transform` attribute, so `transform: none` puts a lifted floor back.
3. **Move each floor's group and its labels group together**, by id (`#{p}floor-floor1, #{p}labels-floor1`) or with `g[data-floor="floor1"]`. Not with a bare `[data-floor="floor1"]`: the route's path carries `data-floor` too and would move twice.

```css
/* With idPrefix "" and the SVG inlined; 36px is S, one metre. */
.house { --explode: 0; }
.house.is-exploded { --explode: 2.5; }
.house g[data-floor="floor1"] { transform: translateY(calc(-1 * var(--explode) * 36px)); }
.house g[data-floor="floor2"] { transform: translateY(calc(-2 * var(--explode) * 36px)); }
.house g[data-floor] { transition: transform 600ms ease; }
.house [data-route-link] { display: none; }
@media (prefers-reduced-motion: reduce) {
  .house g[data-floor] { transition: none; }
}
```

## Style

Lines keep their weight at any size (`vector-effect: non-scaling-stroke`): 1.5 px for walls, slabs, room floors and main outlines, 1 px for fixtures and hairlines (cut tops), tile and board grids fainter still, round caps and joins. Flat fills, no `<filter>`. Colours come from `public/art/house.svg` (ink `#4a2f1b`, Evening `#dccdb6`; cream, teak, jar orange, lamplight) with the walk's materials: the terracotta-orange facade, the café's ochre plaster and cream floor tiles, the dorms' brown tiles and clay-pink walls, terracotta landings and stairs, the curtains' grey-brown weave with a cream band, white bathroom tiles on a grey floor. Each material has three tones (top, left-facing, right-facing) mixed from its base in `palette.ts`; change a base colour there and the whole drawing follows. The Evening palette stays warm; the windows, the drinks fridge and the lamps glow in lamplight, and the café's pendant lamps throw soft cones of light.

Classes are short (`wd1`: wood, left-facing tone) and scoped under the SVG's own class (`hj-auto`, `hj-day`, `hj-evening`, prefixed by `idPrefix`), and only the classes a drawing uses get a rule (a test checks every class has one). A faded area or fixture carries `dg` (an opaque ghost); a faded floor or label carries `dim` (opacity).

Labels fix their text width (`textLength`), so they fit their pills whatever font the viewer has (an SVG shown as an image cannot load the site's Figtree).

## Painter's order

Every drawn thing is a node with a bounding box. Siblings are sorted by a topological pass on "is behind" between nodes whose isometric outlines overlap (a box is behind another when it is entirely further left, further back, or lower; when outlines overlap, every such axis agrees), choosing among free nodes by the base rule: smaller `u + v` first, then lower `z`, then insertion order. The base rule alone mis-sorts long walls against small things; the topological pass fixes that. Floors are drawn bottom to top (nothing on a floor reaches into the floor above), fixtures as single nodes so each stays one group, and a fixture's own parts are sorted the same way. A route's pieces are nodes too (a piece over a flight of stairs is sorted as lying just above it).

## Exporting

The SVGs are the masters. For a PNG (for a video or a slide), rasterise in headless Chromium, for example:

```sh
/opt/pw-browsers/chromium-1194/chrome-linux/chrome --headless --no-sandbox --disable-gpu --hide-scrollbars \
  --window-size=1400,1100 --screenshot=out.png file:///path/to/view.html
```

where `view.html` shows the SVG (`<img src>` or inline). For the Evening look, render with `theme: "evening"` (or force the dark colour scheme). Scale with the device pixel ratio rather than by resizing the PNG.

## Known gaps

- Positions and sizes are approximate; Floor 2 is a copy of Floor 1.
- The dorms' back end, the pod and locker numbers, the ground floor's stairs and the corridor behind the café are drawn as assumed above, against what some photos show, until the owner confirms them.
- The stairs are approximate: a straight masonry flight on the ground floor, and the flight to Floor 2 stacked over it on the same footprint (a scissor arrangement). How the landings connect to the flights is assumed.
- From this camera the corridor behind the café (the basin, the extinguishers, the staff room's door) is hidden behind the toilet room; the ground plan shows it. The inside of the curtains on the far side of the right-hand pods cannot be seen either.
- A route's link between lifted floors is drawn for the rendered explode only.
- The hanging "House of Jars" board under the awning is drawn as a board with the logo's arch, without its lettering (too small to read at this scale); the dorm doors' H and J plates are plain for the same reason.

---
name: place-walk
description: Turn a walk through a real place (a hostel, a house, a café, a venue) into a simple, accurate map of its areas and items, from photos the owner takes on their phone. Use when the user wants to walk, map, inventory or photograph a place, continue the House of Jars walk, or set up a walk for a new place.
---

# Place Walk

The owner walks a place with their phone and takes photos. Claude turns the photos into a map: every area, what is in it, roughly where it sits, and its photos. Later, the map becomes drawings, guest tours, staff guides and an inventory.

First run: House of Jars, Vientiane, October 2026. The live walk page is https://claude.ai/artifact/RaGmYU7mRxnfo94rszHyRw (private to the owner).

## The rule: accurate and simple

- **Count exactly.** Beds, lockers, toilets, fire extinguishers. Unknown stays `null`, shown as "?". Never guess a number.
- **Place roughly.** Which floor, and which part of a 3 × 3 grid, seen from above with the street at the bottom. No tape measure.
- **Photograph everything.** Two or three photos per area.
- **Every fact is checked or a guess.** A guess carries its reason (`from`). Only the owner marks something checked, after seeing it.

## Steps

### 1. Before the walk: write down what is already known

Read what exists: the listing (Booking.com, Agoda), the website's content, existing photos, the signs. Turn it into starting guesses, one per area, each with the reason it is a guess. Flag facts that disagree; the walk settles them. (At House of Jars, Booking.com said 2 floors and the rules board said 3.)

### 2. Set up the walk page

`walk-page.html` in this folder is the page. For a new place, copy it and change the header (name, mark, colours) and the intro line. Publish it with the Artifact tool, declaring `capabilities: {db: {}, assets: {}, user: {}}`, then write the starting guesses with one `ArtifactData` batch. `seed-house-of-jars.json` is the example.

Data shape:

- `floors/<id>`: `{n, label, hint, sketch, order}`. Ids `f1`, `f2`… and `out` for outside. `sketch` is an asset id or `null`.
- `areas/<id>`: `{name, floor, kind, cells, items, photos, note, status, from, order}`
  - `kind`: `sleep`, `wash`, `shared`, `staff`, `path` or `outside`.
  - `cells`: grid squares 0–8, read like a page: 0 back left, 1 back centre, 2 back right … 6 front left, 7 front centre, 8 front right (front is the street side).
  - `items`: `[{id, name, count}]`, `count` a number or `null`.
  - `photos`: asset ids in the artifact's asset store. The page shows them at `/_blob/<id>`.
  - `status`: `guess` or `checked`. `from`: why it is a guess.

### 3. The walk: the owner sends photos in the chat

Ask for:

1. **One area per message**, starting with where they are: "Floor 2, Dorm H". Photos can't tell which floor they show.
2. **Two or three photos per room**: from the doorway, from the far corner looking back, and the ceiling (air-conditioning, fans, smoke alarms).
3. **One line about what photos can't show**: counts behind curtains, what is next to what.
4. **About 5 to 15 photos per message.**
5. **Their own names and numbers**, asked once at the start: what each floor and room is called, how beds and lockers are numbered, and the house rules that shape how people move (where shoes come off, which bathroom is on which floor).

Keep out of every photo: guests and their things, passports and IDs, screens with guest details, the cash box or safe.

### 4. Claude's part, for each message

1. Find the area on the page, or add it.
2. Count what is visible, cross-checking every photo of the area so one thing seen from two sides is counted once. Leave hidden counts as `null`. Never treat a number read off a blurry plate or sign as fact: zoom in, and if it is not sharp, ask.
3. Set the floor and the rough `cells` from the photos and the owner's line.
4. Blur any bystanders (neighbours, passers-by), then upload the photos to the walk page's asset store: Artifact tool, `url` of the page, `asset: true`, `file_paths` (up to 25 at once). Add the returned ids to the area's `photos`.
5. Write the area with `ArtifactData` (`update`, pinned with `if_version`). Keep `status: "guess"` and set `from` to "From your photos, <date>: …" so the owner knows what to check.
6. Reply briefly: what was added, what is still "?", and any question.

The page saves the owner's own edits live, so always read an area before writing it.

### 5. After the walk

1. Read all `floors` and `areas` (`ArtifactData` `list`). Settle open questions with the owner.
2. Save the result in the project as the place's house file: floors, areas, items, places.
3. Draw from that one file: the rough plan, then the illustrated map in the house style (`public/art/`, `components/house/`), then the guest tour and staff guides.
4. Put photos on the public website only with the owner's yes.

### 6. Keep it true

When something changes (new beds, a moved counter), update the area on the walk page. Walk the place again about once a year.

## Lessons

Add what each walk teaches, newest first, so the next walk goes better.

- **House of Jars, 5 Oct 2026 (the walk, 42 photos in four messages):** Ask for the owner's names and numbering first: "H for House, J for Jars, lockers H01 to H12" was faster and surer than anything in the photos. Claude read blurry locker plates as H16 and H17 and nearly corrected the owner wrongly; they were unreadable. "Floor 3 is the same as Floor 2" is a fine answer: copy the floor, mark it as copied, check it later. House rules about movement (shoes off at the stairs, women's bathroom on Floor 2, men's on Floor 3) matter as much as the furniture for tours and staff guides. Cross-checking angles caught one drinks fridge that looked like two. A narrow, deep shophouse crowds the back row of the 3 × 3 grid (stairs, water, toilet, kitchen): offer more rows for deep buildings next time. Chairs move, so estimate them and say so.
- **House of Jars, Oct 2026 (before the walk):** Basic facts already disagreed (2 floors or 3?), so start from guesses with reasons, never from "facts". Photos can't show which floor or what is behind curtains, so every batch needs a one-line caption. Sending photos in the chat was easier for the owner than filling in a form, so the form became Claude's notebook and the owner's review screen.

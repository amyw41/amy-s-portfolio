# Rebuild the About page's "what's inside?" Carousel/Gallery from scratch

## Context

A previous attempt at this section shipped broken (see the removed
`components/sections/About/WhatsInside.tsx` + `Carousel.tsx` + `Gallery.tsx`
+ `StarBadge.tsx` + `whatsInsideLayout.ts` + `lib/whatsInsideItems.ts` —
still sitting in the repo, unused, per `About/index.tsx`'s own comment) —
its measured-width element had no explicit `width`, so the whole layout
solved against an unstable/wrong number, producing a visibly broken row
(huge dead space, arrows stranded at the page edges, nothing reading as a
"centered" item). Rebuild this section clean rather than patching that code
— delete those unused files entirely (and the leftover
`content.en.about.whatsInside` key in `lib/content.ts`, and the stale
comment in `About/index.tsx` referencing them) and start fresh, carrying the
width fix forward as a hard requirement from the start this time, not an
afterthought.

## What this section shows

The jar's own physical items — the same `JAR_ITEMS` this site's own
homepage Hero already renders falling/bouncing inside the interactive jar
(`components/sections/Hero/items.manifest.ts`, images in
`public/images/items/`) — filtered to `category === "favourite"` (skip the
3 `category: "project"` items — cybersea/skinsprout/spotify — those are
already shown as full case-study cards elsewhere on the site; repeating them
here as jar knick-knacks would be redundant). This is real, existing data
in this repo, not anything to invent — just reuse `JAR_ITEMS` directly
rather than re-authoring a separate item list.

For each item's display name/caption, use short, real copy (a couple of the
favourite items already have natural real-world names — ballet shoes, water
bottle, lip balm, etc., going by their filenames in `public/images/items/`)
— write straightforward captions and flag any you're genuinely unsure about
for Amy to fill in later, rather than guessing elaborate personal detail.

**Drop the star-badge easter egg** from the previous attempt — it wasn't
ported from anything verifiable in this codebase or `jar-portfolio`, it was
an invented flourish. Keep this rebuild to just the carousel/gallery
mechanics described below; if a click interaction like that is wanted later
it can be its own explicit follow-up.

## Structure — same as before, this part was right

- Third section on the About page, `components/sections/About/`, below the
  existing `Bio` and `Experience` (already built, don't touch). Wire it back
  into `About/index.tsx`.
- Heading "what's inside?" (own key, `content.en.about.whatsInside.heading`
  in `lib/content.ts` — this is a different page's copy from
  `content.en.projects.heading`, even though the text matches).
- A single-select `carousel`/`gallery` view toggle using the exact
  `CircleToggle` pattern `components/sections/Playground/index.tsx` already
  uses for its plate/collage toggle (local `viewMode` state, two
  `CircleToggle`s, only one active) — copy that pattern, don't reinvent it.
  Toggle labels in `content.en.about.whatsInside.toggles.{carousel,
  gallery}`.
- Port the actual layout mechanics faithfully from `jar-portfolio`'s real,
  verified source: `components/WhatsInside/Carousel.tsx`,
  `Gallery.tsx`, and `layout.ts` (`computeLayout`, `NEIGHBOR_SCALE`,
  `MAX_ITEM_SIZE`, `ARROW_SIZE`, the arrow-to-arrow width-solve math) — a
  centered-and-scaled-up featured item, faded/shrunk neighbors, invisible
  past that, prev/next arrows, dot indicators below to jump directly to any
  item. Media here is a single image per item (`next/image`, `object-fit:
  contain` reads better than `cover` for these product-style photos on a
  transparent/plain background — check how they actually look) — no video
  branch needed, jar items are static images.
- Gallery view: a plain responsive grid of the same items (1 col mobile, up
  to 3 col desktop), each with its image and caption.

## The width fix — get this right from the start

Whatever element you measure (via a `ResizeObserver`-based hook — reuse
`components/sections/Playground/useElementWidth.ts`, already exists and
works correctly for `/playground`) to solve `computeLayout` against **must
have an explicit width that actually stretches to `.pageContainer`'s real
width** — `width: 100%` (or equivalent), not a flex/grid context where it
could shrink-to-fit its own content instead. Concretely: don't give the
measured wrapper `display: flex; flex-direction: column; align-items:
center;` with no `width` set (that's the exact bug that broke the previous
attempt) — either set `width: 100%` explicitly alongside those properties,
or measure a different, definitely-full-width ancestor instead. Whichever
element ends up being the one the hook's ref attaches to, sanity check by
logging/inspecting its measured width once at a normal desktop viewport and
confirming it's close to `.pageContainer`'s own real rendered width, not
some smaller shrink-to-fit value.

Constrain the whole carousel row to stay inside `.pageContainer`'s
left/right edges at every viewport width — same horizontal-padding rule as
every other section on this site.

## Spacing

Match the gap already established between `Bio` and `Experience`
(`About.module.css`'s `.bioSection` `padding-bottom` +
`.experienceSection` `padding-top`) for the gap between `Experience` and
this new section — same approach the previous attempt already got right,
worth carrying forward.

## Verification — don't skip this

Run the dev server, open `/about`, and actually look at both view modes at
a normal desktop width and a narrow mobile width before calling this done.
The previous attempt's core bug (broken carousel geometry) was the kind of
thing a few seconds of visual inspection would have caught immediately —
confirm one item clearly reads as bigger/centered/fully-opaque, its
neighbors are visibly smaller and faded, arrows sit close to the row (not
stranded near the screen edges), and nothing overflows `.pageContainer`.

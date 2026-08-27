# Add a "what's inside?" Carousel/Gallery section to the About page

## Goal

Port `jar-portfolio`'s old Carousel/Gallery toggle (`components/WhatsInside/
Carousel.tsx` + `Gallery.tsx`, from before that repo dropped Carousel and
moved Experience off this section — see `Carousel.tsx`'s and `lib/
experience.ts`'s own comments for that history) into **this** repo as a new
section on the About page (`components/sections/About/`), below the
existing Experience section. This repo's own `About` is already built
(`Bio.tsx` + `Experience.tsx` + `index.tsx` + `About.module.css`) — add a
third piece the same way, not a rewrite of the other two.

This is a deliberate, separate showcase from the homepage's own "what's
inside?" Projects section (`components/sections/Projects/`, with its
work/personal project/hackathon filter toggles) — same project data, same
heading text, different presentation (a scrapbook-style carousel/gallery
flip-through instead of a filterable grid), living on a different page. Not
a redundant rebuild of the homepage section — reuse its pieces where they
overlap (see below), don't copy its filter UI.

## Section content

1. **Heading** — "what's inside?", in this repo's existing heading style for
   this section (see `Projects.module.css`'s `.heading` — same treatment
   `About.module.css`'s own `.heading` already uses for "Hello! I'm Amy" and
   the Work/Community group labels: no Instrument Serif, this repo's normal
   Roboto stack). Add this string to `lib/content.ts` as
   `content.en.about.whatsInside.heading`, not reused from
   `content.en.projects.heading` — same text, its own key, since it's a
   different page's copy.
2. **View toggle** — "carousel" / "gallery", positioned the same way as the
   existing `Playground` plate/collage toggle (`components/sections/
   Playground/index.tsx` + `Playground.module.css`'s `.toggles`) — copy that
   exact single-select `CircleToggle` pattern (a local `viewMode: "carousel"
   | "gallery"` state, two `CircleToggle`s wired to it, only one active at a
   time) rather than `Projects/index.tsx`'s independent multi-select filter
   usage. Reuse the same two colors `Playground` already uses for its own
   view toggle (`--c-red` / `--c-blue`) so this reads as the same "switch
   between two ways of viewing the same content" control, not a new pattern.
   Add the labels to `content.en.about.whatsInside.toggles.{carousel,
   gallery}`, matching how `content.en.playground.toggles` already holds
   that page's own toggle labels. Default: **gallery** (the lower-effort,
   already-mostly-built view — see below).

## Gallery view

A plain grid of `ProjectCard`s (`components/sections/Projects/ProjectCard.tsx`,
already handles cover image vs. autoplay video, title, description, category
dot — no changes needed to that component itself), reusing `lib/projects.ts`'s
`PROJECTS` data directly, **unfiltered** — every project, no
work/personal/hackathon toggle here, no `ExtrasCard`. Build this as a new,
simple grid (2 columns at wider widths per `jar-portfolio`'s own Gallery
proportions, 1 column narrow) local to this section — don't reuse `Projects/
index.tsx`'s `Gallery`-equivalent directly, since that component's reveal/
dim logic is wired to its own filter state, which doesn't exist here.

## Carousel view

Port `jar-portfolio`'s `Carousel.tsx` behavior: a horizontal belt of
`ProjectCard`s with the centered one scaled up and fully opaque, its
immediate neighbors scaled down and partially faded, everything past that
invisible; prev/next arrow buttons (reuse this repo's existing arrow-button
style — `ARROW_BUTTON_CLASS`'s equivalent, wherever this repo already
defines that for the `/playground/[category]` arrows) plus a row of dot
indicators below to jump directly to any project; clicking the centered card
navigates to `/projects/[slug]`, clicking a visible neighbor advances the
belt to center it instead.

- This is a **straight horizontal belt**, not the curved arc `components/
  sections/Playground/arcLayout.ts` already has — that file is specifically
  the `/playground/[category]` arc-detail page's math (see its own top
  comment) and isn't the right fit here. Port `jar-portfolio`'s
  `components/WhatsInside/layout.ts` (`computeLayout`, `NEIGHBOR_SCALE`,
  `useViewportWidth`, `MAX_ITEM_SIZE`) fresh instead, as its own new file
  under `components/sections/About/` (or `lib/`) — this is genuinely
  different layout math from the arc, not a duplicate of it.
- `useCarouselStep` is already ported into this repo's `lib/` (used by the
  `/playground/[category]` page) — reuse that same hook here rather than
  re-porting it a second time.
- Constrain the belt's own width to fit inside `.pageContainer` (same
  horizontal-padding rule as every other section) — `jar-portfolio`'s
  source centers this with a self-owned `width: totalWidth` that can in
  principle exceed its parent; cap it so it never pushes past the
  `pageContainer` edges the rest of the page respects.
- Card content inside each slot is the same `ProjectCard` used in Gallery
  view (not `jar-portfolio`'s separate `ProjectMedia`/`ProjectCardText`
  components, which don't exist in this repo) — wrap it in a sized container
  per slot and apply the scale/opacity/position animation `Carousel.tsx`
  already describes, rather than introducing a second card presentation.

## Spacing

The gap between this new section and the Experience section above it should
match the gap already between the bio section and the Experience section —
i.e., the same combined `padding-bottom`/`padding-top` rhythm
`About.module.css` already sets between `.bioSection` (`padding-bottom:
clamp(32px, 5vw, 60px)`) and `.experienceSection` (`padding-top: clamp(2px,
1vw, 24px)`). Give the new section's own top spacing (and/or adjust
`.experienceSection`'s `padding-bottom`, which currently mirrors its
`padding-top` at the same small clamp) so the visual gap reads as identical
to the one above it — check both by eye once built, since the bio→Experience
gap is the taller of `.experienceSection`'s two small paddings plus the
bio's own larger one, not a single token to copy verbatim.

## Acceptance checklist

- [ ] About page now shows, in order: bio, Experience, this new "what's
      inside?" section — all three sharing the same `.pageContainer`
      left/right edges.
- [ ] Toggle switches between Gallery (unfiltered `ProjectCard` grid) and
      Carousel (scaled horizontal belt, arrows + dot indicators) with no
      other content changing.
- [ ] Carousel's centered card links to `/projects/[slug]`; Gallery's cards
      already do via `ProjectCard`'s own `Link`.
- [ ] No Instrument Serif, no unconstrained-width carousel overflowing
      `.pageContainer`.
- [ ] The gap above this new section visually matches the gap between bio
      and Experience.
- [ ] Test at a narrow and wide viewport — Carousel's belt/arrows/dots and
      Gallery's grid both need to reflow, not just work at one size.

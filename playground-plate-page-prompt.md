# Build the "What's on my plate?" page at /playground

## Goal

Port the "What's on my plate?" page from `jar-portfolio` (source repo, already
built at `app/etc/page.tsx` + `components/Etc/PlateCircle.tsx` + `lib/etc.ts`)
into **this** repo (`amy's portfolio`) as the real content of `app/playground/page.tsx`,
replacing its current placeholder (`content.en.playground.placeholder`). The
`/playground` route and its Taskbar nav link already exist and work — this is
purely about giving that route real content.

Do **not** copy `jar-portfolio`'s layout 1:1. That version renders a
fixed-width 1277px absolute-positioned "poster" canvas that ignores the
site's padding system and scrolls horizontally on narrow viewports
(`overflow-x-auto`). This site instead uses a shared `--pad` / `--content-max`
contract (`lib/tokens.css`, `.pageContainer` in `app/globals.css`) that every
other section (`Hero`, `Projects`, `about`, `playground`'s own current
placeholder) respects. The plate composition must scale to fit **inside**
`.pageContainer` at every viewport width — same left/right edges as
everywhere else on the site, never wider, never triggering its own
horizontal scrollbar. `jar-portfolio`'s own `app/etc/[category]/page.tsx`
already contains the exact technique to reuse for this: it designs the whole
composition at one fixed pixel size, measures the real available box via
`useElementSize`, and applies a single `transform: scale()` (capped by a
`MAX_SCALE`) to fit it — do the same thing here instead of a raw fixed-width
canvas with overflow scroll.

Assets are already in this repo — nothing to copy from `jar-portfolio`'s
`public/`:
- `public/images/drawings/plate-drawing.png`, `plate-dance.png`,
  `plate-nails.png`, `plate-me.png`
- `public/images/etc/drawing1-4`, `dance1,3,4,5,6,7`, `nails1-5`,
  `me-framed.webp`

## Page structure (top to bottom)

1. **Title** — "what's on my plate?" — same title styling as "amy wang's
   jar" on the homepage. That's `Hero.module.css`'s `.title`: `font-size:
   var(--fs-title)`, `font-weight: 300`, `color: #000` (font-family is just
   the inherited site body font, Roboto — `jar-portfolio`'s version uses a
   custom "Singsong" script font that doesn't exist in this repo, don't
   introduce it). Lowercase, matching the reference screenshot and the
   homepage title's own lowercase convention.
2. **Caption** — "click into the plate to see more!" directly under the
   title, styled like `Hero.module.css`'s `.tagline`: `font-size:
   clamp(15px, 1.48vw, 23px)`, `font-weight: 300`, `color: rgba(0,0,0,0.8)`.
3. **View toggle** — "plate view" / "collage view", positioned to the right,
   aligned with the caption's baseline (see reference screenshot: title+caption
   sit left, the two toggle labels sit right, roughly vertically centered on
   the caption line). Reuse `components/ui/CircleToggle` (already used by
   `Projects/index.tsx` for its filter pills) for the visual style — colored
   ring, filled when active, label text at `var(--fs-small)`. **Difference
   from `Projects`' usage**: those toggles are independent multi-select
   filters; this pair must be a single-select pair (radio-like — exactly one
   of "plate" / "collage" active at a time, clicking the inactive one
   switches). Either extend `CircleToggle` to support this pattern via a
   simple local `viewMode: "plate" | "collage"` state on the page and two
   `CircleToggle`s wired to it, or add a small wrapper — whichever keeps
   `CircleToggle` itself unchanged for its existing `Projects` usage. Pick
   two of the existing token colors (`--c-red`, `--c-blue` — matches the
   reference screenshot's red-filled / blue-outline dot) for the two circles.
   Default: **plate view**.

## Plate view (default)

Structurally this is `jar-portfolio`'s existing `app/etc/page.tsx` content
(the `GALLERY` array of categories, each a plate + a loosely-scattered
cluster of that category's photos, stacked top-to-bottom, alternating
left/right) — port the `GALLERY` data, `PlateCircle` component, and the
positioning/stagger-animation logic, but:
- Categories: **Drawing, Nails, Dancing** (skip `content`/"Me" — no photos
  for it yet).
- **Nails gets a photo cluster too**, unlike the source `GALLERY` (which
  leaves Nails as a bare plate with an empty `photos: []`). Nails already has
  5 photos in `ETC_PHOTOS.nails` (`nails1-5.jpg`) that just aren't plotted
  into `GALLERY`'s scatter — pull in nails1–5 (the source only left nails2-5
  half-positioned in commented-out code, so treat this as a fresh
  placement, not an existing layout to copy) and give Nails the same kind of
  loosely-overlapping cluster the other two categories have, sized/positioned
  by eye to look intentional next to its plate — doesn't need to match any
  exact reference pixel-for-pixel, just consistent with Drawing/Dancing's
  density and overlap style.
- Drive the whole composition's size off one fixed design width/height (same
  idea as `STAGE_WIDTH`/`computeStageHeight` in the source file), then scale
  it into whatever `.pageContainer` actually measures, as described above —
  not a hardcoded 1277px canvas with independent overflow scroll.
- **Plates are links to a detail page** — see "Click-into-plate detail page"
  below. Each plate keeps the source's hover treatment (label text tints to
  `#2460A4` on hover, via a `group`/`group-hover` wrapper) as the affordance
  that it's clickable.
- Keep the scroll-reveal (`whileInView`) slide-up entrance for each
  plate+cluster.

## Collage view

New layout, not present in `jar-portfolio` yet — build from the second
reference screenshot: every photo from every category, laid out as one dense
photo-wall collage (small gaps, slight size variation, no visible plates),
each photo with its own caption directly underneath in a small caption style
(`font-size: var(--fs-small)`, `font-weight: 300`, `color:
rgba(0,0,0,0.6)`) — reuse each photo's existing `caption` string from the
source data (`ETC_PHOTOS` in `jar-portfolio`'s `lib/etc.ts`). Arrange as a
responsive grid/masonry (CSS grid or flex-wrap, photos sized to their own
aspect ratio) that fills the same `.pageContainer` width the plate view
scales to — this can be simpler than plate view's absolute-position poster
math; it just needs to look intentionally tiled edge-to-edge like the
reference, not loosely scattered.

## Click-into-plate detail page

Port `jar-portfolio`'s `app/etc/[category]/page.tsx` (the rotating photo-arc
detail view you land on after clicking a plate) as a new route,
`app/playground/[category]/page.tsx`, in this repo. This is the payoff for
the "click into the plate to see more!" caption — right now clicking a plate
in plate view should go somewhere, and this is that somewhere.

- Reuse the source file's whole approach as-is: the plate sits at the bottom
  as a partially-cropped "hub", photos arranged on a curved arc above it that
  rotates as you step through them (prev/next arrow buttons + clicking a
  visible neighbor to center it), the fixed-design-size-then-`scale()`-to-fit
  technique (`deriveLayout`, `useElementSize`, `MAX_SCALE`), and the
  exit/back animation (fade + slide down, navigate only once the animation
  finishes).
- `deriveLayout`/`MAX_ITEM_SIZE`/`useElementSize` come from
  `jar-portfolio`'s `components/WhatsInside/layout.ts` — port whatever subset
  of that this page actually needs (or inline the layout math directly into
  the new page/component) rather than pulling in the whole `WhatsInside`
  module, which is that repo's separate carousel feature.
- `useCarouselStep` (`jar-portfolio`'s `lib/useCarouselStep.ts`) is small and
  self-contained — port it directly into this repo's `lib/`.
- Back navigation: the source page uses a fixed circular arrow button
  (`ARROW_BUTTON_CLASS` from its `lib/styles.ts`) pinned top-left. This repo
  already has its own back-button convention instead — a text "← Back"
  link/button using `router.back()` (see
  `components/case-studies/CaseStudyKit.tsx`'s sidebar Back button for the
  pattern) — match that existing style instead of introducing the source
  repo's circular-arrow button treatment, so the two "back" affordances on
  this site stay visually consistent. It should return to `/playground`
  (defaulting to plate view — no need to remember which view mode the user
  left from).
- Category data: reuse whatever `EtcCategorySlug` / `PLATE_IMAGES` /
  `ETC_PHOTOS`-equivalent structure you set up for the plate/collage view
  above (drawing, nails, dancing) — this detail page and the overview page
  should read from one shared source of category+photo data in this repo,
  not two separately maintained copies.
- Category title styling: same `.title`-equivalent treatment as the overview
  page's own "what's on my plate?" heading, just showing the category label
  ("Drawing" / "Nails" / "Dancing") instead.
- Router prefetching (`router.prefetch` for each category route on the
  overview page's mount) is worth keeping — it's what makes the click feel
  instant instead of compiling the route on first click.
- The empty-state branch (`photoCount === 0`, "Coming soon.") won't be
  needed here since all three ported categories now have photos (see the
  Nails cluster addition above) — fine to leave the branch in for
  robustness, or drop it, either is reasonable.

## View-switch animation

"the images should look like they're coming from the plates and lining up
while the plate disappears" (plate → collage), and the reverse on switching
back. The clean way to get this for free: give every photo a stable
`framer-motion` **`layoutId`** keyed by its `src`, shared between both
view's JSX (both views render the same photo elements, just in different
positions/sizes — conditionally show one arrangement's set of extra chrome
per view, e.g. plate view's clusters vs. collage view's grid wrapper).
Framer Motion's shared-layout animation (`layout` + matching `layoutId`,
wrapped in `<AnimatePresence>` / `LayoutGroup` as needed) automatically
tweens each photo from its plate-view position/size to its collage-view
position/size (and back) — no manual FLIP math needed. Fade the plate
circles out (`AnimatePresence` + opacity/scale) as photos leave their
cluster, and fade them back in when returning to plate view. `framer-motion`
is already a dependency (`^12.43.0`), same as `lucide-react` if any icons
are needed.

## Acceptance checklist

- [ ] `/playground` (already linked from the Taskbar on every non-home page)
      renders this page instead of the placeholder text.
- [ ] Title + caption + toggle match the reference screenshot's typography
      and use this repo's existing tokens/components, not new ad-hoc styles
      or `jar-portfolio`'s Singsong font.
- [ ] The whole page's content — in both view modes, at every viewport
      width — stays within the same `.pageContainer` left/right edges as
      the rest of the site (no independent horizontal scrollbar, no
      wider-than-content-max poster).
- [ ] Plate view defaults on load; toggling to collage view animates photos
      out of their plate clusters into the grid while plates fade away;
      toggling back reverses it.
- [ ] Collage view's photos each show their caption underneath and tile
      edge-to-edge with no obvious gaps/overlaps, matching the second
      reference screenshot.
- [ ] Nails shows a photo cluster next to its plate in plate view, not just
      a bare plate.
- [ ] Clicking any of the three plates in plate view navigates to
      `/playground/[category]` and shows that category's own rotating
      photo-arc detail view; the Back control returns to `/playground`.
- [ ] Taskbar and Footer render normally above/below this content (already
      handled by `app/layout.tsx` — don't duplicate them in the page itself).
- [ ] Test at a few widths (narrow mobile, ~1280px reference width, and a
      wide desktop past `--content-max`) since both views need to reflow
      rather than just working at one size.

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
- Categories: **Drawing, Nails, Dancing** only (skip `content`/"Me" — no
  photos for it yet, matches this repo's own `lib/etc.ts`-equivalent data
  if you create one, or just the categories actually in scope per the
  reference screenshots).
- Nails currently has no photos in the cluster in the reference screenshot
  (just the bare plate) — keep it that way; don't force nails4/5 into the
  scatter if that's not what's shown, but check with Amy if the intent was
  ever to add a few nails photos to this view too.
- Drive the whole composition's size off one fixed design width/height (same
  idea as `STAGE_WIDTH`/`computeStageHeight` in the source file), then scale
  it into whatever `.pageContainer` actually measures, as described above —
  not a hardcoded 1277px canvas with independent overflow scroll.
- Plates are NOT links to a detail page for this build (no `/etc/[category]`
  equivalent route exists yet in this repo) — render them as plain
  non-interactive `PlateCircle`s for now. Flag to Amy separately whether she
  wants the click-through detail carousel ported too (jar-portfolio's
  `app/etc/[category]/page.tsx` has a full working version) — that's a
  distinct follow-up, not part of this page.
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
- [ ] Taskbar and Footer render normally above/below this content (already
      handled by `app/layout.tsx` — don't duplicate them in the page itself).
- [ ] Test at a few widths (narrow mobile, ~1280px reference width, and a
      wide desktop past `--content-max`) since both views need to reflow
      rather than just working at one size.

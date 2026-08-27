# Fix the About page's "what's inside?" Carousel — broken layout

## What's wrong

The Carousel view at `/about` (`components/sections/About/Carousel.tsx`)
currently renders broken: a large empty gap between the toggle and the item
row, the two visible item images sitting far apart from oversized arrow-to-
image gutters (arrows pinned near the page's outer edges instead of close to
the track), no single item reading as the clearly bigger/fully-opaque
"centered" one the way the source design does, and the centered item's star
badge floating disconnected with no image visibly under it. This does not
match how the carousel looked in the original `amy-wangs-jar` source this
was ported from — this is a bug in the port, not a design change to make.

**The Gallery view is not reported broken** — leave it alone except for a
quick visual sanity check once the Carousel fix is in, since both views
share `WhatsInside.tsx`, `whatsInsideLayout.ts`, and the star badge.

## Root cause (verify, then fix)

`components/sections/About/About.module.css`'s `.carouselWrap` — the
element `Carousel.tsx` measures via `useElementWidth` (`wrapRef`) to solve
the whole layout against — has no explicit `width`:

```css
.carouselWrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
}
```

`align-items: center` on a flex column makes the flex item shrink-to-fit
its content's own max intrinsic width instead of stretching to fill its
parent (`.pageContainer`). Its own child, `.carouselRow`, is `width: 100%`
— but 100% of an undetermined, content-shrunk parent width is a circular
sizing situation, not "100% of `.pageContainer`" the way the comments in
`whatsInsideLayout.ts` and `Carousel.tsx` assume. Since `useElementWidth`'s
`ResizeObserver` is watching `.carouselWrap` itself, it's very likely
measuring an unstable or wrong value (possibly ping-ponging as content
inside resizes it, possibly just measuring far smaller or larger than
`.pageContainer`'s real width) — which would produce exactly this kind of
visibly broken, inconsistent geometry.

Fix by making `.carouselWrap` actually stretch to the width `computeLayout`
is meant to be solving against:
- Add `width: 100%;` to `.carouselWrap` (and confirm nothing above it in the
  DOM — the `pageContainer` div, `WhatsInside.tsx`'s markup — is itself
  shrink-wrapped in a way that would leave `.carouselWrap` still measuring
  something other than the real available `.pageContainer` width).
- Double check `align-items: center` isn't still fighting that `width: 100%`
  once added (it shouldn't — `align-items` only affects cross-axis sizing
  when no explicit main/inline size is set, but confirm visually).

After that fix, verify `useElementWidth`'s measured `containerWidth` is
stable (doesn't change between renders once settled) and that
`computeLayout(containerWidth)` in `whatsInsideLayout.ts` produces an
`itemSize` that looks right relative to `.pageContainer`'s own real pixel
width at a normal desktop viewport (roughly: `MAX_ITEM_SIZE` — 352px —
should only be hit on a wide viewport where the solved-for size would
otherwise exceed it; a typical laptop width should land somewhat below
that).

## What "fixed" should look like

Compare directly against this behavior, which the code already correctly
describes but currently doesn't render:
- One item — the centered one — visibly larger (`CENTER_SCALE`, 1.3x) and
  fully opaque; its two immediate neighbors smaller (`NEIGHBOR_SCALE`,
  0.72x) and partly faded (opacity 0.55); everything past that invisible.
- The star badge sits anchored on the centered item's own image, top-right
  corner of its box — not floating alone with nothing visible beneath it.
- Arrow buttons sit close to the track with the same gutter spacing between
  arrow→neighbor and neighbor→center (`spacing`/`gap` from
  `computeLayout`), not stranded out near the page's outer edges.
- No large dead vertical space between the toggle header and the item row
  beyond the deliberate `STAR_HEADROOM_PX`/`TRACK_HEIGHT_RATIO` allowance.
- The whole row still stays within `.pageContainer`'s left/right edges at
  every viewport width — **don't** reintroduce the original bug this port
  was already fixed for (raw-viewport-width sizing that overflowed the
  page's padding). `whatsInsideLayout.ts`'s solve-against-measured-
  container-width approach is correct and should stay; only the *measured
  element's own CSS* needs fixing so that measurement is actually right.

## Verification

Run the dev server, open `/about`, switch to Carousel view, and visually
confirm the row now looks like the description above at both a normal
desktop width and a narrow mobile width — the previous broken state
apparently shipped without this check, so don't skip it this time.

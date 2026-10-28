# Design system (home page, rebrand v2)

The source of truth for how the site looks. Amy edits this file; code follows it. When a value here and the code disagree, this file wins: change the code to match.

Values are at the 1536×696 laptop size (the biggest the site gets).

## Type

| Token | Value |
|---|---|
| Font | Geist |
| Letter spacing | -0.6px |
| Name size | 24px, line-height 1.15 |
| Body size (everything else) | 14px, line-height 1.45 |
| Heading weight (Experience, Works, About, Play) | 500 |
| jar/work toggle weight | 400 |
| Body weight (intro, list items) | 300 |

## Colour

| Token | Value |
|---|---|
| Text | #000 |
| Intro text | 75% black |
| Case-study description | 55% black |
| Hover circle | 45% black |
| Inactive mode button (jar/work) | 40% black (70% on hover) |
| Divider line | #000 |
| Background | #fff |

## Layout

| Token | Value |
|---|---|
| Frame | min(100vw, 1536px) wide, 100dvh tall, centred, no outer padding |
| Sidebar width | clamp(260px, 20vw, 320px) (~307px) |
| Divider | hand-drawn black line, 0.6px (the jar's ink weight), gently wobbling up to ~1.4px either side of straight, buzzing; inset 16px from the top and bottom of the screen (a plain 1px rule on mobile) |
| Sidebar padding, left/right | 32px |
| Sidebar padding, top/bottom | 48px (the divider starts 32px above the name) |
| Mobile breakpoint | below 768px the sidebar stacks above the stage |

## Sidebar spacing (top to bottom)

| Between | Value |
|---|---|
| Name → intro | 14px |
| Intro → icons → Experience | 22px each |
| Icon → icon | 4px (each icon in a 24px box) |
| Heading → its chevron | 4px |
| Heading → first item, item → item | 4px |
| Experience list → Works | 40px |
| Works → About → Play (incl. last case study → About) | 8px |
| Play → jar/work toggle | fills the leftover space, at least 16px |
| jar ↔ work | 16px |

## Components

- **Icons:** X, LinkedIn, mail. Plain black, ~18–20px, no border.
- **Headings with a dropdown** (Experience, Works): text + chevron (14px). Start open. Closed points down, open points up.
- **List items:** same left edge as the heading, no indent, no dash.
- **Case-study row:** the name, then " - description" in full whenever Works is open, wrapping onto extra lines under the name.
- **Works hover isolate:** hovering (or focusing) a case-study row lifts its jar item 12px and scales it to 1.04, above the pile, and dims every other item (`--dim-white`). In work mode its grid tile lifts 6px and the other tiles dim. Extras has no jar item, so it does nothing in the jar.
- **Hover circle:** hand-drawn wiggly oval, drawn on like a pen when hovering a heading, un-drawn on leave. 16px past the word left/right, 8px above/below.

## Hand-drawn lines

- Every code-drawn line (divider, hover circles, later underlines and outlines) comes from `lib/wobbly.ts` and is drawn with `BuzzPath`.
- **Line weight:** 0.6px (`LINE_STROKE_WIDTH`), matching the jar drawing's ink.
- **Buzz: currently OFF** (`BUZZ_ENABLED = false` in `lib/motion.ts`); lines hold still on their first drawing until Amy retunes it. When on: 3 frames of the *same* drawing, like tracing over one line again by hand: frames 2 and 3 stray at most ~0.3px from frame 1. Shown in turn 1 → 2 → 3 at 10 per second (`BUZZ_FPS`). Held still under reduced motion and when the tab is hidden.
- **Pen reveal:** lines draw on with `pathLength` 0 → 1.

## Work mode (stage)

- **Padding:** 48px (heading lines up with the name across the divider); 24px 16px on mobile.
- **Heading** "what's inside?": 24px, weight 400 (22px on mobile).
- **Filters:** the circle toggles (work / personal project / hackathon), 14px from the heading, 20px apart.
- **Grid:** 32px below the filters; 4 across with 24px column / 32px row gaps (2 across once the stage is under 720px wide).
- **Tile:** 3:2 cover, 8px corners; 10px gap to the caption. Caption: title 14px weight 400 black, year 14px weight 300 at 55% black, on one line.
- **Filtered-out tile:** white wash over the cover (`--dim-white`, 44%) and caption at 45% opacity.

## Motion

| Token | Value |
|---|---|
| Hover circle draw | 350ms ease-out |
| Chevron turn | 200ms, 180° |
| Dropdown open | 280ms ease-out; items fade down from 6px above, 35ms apart |
| Dropdown close | 180ms ease-in, all at once |
| Buzz | 10 drawings per second, cycling 3 |
| Stop-motion moves (intro, jar) | 12 fps |
| Easing | out [0.22, 1, 0.36, 1]; in [0.55, 0, 1, 0.45]; in-out [0.65, 0, 0.35, 1] |
| Grid tiles in | each 300ms ease-out: rise 12px, scale 0.97 → 1, fade in; 40ms apart, top left first |
| Grid reorder (filters) | tiles slide to new places, 350ms ease-out |
| Leaving work mode | heading + grid slide up 12px and fade out together, 200ms ease-in; then the jar shows |
| Works hover lift | in 250ms ease-out, back 200ms ease-in |
| Reduced motion | no animation, things just appear  |

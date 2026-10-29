# Design system (home page, rebrand v2)

The source of truth for how the site looks. Amy edits this file; code follows it. When a value here and the code disagree, this file wins: change the code to match.

Values are given at the 1536×696 laptop size. Layout spacing scales with the window (see Layout); type sizes don't.

## Type

| Token | Value |
|---|---|
| Font | Geist |
| Letter spacing | -0.6px |
| Size | 14px everywhere in the sidebar, line-height 1.45 (no separate large name) |
| Medium (500) | the intro paragraph, group headings (Works, Extra, Experience) |
| Light (300) | menu items |
| jar/work toggle weight | 400 |

## Colour

| Token | Value |
|---|---|
| Text | #000 |
| Case-study description | 55% black |
| Hover circle | 45% black |
| jar / work toggle | jar red `--c-red`, work blue `--c-blue` |
| Divider line | #000 |
| Background | #fff |

## Layout

Horizontal spacing scales with the window's width (vw), vertical spacing with its height (dvh), each clamped; the middle term lands exactly on the 1536×696 value.

| Token | Value |
|---|---|
| Frame | full window width, 100dvh tall, no outer padding; the sidebar is always flush with the window's left edge |
| Sidebar width | `clamp(300px, 20vw, 380px)` (307px @1536) |
| Divider | hand-drawn black line, 0.6px (the jar's ink weight), gently wobbling up to ~1.4px either side of straight, buzzing; inset `clamp(8px, 2.3dvh, 28px)` (16px @696) from the top and bottom of the screen (a plain 1px rule on mobile) |
| Sidebar padding, left/right | `clamp(20px, 2.083vw, 56px)` (32px @1536) |
| Sidebar padding, top/bottom | `clamp(24px, 6.9dvh, 80px)` (48px @696; the divider starts 32px above the name there) |
| Mobile breakpoint | below 768px the sidebar stacks above the stage |

## Sidebar spacing (top to bottom)

Everything flows from the top with fixed gaps; opening a group pushes what's below it down.

| Between | Value |
|---|---|
| Icon → icon | 4px (each icon in a 24px box; the X lines up with the text's left edge) |
| Icons → intro, intro → menu | `clamp(24px, 6.9dvh, 96px)` each (48px @696) |
| Group → group (Works → Extra → Experience) | 14px |
| Heading → first item, item → item | 4px |
| On windows under 660px tall | the two big gaps tighten to 4.5dvh |
| Mobile | the two big gaps are 24px |

## Components

Sidebar, top to bottom:

1. **Social icons:** X, LinkedIn, mail. Plain black, ~18–20px, no border.
2. **Intro:** one paragraph, the name then the description ("Amy Wang is a designer who…"), medium weight, black.
3. **Menu:** three groups, all on one left edge, each a dropdown:
   - **Works:** each case study as its name then " - description" in full (55% black), wrapping onto extra lines under the name.
   - **Extra:** About Me (/about), Play (/playground).
   - **Experience:** Design @ Blueprint, Campus @ Notion, Management Eng @ Waterloo (plain text).

- **Dropdown headings** (Works, Extra, Experience): text + chevron (14px). On load only Experience is open; Works and Extra start closed. Closed points down, open points up.
- **Hover circle:** hand-drawn wiggly oval drawn on like a pen when hovering a heading (Works, Extra, Experience), un-drawn on leave. 16px past the word left/right, 8px above/below.
- **Item links** (case studies, About Me, Play) fade to 55% black on hover.
- **Works hover isolate:** hovering (or focusing) a case study lifts its jar item 12px and scales it to 1.04 (staying at its own layer in the pile), and dims every other item (`--dim-white`). In work mode its grid tile lifts 6px and the other tiles dim. Extras has no jar item, so it does nothing in the jar.
- **jar / work toggle:** not in the sidebar — top right of the stage, `--pad-y` from both the top and the right edge (16px on mobile), two plain labels side by side, 20px apart. Labels are 14px, grey (45% black) until hovered or selected, then black. The **selected** one has a hand-drawn **squiggly underline** in its colour — **jar red** (`--c-red`), **work blue** (`--c-blue`) — drawn on when you click it (the old one un-draws). **Hover** on the unselected one: its squiggle previews faintly (35% opacity) and the label darkens.

## Hand-drawn lines

- Every code-drawn line (the divider, the hover circles, later underlines and outlines) comes from `lib/wobbly.ts` and is drawn with `BuzzPath`.
- **Line weight:** 0.6px (`LINE_STROKE_WIDTH`), matching the jar drawing's ink.
- **Buzz: currently OFF** (`BUZZ_ENABLED = false` in `lib/motion.ts`); lines hold still on their first drawing until Amy retunes it. When on: 3 frames of the *same* drawing, like tracing over one line again by hand: frames 2 and 3 stray at most ~0.3px from frame 1. Shown in turn 1 → 2 → 3 at 10 per second (`BUZZ_FPS`). Held still under reduced motion and when the tab is hidden.
- **Pen reveal:** lines draw on with `pathLength` 0 → 1.

## Work mode (stage)

- **Padding:** top/bottom same as the sidebar's (`clamp(24px, 6.9dvh, 80px)`, so the heading lines up with the name across the divider); left/right `clamp(24px, 3.125vw, 80px)` (48px @1536); 24px 16px on mobile.
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
| Stop-motion moves | 12 fps — currently only for the intro; the jar's moves run smooth (`JAR_MOVES_STOP_MOTION = false`) |
| Easing | out [0.22, 1, 0.36, 1]; in [0.55, 0, 1, 0.45]; in-out [0.65, 0, 0.35, 1] |
| Grid tiles in | each 300ms ease-out: rise 12px, scale 0.97 → 1, fade in; 40ms apart, top left first |
| Grid reorder (filters) | tiles slide to new places, 350ms ease-out |
| Leaving work mode | heading + grid slide up 12px and fade out together, 200ms ease-in; then the jar shows |
| Works hover lift | in 250ms ease-out, back 200ms ease-in |
| Jar → work | jar lifts 10px + squashes to scaleY 0.96 (120ms), then drops out of the stage (380ms ease-in), smooth; items get kicked up and knock around inside; clink sound on the click. Work only starts coming in once the jar has gone. |
| "what's inside?" arriving | after the jar has gone: drops 48px from above with a small overshoot, 450ms, while the grid sweeps in |
| Work → jar | grid leaves (200ms), then the jar drops in from above (420ms ease-in) and lands with a squash (scaleX 1.04, scaleY 0.92) springing back (360ms), smooth; then the items fall in |
| jar / work toggle | selected label's squiggle draws on 300ms ease-out (old one un-draws); hover preview draws on in 150ms |
| Reduced motion | no animation, things just appear; mode switches are plain 200ms fades, no sound |

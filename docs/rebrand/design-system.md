# Design system (home page, rebrand v2)

The source of truth for how the site looks. Amy edits this file; code follows it. When a value here and the code disagree, this file wins: change the code to match.

Values are given at the 1536×696 laptop size. Layout spacing scales with the window (see Layout); type sizes don't.

## Type

| Token | Value |
|---|---|
| Font | Geist |
| Annotation hand (doodle labels only) | Gaegu Light (300), 19px, +0.02em tracking — a thin, monoline, separate-letter handwriting like a café menu board. Only the "scroll down!" label uses it |
| Letter spacing | -0.6px |
| Size | 14px everywhere in the sidebar, line-height 1.45 (no separate large name) |
| Medium (500) | the intro paragraph, group headings (Experience, Works, Extra) |
| Light (300) | menu items |
| mobile tap cue weight | 400 |

## Colour

| Token | Value |
|---|---|
| Text | #000 |
| Works arrow (↗) | 55% black |
| Hover circle | 45% black |
| Mobile tap cue | 45% black, black on hover |
| Divider line | #000 |
| Background | #fff |

## Layout

Horizontal spacing scales with the window's width (vw), vertical spacing with its height (dvh), each clamped; the middle term lands exactly on the 1536×696 value.

| Token | Value |
|---|---|
| Frame | full window width, 100dvh tall, no outer padding; the sidebar is always flush with the window's left edge |
| Sidebar width | 373px on every desktop window — just wide enough (~6px slack) for the intro's longest line to fit between the paddings. Bigger screens give all their extra width to the stage |
| Divider | hand-drawn black line, 0.6px (the jar's ink weight), gently wobbling up to ~1.4px either side of straight, buzzing; inset `clamp(8px, 2.3dvh, 28px)` (16px @696) from the top and bottom of the screen (a plain 1px rule on mobile) |
| Sidebar padding, left/right | `clamp(18px, 1.823vw, 28px)` (28px @1536, and no wider on bigger screens) |
| Sidebar padding, top/bottom | `clamp(24px, 6.9dvh, 80px)` (48px @696; the divider starts 32px above the name there) |
| Mobile breakpoint | below 768px the sidebar stacks above the stage |

## Sidebar spacing (top to bottom)

Everything flows from the top with fixed gaps; opening a group pushes what's below it down.

| Between | Value |
|---|---|
| Icon → icon | 4px (each icon in a 24px box; the X lines up with the text's left edge) |
| Icons → intro, intro → menu | `clamp(24px, 6.9dvh, 96px)` each (48px @696) |
| Group → group (Experience → Works → Extra) | 14px |
| Heading → first item, item → item | 4px |
| On windows under 660px tall | the two big gaps tighten to 4.5dvh |
| Mobile | the two big gaps are 24px |

## Components

Sidebar, top to bottom:

1. **Social icons:** X, LinkedIn, mail. Plain black, ~18–20px, no border.
2. **Intro:** one paragraph, the name then the description, medium weight, black. On desktop it breaks onto exactly three lines: "Amy Wang is a designer who builds as the / user. She adds creativity to intuitive experiences / and loves to overthink interactions!" On mobile it wraps naturally.
3. **Menu:** three groups, all on one left edge, each a dropdown:
   - **Experience:** Design @ Blueprint, Campus @ Notion, Management Eng @ Waterloo (plain text).
   - **Works:** each case study as its name then a small hand-drawn ↗ (9px, 1px pen line, low wobble, 55% black), 4px after it. No description. Hovering the row (name, arrow or anywhere on it) only turns the arrow 45° to point straight right (→): the text doesn't change colour. (About Me / Play under Extra, which have no arrow, still grey to 55% on hover.)
   - **Extra:** About Me (/about), Play (/playground).

- **Dropdown headings** (Experience, Works, Extra): text + chevron (14px). On load Experience and Works are open; Extra starts closed. Closed points down, open points up.
- **Hover circle:** hand-drawn wiggly oval drawn on like a pen when hovering a heading (Experience, Works, Extra), un-drawn on leave. 16px past the word left/right, 8px above/below.
- **Item links** (case studies, About Me, Play) fade to 55% black on hover.
- **Works hover isolate:** hovering (or focusing) a case study lifts its jar item 12px and scales it to 1.04 (rising over 400ms, soft ease-out; settling back over 300ms, ease-in-out), staying at its own layer in the pile. Nothing else in the jar changes — no dimming of the other items, no see-through. In work mode its card lifts 6px and the other cards dim. Extras has no jar item, so it does nothing in the jar.
- **Switching modes: scroll, no toggle, one way each.** On the desktop layout, scrolling down on the jar (wheel, trackpad, a swipe up on a touch screen, ↓ / PageDown / Space) goes to the work. On the work, scrolling moves the list; scrolling up from its top (↑ / PageUp / Shift+Space) goes back to the jar. Scrolling up on the jar, or down at the bottom of the work, does nothing. Scrolling over the sidebar never switches. One gesture switches once: 50px of travel switches, then switching is locked until the transition is done plus 300ms; the rest of that gesture (a trackpad's inertial tail) and any wheel input during the lock is swallowed, and a gesture that scrolled the list can't also switch. (The crayon segmented toggle, ModeToggle.tsx, is kept in the repo but not shown.)
- **Annotation ("scroll down!" doodle, desktop only):** a little menu-board-style doodle just right of the jar, at about half its height: "scroll down!" in lowercase in the annotation hand (Gaegu Light, 19px, black) over a thin hand-drawn curly arrow (one loop, then down to an open arrowhead), in the jar's ink (~0.6px at 1536, scaling with the jar). Placed and sized in % of the jar, so it scales with the stage; it moves with the jar. Also a button: clicking it goes to the work.
- **Mobile tap cues:** on mobile the page scrolls normally, so scrolling doesn't switch: two small tap buttons do — "work" (12px, weight 400) over a hand-drawn down chevron (16×9px, 1px pen line, low wobble), bottom centre of the jar, 12px up; and an up chevron over "jar", top right of the grid (12px down, 16px in), clear of the heading. 45% black, black on hover, 2px black focus outline.

## Hand-drawn lines

- Every code-drawn line (the divider, the hover circles, later underlines and outlines) comes from `lib/wobbly.ts` and is drawn with `BuzzPath`.
- **Line weight:** 0.6px (`LINE_STROKE_WIDTH`), matching the jar drawing's ink.
- **Buzz: currently OFF** (`BUZZ_ENABLED = false` in `lib/motion.ts`); lines hold still on their first drawing until Amy retunes it. When on: 3 frames of the *same* drawing, like tracing over one line again by hand: frames 2 and 3 stray at most ~0.3px from frame 1. Shown in turn 1 → 2 → 3 at 10 per second (`BUZZ_FPS`). Held still under reduced motion and when the tab is hidden.
- **Pen reveal:** lines draw on with `pathLength` 0 → 1.

## Work mode (stage)

- **Padding:** top/bottom same as the sidebar's (`clamp(24px, 6.9dvh, 80px)`, so the heading lines up with the name across the divider); left/right `clamp(21px, 2.734vw, 70px)` (42px @1536); 24px 16px on mobile.
- **Heading** "what's inside?": 24px, weight 400 (22px on mobile).
- **Grid:** 32px below the heading (no filters): two equal columns, 24px apart, 32px between rows — every case study the same size, in the sidebar's order (CyberSea, Spotify Guessr, SkinSprout). Tucked into the bottom-right corner under the cards, just above the footer strip, smaller (90px wide): the "jump to jar" annotation (an up-pointing curly arrow over the label, same doodle style as "scroll down!"), which goes back to the jar; it draws on when it scrolls into view. One column under a 720px-wide stage. No extras on the home page for now (they're all on the Play page). The 2/3 + 1/3 split (bigger projects big on the left, `small` ones and `teaser` extras small on the right, "jump to jar" at the bottom of the right column) is still built in: `WORK_LAYOUT = "split"` in Home/WorkGrid.tsx. The work view scrolls inside the stage (thin, faint scrollbar). 48px below the cards: the footer strip (below).
- **Tile:** 3:2 cover, 8px corners, a 1px light grey border (`rgba(0, 0, 0, 0.12)`, the original case-study cards' own, so pale thumbnails and white video frames keep an edge); 10px gap to the caption. Caption: title 14px weight 400 black, year 14px weight 300 at 55% black, on one line. A case study with a video plays it over the cover once the card is on screen (muted, looped; paused off screen; reduced motion: cover only). Extras' small cards take their media's own shape (portrait posters show whole, not cropped); caption 13px, no year, the name may wrap.
- **Footer strip:** the end of the work view: a thin black strip (38px tall), the full width of the stage and flush with its bottom, white text 13px weight 300: "designed + built by amy (2026)" on the left and "Linkedin · Email · X / Twitter" on the right. Links get a faint underline on hover. On mobile it stacks, centred.

## Motion

| Token | Value |
|---|---|
| Hover circle draw | 350ms ease-out |
| Chevron turn | 200ms, 180° |
| Works arrow | ↗ turns 45° to → while its row is hovered, 200ms ease-out (same as the chevron); back on leave; reduced motion: instant |
| Dropdown open | 280ms ease-out; items fade down from 6px above, 35ms apart |
| Dropdown close | 180ms ease-in, all at once |
| Buzz | 10 drawings per second, cycling 3 |
| Stop-motion moves | 12 fps — currently only for the intro; the jar's moves run smooth (`JAR_MOVES_STOP_MOTION = false`) |
| Easing | out [0.22, 1, 0.36, 1]; in [0.55, 0, 1, 0.45]; in-out [0.65, 0, 0.35, 1] |
| Grid tiles in | each 300ms ease-out: rise 12px, scale 0.97 → 1, fade in; 40ms apart, top to bottom down the stage across both columns (left first on a tie) |
| Leaving work mode | heading + grid slide up 12px and fade out together, 200ms ease-in; then the jar shows |
| Works hover lift | rise 400ms soft ease-out, settle back 300ms ease-in-out; interruptible, never snaps |
| Jar → work | jar lifts 10px + squashes to scaleY 0.96 (120ms), then drops out of the stage (380ms ease-in), smooth; items get kicked up and knock around inside; clink sound on the click. Work only starts coming in once the jar has gone. |
| "what's inside?" arriving | after the jar has gone: drops 48px from above with a small overshoot, 450ms, while the grid sweeps in |
| Work → jar | grid leaves (200ms), then the jar drops in from above (420ms ease-in). The moment it stops, the items start falling in — no wait, and the replay skips the stretch where they're still above the window, so the first is in the jar ~250ms after landing; they spawn where they always did, so the settled pile (its arrangement and layering) is the original one — while the jar lands with a squash (scaleX 1.04, scaleY 0.92) springing back (360ms), smooth |
| Scroll switch | scrolling down on the jar runs the jar → work move (anticipation lift + squash, drop out, items jostle, clink); scrolling up from the top of the work runs the work → jar move. Mobile's tap cues bob 3px the way they point, every 1.8s, and fade over 400ms as the mode changes; reduced motion: no bob, and the switch is the plain fades |
| Annotation | "scroll down!": while the items fall in (0.2s after they start) the arrow pen-draws on (600ms ease-out, head last) as the label fades in (300ms); switching to work fades it out in 150ms; back on the jar it draws on again. "jump to jar": the same draw-on each time it scrolls into view (60% visible), fading out when it leaves. Reduced motion: they just appear |
| Interrupted switch | every switch can be reversed mid-way. Leaving a jar that hasn't fully arrived (still dropping in, or items not in yet): queued steps are cancelled (no items spawn, no clink) and it skips its exit: it's gone at once and work comes straight in. Calling the jar back while it's leaving: it rises back into place in 250ms. Calling work back while the grid is leaving: the grid returns. |
| Reduced motion | no animation, things just appear; mode switches are plain 200ms fades, no sound |

## Play page: "little design things"

Every extra (lib/extras.ts: posters, logos, little sites) lives in its own section under the Play page's plates, in the page's collage style (the same justified columns, image + caption, 8px gaps, 2px corners): heading "little design things" (Play's caption size, weight 300), section anchor `#extras`, each piece `#extra-<id>`. The old /extras page redirects here (temporary 307, in next.config.ts).

## Sound

One sound: a short glass clink (the first 0.22s of `public/sounds/jar-drop.mp3` from its first sound), decoded once with Web Audio. It plays only when an item hits the jar's glass (floor or wall): each item's first touch as the items fall in (on first load and every return; the recorded fall replays them on the right frames), and up to 3 as the items bounce when the jar is lowered away (within 700ms of the jostle, each item once). Volume follows how hard the hit was (35-100% of 0.8), pitch varies ±8%, and clinks are never closer than 60ms apart. The sound stops the moment the pile settles (the first frame after which nothing moves more than a 1.5px jiggle): contacts from then on, and feather-light touches, are silent, and a clink still ringing fades out in 80ms. Item-on-item contacts, hovering and dragging are silent; so is reduced motion. Browsers allow sound only after a click, tap or key press on the page; until then it's silent.

## Intro

The home page's opening (Home/Intro.tsx; brief: `docs/rebrand/intro-brief.md` v7): a rough, hand-sketched, HeyTea-style loading doodle. One thin line spirals into a circle, is released like a paper ribbon, and ends on the original jar drawing. `INTRO_STYLE` picks the version: `"line"` (current), `"sketch"` or `"overflow"` (v2).

- **Line weight:** the dot's line and both ribbons use the jar drawing's own weight as it shows on screen. That's measured at start from the artwork rendered at its size (its ink spread along its strokes): about 0.57px on a laptop, about the same as the divider's 0.6px. They're never scaled, with round caps and joins.
- **Motion:** the line moves smoothly. The boil changes 12 times a second, cycling 3 versions: 0.5px until the right ribbon lands on the jar, then 0.8px, easing to still over the last 0.3s.
- **Speed:** one timeline, one velocity curve, never stopping. From the dot the pen goes at 600px/s, ±22% with the stroke (quicker going down, slower going up), until it lands on the jar, then picks up to 3000px/s. That keeps it within 64% of its peak the whole way. The left ribbon moves the same way from the instant the loop opens. `?debug=1` logs it.
- **Roughness:** only Amy's own: the loop and ribbons are bent by the wobble measured from her jar strokes (about 0.9px RMS, about 50px wavelength). There's no other added noise.

| Time (1536×696) | What happens |
|---|---|
| 0–0.25s | a small uneven dot at the exact centre of the window |
| 0.25–0.83s | the pen spirals out from the dot, its turns unevenly spaced, into one loose hand loop: slightly elliptical (1.1 × 0.9), tilted 20°, its radius drifting (radius 4.3% of the window height, 22–40px). It doesn't close: it passes about 8px outside its start |
| 0.83s → | without slowing, the pen carries straight on off the top into the right ribbon, with the loop's left half trailing behind it. At the same instant the loop opens at the bottom, and the line before the cut (the spiral and the loop's first part) leaves heading left as the left ribbon. Each floats off on a soft wave (about 15px, decaying) and lands heading the way its drawing goes. The left ribbon runs up the divider from its foot; the right one lands on the jar's right wall level with the centre and traces the original drawing, one pen through its strokes. Each ribbon keeps its own length until it lands, then the line behind it stays |
| ~2.7s | the boil stills and the lines are the page (the original artwork, unmasked, in its own box). The sidebar loads top to bottom (350ms each, 70ms apart, rising 8px), the items fall and "scroll down!" draws |

- **When:** the full version plays once per visit and can't be skipped.
- **Repeat visits and phones:** 0.7s. The divider draws top to bottom while the jar draws along its strokes from the left wall. A click or key skips it.
- **Exits:** a resize mid-intro jumps to the end. There's no intro with reduced motion, on a visit straight to the work (`/#projects`) or on a trip back from a case study.
- **Debug:** `?intro=1` replays the full version, `?intro=2` shows the repeat version, and `?slow=4` slows it.

## Zoom into a case study

Clicking a case study — a work-view card, or its row in the sidebar's Works list (from its jar item in jar mode, or its card in work mode) — zooms into it (components/ui/CaseZoom, in the root layout so it lives across the route change):

1. A copy of the clicked thumbnail (the project's cover) is laid exactly over it — same size, place and rotation — above everything.
2. The home page leaves (350ms): the sidebar column narrows to the case study's 64px rail (ease-in-out) as its parts fade and drop 10px, 30ms apart, top first; the stage fades and drops with them; the "aw" logo fades in in the rail's corner. The divider slides left with the rail.
3. The route changes underneath (no page fade for this arrival); the case study's thumbnail stays hidden while the copy grows from where it was into its exact spot (600ms, ease-in-out, rotation and corners settling), then takes over. The rest of the case study fades in.
4. **Back:** the logo returns home in the mode it was left in: home starts collapsed (rail width, content hidden) and the rail widens back into the sidebar as everything fades back in (400ms).

Phones and reduced motion: a plain page change. Extras and links elsewhere just navigate.

## Case-study page

The frame around every case study (CaseStudyKit.tsx's `CaseStudyLayout`, styles in `CaseStudyLayout.module.css`), full window like home, Geist with -0.6px tracking (the kit's body/heading classes point at Geist on this route):

- **Rail (left, 64px, sticky):** the placeholder logo "aw" (18px, weight 500, black; back home) `--pad-y` from the top, then 40px below it the numbered contents — one number per section ("1." "2." …, 14px, weight 400), 14px apart: the section in view black, the rest 45% black, black on hover; each jumps to its section (the label is its tooltip).
- **Divider:** home's buzzing hand-drawn line, sticky, `--frame-gap` from the top and bottom.
- **Content:** `--pad-y` top, `--stage-pad-x` sides (same tokens as home). Title 32px weight 400 black at the top; 24px below it two columns 48px apart — the hero media as a 3:2 thumbnail on the left (42%), sticky `--pad-y` from the top, and on the right (58%) the subtitle, the meta box, the TL;DR and then every section, scrolling. The writing inside is unchanged.
- **Footer:** the footer strip, 96px below the last section, the full width of the content area. The site's taskbar and big footer aren't shown on case studies.
- **Mobile:** a top bar with the logo (no numbers, no divider), then title, thumbnail (not sticky), and the rest stacked; title 28px.


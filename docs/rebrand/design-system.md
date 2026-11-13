# Design system (home page, rebrand v2)

The source of truth for how the site looks. Amy edits this file; code follows it. When a value here and the code disagree, this file wins: change the code to match.

Values are given at the 1536×696 laptop size. Layout spacing scales with the window (see Layout); type sizes don't.

## Type

| Token | Value |
|---|---|
| Font | Geist |
| Annotation hand (doodle labels only) | Gaegu Light (300), 19px, +0.02em tracking — a thin, monoline, separate-letter handwriting like a café menu board. Only the "scroll down!" label uses it |
| Letter spacing | -0.6px everywhere on the site (body, home, case studies, Play, big titles). The one exception is the hand-drawn doodle label (+0.02em, above) |
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
   - **Experience:** Design @ Blueprint, Campus @ Notion, Management Eng @ Waterloo. Each company name is a link to its site (new tab: uwblueprint.org, notion.com, uwaterloo.ca), black with no underline; its hover is the foil (below). The role stays plain text.
   - **Works:** each case study as its name then a small hand-drawn ↗ (9px, 1px pen line, low wobble, 55% black), 4px after it. No description. Hovering the row (name, arrow or anywhere on it) turns the arrow 45° to point straight right (→), and the name gets the foil (below); the text doesn't otherwise change colour. (About Me / Play under Extra, which have no arrow, get the foil on hover too, with no grey fade.)
   - **Extra:** About Me (/about), Play (/playground).

- **Dropdown headings** (Experience, Works, Extra): text + chevron (14px). On load Experience and Works are open; Extra starts closed. Closed points down, open points up.
- **Hover circle:** hand-drawn wiggly oval drawn on like a pen when hovering a heading (Experience, Works, Extra), un-drawn on leave. 16px past the word left/right, 8px above/below.
- **Foil** (the social icons, the Works names, the Experience company links, About Me and Play, and the footer strip's links; components/ui/Foil): the three icons at the top of the sidebar (X, LinkedIn, mail) each have a fixed, uneven gradient hidden on their black: a soft "blossoming cloud" of colour, not a line of it (`--foil-cloud` in app/globals.css): a raspberry wash (`#e0408a`, the brand colour, from the pinks in the jar) with soft round blobs of yellow `#ffd45c` (upper left), peach `#ffa07a`, pink `#ff8cc0`, lilac `#b38cf0` and blue `#4f8ff0` / `#6fa8f5` (right). Blue and yellow never touch (raspberry, peach and lilac sit between them), each blob fades to its own colour at zero alpha, and it all blends in oklch, so the in-between colours stay bright instead of going muddy. On black (the footer) the same cloud is lifted to light pastels (`--foil-cloud-on-dark`: wash `#ff7eb6`, blobs `#ffe58a`, `#ffbf9e`, `#ffb3d6`, `#d2bcff`, `#8fb8ff`, `#a8cbff`), since the mid-tones read muddy there (at 170% size, so each icon shows only part; which part is seeded per icon). Hovering uncovers it in a soft half circle under the mouse (32px radius, full only at the very centre and fading gradually out: 85% at 30% of the way, 45% at 65%, gone at the edge; centred 1px under the icon's 24px box), so only the icon's black takes the colour and the white around it stays white. On text (links), the gradient is clipped to the letters themselves, so only the letters ever take it, whatever the background; under the half circle the plain text fades out by exactly as much as the gradient fades in, so its colour never fringes the gradient letters. The gradient never moves; only the reveal follows the mouse. It rises in on enter and sinks back on leave. Reduced motion: it jumps straight to the mouse. The headings (Experience, Works, Extra) stay black on hover; they only get the hover circle.
- **Item links** (case studies, company names, About Me, Play) stay black on hover; their hover is the foil.
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
- **Grid:** 32px below the heading (no filters): two equal columns, 24px apart, 32px between rows — every case study the same size, in the sidebar's order (CyberSea, Spotify Guessr, SkinSprout). One column under a 720px-wide stage. No extras on the home page for now (they're all on the Play page). The 2/3 + 1/3 split (bigger projects big on the left, `small` ones and `teaser` extras small on the right, "jump to jar" at the bottom of the right column) is still built in: `WORK_LAYOUT = "split"` in Home/WorkGrid.tsx. The work view scrolls inside the stage (thin, faint scrollbar). 48px below the cards: the footer strip (below).
- **Tile:** 3:2 cover, 2px corners, a 1px very light grey border (`rgba(0, 0, 0, 0.06)`, the original case-study cards' own, so pale thumbnails and white video frames keep an edge). Before the cover loads, each case study's card shows a light tint of its own colour instead of grey (its case study's highlight colour): CyberSea light blue `#e7ecf3`, Spotify Guessr light purple `#efedf5`, SkinSprout light pink `#faf1f6` (`tint` on each project's seed in lib/projects.ts); extras keep the grey `#f4f4f4`; 10px gap to the caption. Caption: title 14px weight 400 black, year 14px weight 300 at 55% black, on one line. A case study with a video plays it over the cover once the card is on screen (muted, looped; paused off screen; reduced motion: cover only). Extras' small cards take their media's own shape (portrait posters show whole, not cropped); caption 13px, no year, the name may wrap.
- **Footer:** the end of the work view and every case study: a black panel half the window tall (`50dvh`), white text 13px weight 300, 24px padding top and bottom. On a case study it's the whole window wide (under the rail too), its text lined up with the content; on home it's at the end of the work list, but the whole window wide too: the work view reaches back under the sidebar, and as the footer scrolls in the sidebar and divider lift up out of its way exactly in step (a scroll-linked animation on the footer's view timeline, run by the browser with the scroll; browsers without it leave the sidebar over the footer's left end). Its text lines up with the sidebar's. Top left: the links stacked (Linkedin, X / Twitter, Email, 8px apart). Bottom left: "Designed + built by Amy (2026)", already filled with the foil cloud (at 200% size); hovering slides the gradient along with the mouse (catching up over 500ms ease-out), easing back on leave. Top right: "back to top", the curly-arrow doodle pointing up (the old "jump to jar", moved here; 90px wide), with a shorter tail after its loop than "scroll down!"; on home it goes back to the jar, on a case study it scrolls to the top. Middle (centred in the whole panel): a carousel of the jar's favourite items, one at a time, each at the same visual size: trimmed to its artwork (its alpha bounding box) and sized so √(width × height) is 150px (the skullpanda's size), within 320 × 180px; the Laneige lip balm at 85% of that, and the rabbit plush turned 85° clockwise (fitted by its turned shape); in a 180px-tall window 360px wide (max 70% of the screen) whose left and right quarters fade to the background, its caption 10px below (12px, 60% white; Amy's words from `content.footer.itemCaptions`, else the item's name in lowercase), and a hand-drawn circle button with a chevron 8px either side of the window (34px, the chevron 20px) to step through them, wrapping round; stepping slides like a carousel: the item slides half the window's width out to one side, fading into the window's soft edge, as the next slides in from the other, over 450ms ease-in-out. Hover: the links get the foil (the caption has no hover); "back to top" and the arrows go from 60% white to full white (150ms). It's simply the last section of the page and scrolls up into view with the rest (no reveal, no torn edge: both were removed on 2026-11-10 for being heavy for what they added). On mobile it stacks, centred: the carousel, the links, back to top, the credit.

## Motion

| Token | Value |
|---|---|
| Hover circle draw | 600ms ease-in-out, the same pace drawing on (hover) and off (leave), like a pen going round |
| Social icon foil reveal | rises in / follows / sinks out, trailing the mouse by 180ms ease-out; reduced motion: instant |
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
| Scroll switch | scrolling down on the jar runs the jar → work move (anticipation lift + squash, drop out, items jostle, clink); scrolling up from the top of the work runs the work → jar move, and it's easy: one small upward flick (24px of travel) does it, even straight after the scroll that opened the work (a flick that reverses the last gesture always counts, and can undo a switch that's still arriving). After scrolling the grid up to its top, a 150ms pause is all the next flick needs. ↑, PageUp, Home and Shift+Space do it too. Mobile's tap cues bob 3px the way they point, every 1.8s, and fade over 400ms as the mode changes; reduced motion: no bob, and the switch is the plain fades |
| Annotation | "scroll down!": while the items fall in (0.2s after they start) the arrow pen-draws on (600ms ease-out, head last) as the label fades in (300ms); switching to work fades it out in 150ms; back on the jar it draws on again. "jump to jar": the same draw-on each time it scrolls into view (60% visible), fading out when it leaves. Reduced motion: they just appear |
| Interrupted switch | every switch can be reversed mid-way. Leaving a jar that hasn't fully arrived (still dropping in, or items not in yet): queued steps are cancelled (no items spawn, no clink) and it skips its exit: it's gone at once and work comes straight in. Calling the jar back while it's leaving: it rises back into place in 250ms. Calling work back while the grid is leaving: the grid returns. |
| Reduced motion | no animation, things just appear; mode switches are plain 200ms fades, no sound |

## Play page: "little design things"

Every extra (lib/extras.ts: posters, logos, little sites) lives in its own section under the Play page's plates, in the page's collage style (the same justified columns, image + caption, 8px gaps, 2px corners): heading "little design things" (Play's caption size, weight 300), section anchor `#extras`, each piece `#extra-<id>`. The old /extras page redirects here (temporary 307, in next.config.ts).

## Sound

One sound: a short glass clink (the first 0.22s of `public/sounds/jar-drop.mp3` from its first sound), cut out once up front (decoded offline, so the page never stalls opening the audio device) and played through plain audio elements. It plays only when an item hits the jar's glass (floor or wall): a fixed run as the items fall in (below), and one as the items bounce when the jar is lowered away (within 700ms of the jostle, each item once). Volume follows how hard the hit was (35-100% of 0.8), pitch varies ±8%, and clinks are never closer than 60ms apart. As the items fall in (on the load-in and every return from the work alike), the clinks don't follow the physics: a fixed run of 8 clinks starts the moment the first item hits the glass and plays the same every time, lasting as long as the items take to land (about 0.9s), softer and further apart as they settle: at 0, 110, 220, 340, 470, 610, 760 and 920ms (strengths 0.9 down to 0.42) (`JAR_LOAD_CLINKS` in lib/motion.ts). The sound stops once the last has rung out (220ms). Contacts after that, and feather-light touches, are silent; a clink still ringing then fades out in 80ms. Item-on-item contacts, hovering and dragging are silent; so is reduced motion. Browsers allow sound only after a click, tap or key press on the page; until then it's silent.

## Intro

The home page's load-in (Home/index.tsx). It's the same on every visit, the first included:

- **The jar:** drops in from above the stage and lands with a squash while the items fall in, exactly like coming back up from the work (the arrival under Motion: drop in 420ms ease-in, land squash 360ms; the items start the moment the jar stops).
- **No pause:** before anything shows, the fall is worked out out of sight (the first time it takes most of a second: decoding the items and computing the fall), so the drop, the items and the landing squash then run in one go, and the sidebar and divider start with the drop.
- **The sidebar:** at the same time, it loads top to bottom (350ms each, 70ms apart, rising 8px), and the divider draws on from top to bottom over 600ms (ease-in-out). "scroll down!" draws once the pile settles, as usual.
- **No load-in:** with reduced motion, on a visit straight to the work (`/#projects`) or on a trip back from a case study.
- **Debug:** `?slow=4` slows it.

The pen-drawn intro (the divider and the jar drawn on by one pen, Home/Intro.tsx) was replaced by this on 2026-11-08; the file is still in the repo but no longer shown. The spiral-and-ribbons intro was removed on 2026-11-05 (it's in git history at 5a22690). `INTRO_STYLE` still has the older "sketch" and "overflow" versions.

## Zoom into a case study

**Off for now:** opening a case study just fades into it (the site's page fade, 0.45s ease-out), and so does going back home. The zoom below is kept for later (`ZOOM_ENABLED` in CaseZoom.tsx).

Clicking a case study — a work-view card, or its row in the sidebar's Works list (from its jar item in jar mode, or its card in work mode) — zooms into it (components/ui/CaseZoom, in the root layout so it lives across the route change):

All at once, the moment it's clicked (docs/rebrand/zoom-brief.md):

1. **Pause:** the page freezes: its animations hold where they are, videos pause, and nothing answers the pointer.
2. **The background fades:** a white scrim fades in over the whole page (300ms, ease-out).
3. **The project grows:** a copy of the clicked thumbnail (the project's cover), laid exactly over it, grows physically bigger from its spot to where the case study's thumbnail will be (worked out from the case-study layout at this window size), 600ms ease-in-out, its rotation and corners easing to the thumbnail's. The page changes underneath at the same moment. Once the case study is up, the copy settles onto its thumbnail's exact rect (250ms ease-out, usually already there), the scrim fades off the case study (300ms ease-out), and the real thumbnail takes over.

Hovering a project (its card or its Works row) prefetches its case study, so it's ready when the zoom lands.

4. **Back:** the logo returns home in the mode it was left in: home starts collapsed (rail width, content hidden) and the rail widens back into the sidebar as everything fades back in (400ms).

Phones and reduced motion: a plain page change. Extras and links elsewhere just navigate.

## Case-study page

The frame around every case study (CaseStudyKit.tsx's `CaseStudyLayout`, styles in `CaseStudyLayout.module.css`), full window like home, Geist with -0.6px tracking (the kit's body/heading classes point at Geist on this route):

**Case-study type:** the title 44px at 1536 wide (`clamp(30px, 2.865vw, 56px)`), weight 400, line-height 1.1, -0.02em. Headers 17px weight 500 (the same as home's intro paragraph): each section's number and name ("01 / Initial Planning"). Small headers 14px italic, weight 400: each section's subheading, and the facts' labels (Timeline, Team, Role, Skills). Everything else 14px, weight 300, line-height 1.45. All of it black, no greys or accent colours; in the sidebar the section in view is weight 500 instead of a different colour, with an underline on hover.

- **Cover (top of the page):** the whole window wide, 5/8 of the screen tall (62.5dvh), square corners: the project's hero image or video, cropped to fill, or its live demo (CyberSea). The zoom from home lands here. Nothing written over it.
- **Under the cover, three columns:** an equal margin either side (`clamp(170px, 15.62vw, 400px)`: 240px at 1536 wide) with the writing centred between them (240px to 1296px at 1536 wide); the sidebar sits in the left margin.
- **Sidebar (sticky), like home's:** home's padding (`--pad-y` top, `--pad-x` sides). At the top, where home's social icons sit, a hand-drawn ← back home (18px in a 24px box, black, greys to `rgba(0, 0, 0, 0.55)` on hover). Then home's section gap (`clamp(24px, 6.9dvh, 96px)`) and "Contents" as a menu heading (14px, weight 500), with the sections under it as menu items ("01 Initial Planning" …: 14px weight 300, line-height 1.45, 4px apart), greying on hover like home's; the section in view weight 500; each jumps to its section.
- **Writing:** `--pad-y` top, left aligned. First the title, 10px under it the caption (the subtitle, 14px weight 300), 16px under that the overview box (a 1px light grey border, `rgba(0, 0, 0, 0.12)`, 10px corners, 16px 20px padding) with the project's facts side by side in four columns (Timeline, Team, Role, Skills: the labels small headers, the values 14px weight 300). Then 40px below the TL;DR and every section. Every section is one column: its heading (and subheading), then its writing 16px below, then its images, all across the writing's width.
- **Footer:** the footer (above), 96px below the last section, the whole window wide. The site's taskbar and big footer aren't shown on case studies.
- **Mobile:** the cover 62% of the screen tall (a video for CyberSea, no demo), then a top bar with the back arrow (no contents), then the title (30px), caption, overview and writing, stacked, 16px in.


## Case-study demo (CyberSea's 3D viewer)
- Fills CyberSea's cover on desktop, straight away (no button): the T-90 tank as the blue wireframe mesh on #0a0a0a, on a grid floor (#555 / #2a2a2a lines, 1-unit cells). Wireframe #3b82f6 at 50%. three.js loads once the page is idle. Phones keep the cover video.
- The panel, copied from the CyberSea project's inspector: top left, 16px in, 256px wide, 16px padding, `rgb(29 30 21 / 0.9)` with a 12px backdrop blur, 1px white/20% border. The vehicle's name (16px bold, white), a tag ("Ground vehicle": 10px mono uppercase, blue on blue/20%, 1px blue border); then a hairline and "View mode" (10px uppercase, white/50%) over the Wireframe / Solid switch (32px tall, #2a2b22 with a white/20% border, 10px bold uppercase; the chosen one blue #3b82f6, white text); then "Exploded view" (10px bold uppercase) with an On / Off button (blue when on, a white/30% outline when off) and a 10px mono note under it.
- Bottom right, 16px in: "Drag to rotate · right-drag to pan" (10px mono uppercase) and under it the tank's CC BY credit (10px mono), both `rgb(229 230 218 / 0.6)`.
- Exploded view pulls each part out from the middle by 35% of the model's size over MESH_DEMO_SPLIT_MS (lib/motion.ts), ease-in-out; reduced motion: instant. The wheel never zooms (the page keeps scrolling).

## Media loading in (components/ui/MediaFade)
Every work-grid cover and every case-study image and video loads in the same soft way (like rachelchen.tech): until it has loaded, its box shows a soft grey (#e6e6e6) breathing between 30% and 50% opacity, once every MEDIA_PULSE_S (2s); once loaded, it fades in from MEDIA_FADE_BLUR_PX (6px) of blur to sharp over MEDIA_FADE_MS (500ms), ease-in-out. Already-loaded (cached) media still plays the fade. CyberSea's 3D demo fades in the same way once its model has loaded. Reduced motion: no blur, no pulse, just the fade.

## Spotify Guessr cover (case-studies/spotify/GuessrDemo)
Staged like the slide deck's title slide, filling the cover, using the deck's own assets (public/demos/spotify):
- **Background:** the deck's background image (deck-bg.webp: near black with its grain and its blue, purple and pink glows), cropped to fill from the right. Over it, a magenta glow in the bottom left in the deck's own style: the deck's glow image mirrored and tinted magenta (deck-glow-magenta.webp, same grain and softness, screen blend), masked to a bloom running in from the very left edge (an ellipse centred on the left edge, 70% down, reaching about half way across) that runs into a long tail along the bottom edge (a wide flat ellipse centred 22% across). The background blooms in once loaded: from dark, 12% bigger, blurred 24px and extra saturated, to itself over GUESSR_BG_BLOOM_MS (ease-out; reduced motion: a plain fade). No title on the cover (the plain title under it, as on every case study).
- **Load-in, staggered** (once the background image has loaded): the background blooms (above); the magenta glow grows in from 85% GUESSR_GLOW_DELAY_MS later; the phone rises 6% into place from GUESSR_PHONE_DELAY_MS over GUESSR_PHONE_IN_MS (ease-out); then the characters pop in with a little overshoot from 60% size, one by one (the star, the triangle, the blue one) from GUESSR_CHAR_DELAY_MS, GUESSR_CHAR_STAGGER_MS apart, each over GUESSR_CHAR_IN_MS. Reduced motion: everything just fades in.
- **Phone:** the deck's real iPhone mockup (iphone-frame.webp, the screen cut out, the island kept), centred, 96% of the cover tall, running 8% off its bottom (84% and 10% on phones), with a soft dark shadow. The live screen sits inside its glass (insets 2.3% / 5.1%, corners 13.6% / 6.3%). Screens from Amy's Figma (11, WebP).
- **Tapping it** goes on one screen per tap (nothing plays by itself): home → party room → the song → "Who is it?" → picked → "You rock!" → drumroll → podium (the characters hop, GUESSR_HOP_MS) → round again. Screens cross-fade over GUESSR_SCREEN_FADE_MS. (No countdown screens: they aren't finished.)
- **Characters, posed on and around the phone** (sizes as shares of the phone's height): all clear of the phone, limbs included: the triangle cheering, arms up (the deck's render), off its top right (centre 172% across, 14% down), 38%, tilted 6°; the star (the deck's render) off its bottom left (centre -74% across, 60% down), 42%, tilted -8°; the blue one off its right side (centre 166% across, 60% down), 30%, tilted 14°. On phones smaller to fit beside the narrow phone: 22%, 24% and 18% (centres 132%, -34% and 124% across). They bob very subtly, straight up and down only, no sway (GUESSR_BOB_PX every GUESSR_BOB_S, out of step). Nothing follows the mouse.
- "Tap the phone to play a round": 12px light, white/70%, bottom left (top left on phones).
- Reduced motion: no bobbing or hop; screens swap without the fade.

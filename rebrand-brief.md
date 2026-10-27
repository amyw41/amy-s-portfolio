# Portfolio rebrand: brief and build instructions

*For amyz.wang, written 2026-10-27 against the current code in `amy's portfolio`. No site code has been changed yet.*

This doc has three parts:

1. **The brief**: what the new site is and how it should feel.
2. **Build instructions**: the layout, components and files, in phases you can hand to Claude Code one at a time (like your other `*-prompt.md` files).
3. **Animation spec**: every motion in detail, with timings, easing and the technique to use.

Open questions are collected at the end. None of them block Phase 1.

---

## Part 1. The brief

### The idea

The site becomes a **one-screen, app-like space**: a thin sidebar on the left with who you are and the menus, and a big stage on the right that holds the jar. There's no side padding; it fills the whole window. Everything feels hand-drawn and slightly alive: lines "boil" (shift between near-identical drawings, like a hand-animated cartoon) so the page never looks fully still.

The load-in tells a small story: a drawn jar fills with water, overflows, and the spill stretches into the line that becomes the sidebar's edge. The site is literally drawn out of the jar.

### What's on the screen

**Sidebar (left, thin)**, top to bottom:

1. **amy wang**
2. A one-line description (currently "design engineer who adds whimsy to intuitive products.")
3. **eng @ uwaterloo**
4. **prev …** (past roles, see open questions)
5. The menus:
   - **Work**: a dropdown listing each project (CyberSea, Spotify Guessr, SkinSprout, Extras)
   - **Other**: expands to About me, Playground
   - **Contact**: expands to Email, LinkedIn, Twitter

The sidebar's right edge is a hand-drawn vertical line: the same line that the spill turned into during the load-in.

**Stage (right, fills the rest)**:

- Top: a **Jar / Gallery** view toggle.
- Middle: the jar, the same one as now, with items dropping in via the existing physics.
- The existing **projects / favourites** toggles stay (see open questions on the naming).
- In Gallery view, every item is laid out in a grid, appearing one by one from left to right.

### How it should feel

- **Hand-made, not slick.** Ink linework, slightly imperfect, gently boiling. Motion should feel like an animator's drawing, not a UI kit transition.
- **Quick, never in the way.** The intro is under 4 seconds, skippable with any click or key, and plays in full only once per visit.
- **Calm interface, playful stage.** The sidebar type is quiet and editorial (like the Frances Zhao reference). The play happens on the right.

### What carries over from today

- Jar art (`public/images/drawings/jar.svg`), all jar items, and the Matter.js physics in `components/sections/Hero/useJarPhysics.ts`, including drag, rustle and the projects/favourites dimming logic (`jar-visual-state.ts`).
- The wobbly hand-drawn line generators in `components/sections/Hero/wobblyOval.ts`.
- The case-study pages at `app/[slug]/` and all of `components/case-studies/`.
- About and Playground pages as they are, for now.
- Your size rule: the laptop layout (about 1536 × 696 CSS px) is the biggest the site gets. On bigger screens it stays that size, centered. What changes: the side padding inside that frame is dropped, so the sidebar sits flush left and the stage runs to the right edge.

---

## Part 2. Build instructions

### 2.1 Layout

```
┌──────────────── frame: width min(100vw, 1536px), centered ─────────────────┐
│ sidebar (≈300px)  ┃  stage (everything else)                                │
│                   ┃                      [ jar | gallery ]                   │
│ amy wang          ┃                                                         │
│ description…      ┃                         ( jar )                         │
│ eng @ uwaterloo   ┃                                                         │
│ prev …            ┃                                                         │
│                   ┃                                                         │
│ Work          +   ┃                                                         │
│ Other         +   ┃                                                         │
│ Contact       +   ┃              ( projects )  ( favourites )               │
└───────────────────┸─────────────────────────────────────────────────────────┘
                    ↑ hand-drawn divider, full height, boils
```

- **Frame**: `width: min(100vw, 1536px); margin-inline: auto; height: 100dvh`. No horizontal padding on the frame. The current `--pad` and `--content-max` tokens (`lib/tokens.css`) stop applying to the home page; leave them for About/Playground/case studies until you decide on those.
- **Sidebar**: fixed width, about `clamp(260px, 20vw, 320px)`. Inner padding about 28px left, 32px top (matches the reference). Type: Roboto 300/400 as now. Name about 24px, body about 15px with 1.45 line height, menu labels 15px.
- **Stage**: `flex: 1`. The jar keeps its current height cap (the `--available-height` logic in `Hero.module.css`, capped at 600px) so it doesn't grow on tall monitors.
- **Below 768px wide**: the sidebar stacks on top, the menus collapse into a single row, and the intro uses the short version (see 3.9).

### 2.2 New and changed files

| Area | File(s) | What it does |
|---|---|---|
| Home page | `app/page.tsx` | Renders `<HomeShell>` (sidebar + stage). The current `Hero` + `Projects` stack goes away from the home page (keep the files until the new one ships). |
| Shell | `components/home/HomeShell.tsx`, `.module.css` | The frame, the sidebar/stage grid, the intro state machine. |
| Sidebar | `components/home/Sidebar/Identity.tsx` | Name, description, school, prev. |
| Menus | `components/home/Sidebar/NavSection.tsx` | One reusable accordion (label, +/× icon, sub-items). Used three times. |
| Stage | `components/home/Stage/Stage.tsx` | View toggle, jar view, gallery view, project preview. |
| Jar | reuse `components/sections/Hero/JarStage.tsx` | Unchanged except for the new `start` and `dropAway` options (2.4). |
| Gallery | `components/home/Stage/GalleryView.tsx` | Grid of all jar items with the staggered load-in. |
| Preview | `components/home/Stage/ProjectPreview.tsx` | The tile that slides up when hovering a project in the Work menu. |
| Intro | `components/home/Intro/IntroSequence.tsx`, `intro-timeline.ts`, `spill-shape.ts` | The jar → water → spill → line sequence. |
| Boil | `components/ui/Boil/BoilFrames.tsx`, `lib/boil.ts` | Shared boiling-line technique (3.1). |
| Wobbly lines | move `wobblyOval.ts` to `lib/wobbly.ts`; add `buildWobblyRectPath(seed, w, h, r)` and `buildWobblyLinePath(seed, points)` | Hand-drawn outlines for the preview tile and the sidebar divider. |
| Zoom transition | `components/transitions/ZoomTransition.tsx` | Context + overlay for project → case study (3.7). |
| Copy | `lib/content.ts` | New `sidebar` block: `name`, `description`, `school`, `prev`, menu labels. Contact links reuse `footer.links`. |
| Timing | `lib/motion.ts` | Add the shared easing curves and `BOIL_FPS` (3.10). |

Also worth tidying while you're in there: `app/projects/[slug]/` is a leftover copy of `app/[slug]/` (the route moved to the root). Delete it so there's one case-study route to animate into.

### 2.3 Menus

- One `NavSection` component: `label`, `items: {label, href, external?}[]`, `indent` for sub-items.
- **Work** opens on **hover** (as you asked) and also on click and keyboard focus, so it works on touch and with a keyboard. Use hover intent: open after 60ms of hover, close 150ms after the pointer leaves the whole section, so moving down into the list doesn't close it.
- **Other** and **Contact** use the same component and open on click (hover-opening three stacked menus makes them fight each other). If you want all three on hover, it's one prop.
- Only one section is open at a time.
- Styling, from your two references:
  - Label at full black, +/× icon at the right edge of the sidebar. The icon rotates 45° (+ becomes ×) on open.
  - Sub-items **indented about 14px further right** than in the reference, and **lighter**: about 45% black (`rgba(0,0,0,0.45)`).
  - The hovered or current item goes to full black and gets a short dash before it (`— Hack the North 2026` in your first screenshot). The dash draws in from the left (3.5).
- Work items come from `PROJECTS` in `lib/projects.ts` plus Extras, so a new project shows up automatically.
- Other → `/about`, `/playground`. Contact → `content.en.footer.links` (email, LinkedIn, X / Twitter).

### 2.4 Changes to the jar physics

Two small additions to `useJarPhysics.ts`, so the rest of the system can drive it:

1. **`start` option (boolean).** Today items start falling after `JAR_PHYSICS_DELAY_MS` (in `motion-timing.ts`). Replace that with: don't spawn until `start` becomes true. The intro flips it at the right beat. Image preloading and outline-mask generation should still happen immediately, during the intro, so nothing stutters when items drop.
2. **`dropAway()` function (returned from the hook).** Removes the jar's wall bodies (`Composite.remove(engine.world, walls)`), gives each body a small random sideways nudge and spin, and lets gravity take everything off the bottom of the stage. This is the "everything falls away" moment before the zoom (3.7). It's a one-way trip; the page navigates afterwards.

Leave the drag, rustle, respawn, replay and debug code alone.

### 2.5 Build phases

Each phase ships something that works on its own. Hand them over one at a time.

1. **Layout shell.** `HomeShell`, sidebar with static copy, the three menus (no animation yet), the stage with the existing `JarStage` and toggles, the Jar/Gallery toggle (gallery empty). Frame sizing and the no-padding rule. Remove the home-page Taskbar if it appears there.
2. **Menus and preview.** Work hover-open, sub-item styling, `ProjectPreview` sliding up with a static drawn outline. Background lighten.
3. **Boil system.** `lib/boil.ts`, `BoilFrames`, the procedural wobbly outline with 3 seeds. Apply it to the divider line, the preview outline and the jar.
4. **Gallery view.** Grid layout and the sequential load-in; switching back to the jar re-drops items.
5. **Zoom to case study.** `dropAway()`, the tile grow, route handoff, matching cover on the case-study page.
6. **Intro.** Water fill, spill, line, then hand off to the layout. Do this last: it depends on the final positions of everything else.
7. **Polish.** Reduced motion, skip, once-per-session, mobile, performance pass.

---

## Part 3. Animation spec

General rules, then each animation in order of appearance.

### 3.1 The boiling line (used everywhere)

"Boil" is the classic hand-animation trick: draw the same line two or three times, then cycle the drawings so the line shimmers. Two ways to do it, and the site should use both:

**A. Hand-drawn frames, for your actual drawings (the jar). This gives the best result.**

- Draw the jar **3 times** in Procreate, tracing over the original each time so it's the same jar with slightly different wobbles. Same canvas size, same position. Don't try to make them different; natural hand variation is exactly right.
- Export each like the current jar: PNG, then traced to SVG (the current `jar.svg` is a potrace trace). Save as `jar-1.svg`, `jar-2.svg`, `jar-3.svg`.
- Also export **one filled silhouette of the jar's inside** (a solid shape of just the interior) as `jar-interior.svg`. The water needs it as a mask (3.3).
- `BoilFrames` stacks the three images and shows one at a time with a CSS animation using `steps()`, no JavaScript:

  ```css
  .frame { animation: boil calc(3 / var(--boil-fps) * 1s) steps(1) infinite; opacity: 0; }
  .frame:nth-child(2) { animation-delay: calc(1 / var(--boil-fps) * -1s); }
  .frame:nth-child(3) { animation-delay: calc(2 / var(--boil-fps) * -1s); }
  @keyframes boil { 0%, 33.33% { opacity: 1; } 33.34%, 100% { opacity: 0; } }
  ```
- **Rate: 8 frames per second** (`--boil-fps: 8`). 12 fps reads as jittery and nervous; 6 is sleepy. 8 is a calm, alive simmer. Use one shared value for the whole site so every line boils in sync.
- **Order:** play 1, 2, 3, 1, 2, 3. Don't ping-pong (1, 2, 3, 2), which reads as mechanical.

**B. Procedural, for lines the code draws (divider, tile outline, menu scribbles, spill).**

- `wobblyOval.ts` already makes a different hand-drawn shape per `seed`. For anything boiling, precompute **3 paths with 3 seeds** and swap the `d` attribute at the same 8 fps. Precompute; don't regenerate per frame.
- Keep the wobble small for boil: the three versions should differ by 1–2px at most, or it looks like it's shaking rather than breathing. Add an `amplitude` parameter to the generators for this.
- Fallback for anything awkward to regenerate: an SVG filter with `feTurbulence` + `feDisplacementMap` (scale about 2) and swap the turbulence `seed` attribute 8 times a second. It's cheap and works on any SVG, but looks a little more "digital" than real frames, so treat it as the backup.

**Pause the boil** when the tab is hidden and when `prefers-reduced-motion` is on (show frame 1).

### 3.2 Intro: the overall timeline

Total about **3.9 seconds** before the site is interactive. Everything is driven by one Framer Motion sequence (`useAnimate` with a timeline array) in `IntroSequence.tsx`, with the beat times as named constants in `intro-timeline.ts` so they're easy to tune.

| Time (s) | What happens |
|---|---|
| 0.00 – 0.30 | Hand-drawn jar fades in at the center of the stage, already boiling. |
| 0.30 – 1.30 | Water fills the jar from the bottom. |
| 1.30 – 1.75 | Water crests over the jar's **left** lip and runs down the outside. |
| 1.75 – 2.20 | The run-off pools into a spill shape on the "floor" left of the jar. |
| 2.20 – 2.70 | The spill's left edge separates and stretches left into a thin tendril. |
| 2.70 – 3.30 | The tendril becomes a line: it travels **down** to the bottom of the frame, turns, and draws **up** the full height at the sidebar's edge. That's the divider. |
| 3.00 – 3.60 | The remaining water drains out; the leftover spill shrinks and fades. The jar eases into its final spot on the stage. |
| 3.20 – 3.80 | Sidebar text loads top to bottom (3.4). |
| 3.60 → | `start = true`: jar items drop in using the existing physics. |
| 3.70 – 3.95 | Menus, the Jar/Gallery toggle and the category toggles fade in. Site is interactive. |

Overlaps are intentional; they keep it flowing instead of feeling like a slideshow.

### 3.3 Intro: water filling and spilling

All drawn in **one SVG** layered over the stage, sized to the frame, so the water, spill and line share a coordinate space and can hand off to each other without jumps.

**Water style.** It needs to match the drawing. Use a pale fill (`--c-blue` at about 18% opacity) plus an **ink surface line** (same black as the jar, about 1.5px, round caps) that boils with the 3-seed technique. No gradients, no gloss.

**Filling (0.30–1.30s).**

- Mask the water with `jar-interior.svg` (`<clipPath>` or `<mask>`) so it only appears inside the jar.
- The water body is a rectangle whose top edge is a **wave path**: the sum of two sine waves (for example amplitudes 3px and 1.5px, wavelengths about 120px and 70px), with the phase drifting slowly so the surface moves.
- Animate the level from the jar's floor to its lip. Ease: `cubic-bezier(0.45, 0, 0.55, 1)` (ease-in-out). Real filling also looks good with the wave amplitude **larger at the start** (sloshing) and calming as it rises: animate amplitude from 5px down to 2px over the fill.
- Drive the level and phase with Framer Motion `motionValue`s and write the path's `d` directly in `useMotionValueEvent` / `onChange`. Don't put the path in React state; re-rendering 60 times a second will stutter.

**Cresting and running down (1.30–1.75s).**

- At the lip, the surface on the left side bulges up over the edge (raise the left end of the wave and give it a rounded tip), then a **stream** runs down the outside of the jar's left wall.
- Draw the stream as a path that hugs the jar's outer left edge. Reveal it top-to-bottom with `pathLength` + `strokeDashoffset` (stroke width about 6–10px, round caps, same pale-blue fill style with ink edges), or as a filled shape revealed by a mask rect growing downward.
- Ease: `cubic-bezier(0.55, 0, 1, 0.45)` (ease-in: accelerating, like falling liquid).

**Pooling into a spill (1.75–2.20s).**

- The spill is a **flat, irregular blob** on the floor line, like a top-down puddle squashed into perspective (wide and short, about 4:1). Think of a cartoon spill: one big lobe, two or three smaller bumps on the edge.
- Generate it in `spill-shape.ts` as a closed path from **a fixed number of points (use 24)** around an ellipse, each pushed in or out by noise, then smoothed (Catmull-Rom to cubic Bézier, same smoothing idea as `smoothPathFromPoints` in `wobblyOval.ts`).
- Keeping the point count fixed is the key trick: every spill shape, the tendril and even the start of the line are made from the same 24 points, so you can **interpolate point by point** between them. No morphing library needed, and no weird twisting.
- Grow it from a small blob at the bottom of the stream to the full spill. Ease out with a little overshoot: `cubic-bezier(0.34, 1.3, 0.64, 1)` (a spill spreads fast, then settles back a hair).

**Separating into a tendril (2.20–2.70s).**

- Pick the 5–6 points on the spill's **left end**. Pull them left toward the sidebar's x position, and squeeze them together vertically so that end becomes a long thin point, like dragging a drop of paint with your finger.
- At about 60% of the way through, **split the shape**: the main spill stays as one path; the tendril becomes its own path. Hide the seam with a tiny "neck" pinch first (the points between the two narrow to nearly zero width over 80ms, then the shapes separate).
- Ease: `cubic-bezier(0.65, 0, 0.35, 1)`: slow pull, fast stretch, slow settle. That stretch is what sells "pulled".

**Becoming the sidebar line (2.70–3.30s).**

- At the moment the tendril reaches the sidebar's x, swap it for a **stroked path**: a single line that starts at the tendril tip, goes **down** to the bottom of the frame, curves round in a small U, and goes **up** to the top of the frame along the sidebar edge.
- Animate it with `pathLength` from 0 to 1 (Framer Motion `motion.path` handles `pathLength` directly). The tendril's fill fades out over the first 100ms of this as the stroke takes over, so it reads as one continuous thing.
- Then the short "down and round" part of the stroke retracts (animate the start of the dash) so you're left with a clean straight vertical line: the divider. Its final path should be the exact same as the boiling divider the layout uses, so the swap is invisible.
- Ease: `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quint: fast and confident, gentle landing).
- Stroke: 1.25px, ink black, round caps. Boils at 8 fps after it lands.

**Draining and handing off (3.00–3.60s).**

- Water level drops back down (ease-in), the remaining spill shrinks toward its center and fades.
- The intro jar is drawn in the same spot and size as the real jar (do the math so they match exactly), so the handoff is just: hide the intro SVG, show the real `JarStage`. If you want the jar to start bigger and centered in the whole window, animate it (scale and position, 600ms, ease-out-quint) into the real jar's measured rect, then swap.

### 3.4 Sidebar text load-in

- Order: name, description, "eng @ uwaterloo", "prev …", then the three menu labels.
- Each line: opacity 0 → 1, `y` 10px → 0, plus a small blur 4px → 0 for an "ink settling" feel. Duration 450ms (matches your current `FADE_IN_TRANSITION`), ease `cubic-bezier(0.22, 1, 0.36, 1)`.
- Stagger **80ms** between lines (Framer Motion `staggerChildren: 0.08`). Menus come in after a slightly bigger 120ms gap, so they read as a separate group.
- The name can optionally reveal letter by letter (20ms per letter) if you want it more special. I'd try both and see.

### 3.5 Work dropdown

- **Open:** height animates from 0 to auto (Framer Motion `animate={{ height: "auto" }}`), 280ms, `cubic-bezier(0.22, 1, 0.36, 1)`. The sub-items fade and slide in from 6px **left** (they're indented, so arriving from the left feels like they're tucking in), stagger 35ms.
- **Close:** height to 0 in 200ms ease-in; items fade out all at once (no stagger on close; closing should feel quicker than opening).
- **Icon:** + rotates 45° to become ×, 250ms, same ease.
- **Hovering a sub-item:** the text goes from 45% to 100% black (150ms) and a dash draws in to its left: a short hand-drawn line (`buildWobblyLinePath`) with `pathLength` 0 → 1 in 180ms. The text nudges right by the dash's width at the same time.

### 3.6 Project preview on hover

When the pointer is on a project in the Work menu:

1. **Background lightens** (0–250ms). A white layer over the stage animates to about 70% opacity. The jar items and jar fade back behind it. Stop the jar's rustle/drag while this is up.
2. **Tile slides up from the bottom** (starting at 60ms). The project's cover (`/images/projects/<slug>/cover.webp`, or its video via the existing `AutoplayVideo` if it has one) starts fully below the stage and rises to the center.
   - Use a spring rather than a duration: `{ type: "spring", stiffness: 220, damping: 26, mass: 0.9 }`. That gives a quick rise with a tiny settle, which reads as physical.
   - A slight rotation that straightens out on arrival (start −2°, end 0°) makes it feel placed by hand.
   - Size: about 60% of the stage width, 3:2 (the covers are 3:2), corner radius 12px (`--jar-item-radius`).
3. **Drawn outline appears** (as the tile lands, about 300ms in). A hand-drawn rounded rectangle around the tile, offset 10–12px from it, drawn with `buildWobblyRectPath`. It **draws on** with `pathLength` 0 → 1 over 400ms, ease-out-quint, starting at the top-left corner and going clockwise, like a pen circling it. The path should overshoot its start slightly (like `buildWobblyPillPath` does with its `OVERLAP_SWEEP_DEG`), which looks like a real pen loop. Then it boils.
4. **Title and year** fade in under the tile, 150ms after the outline finishes.

**Moving between projects:** the current tile slides **down** and out (200ms, ease-in) while the new one rises. Use `AnimatePresence` with `mode="popLayout"` keyed by slug so they overlap instead of waiting for each other.

**Leaving the menu:** wait 150ms (so brushing past doesn't flicker it), then the tile slides down, the outline un-draws (reverse `pathLength`, 200ms) and the background un-lightens.

**Prefetch** the case-study route on hover with `router.prefetch(\`/${slug}\`)` so the click in 3.7 is instant.

### 3.7 Click: zoom into the case study

The sequence: everything else drops away, then the tile grows to fill the screen and becomes the case-study page.

1. **Drop away (0–450ms).**
   - Sidebar lines and menu items fall: each gets `y` → 120vh, a random rotation between −8° and 8°, and fades out over the last 30%. Ease `cubic-bezier(0.55, 0, 1, 0.45)` (ease-in: gravity). Stagger **bottom to top**, 25ms apart, so it collapses like a stack.
   - The jar items: call `dropAway()` (2.4) so they genuinely tumble out of the jar with the physics. The jar drawing itself falls with the sidebar timing.
   - The divider line retracts downward (`pathLength` 1 → 0, 300ms).
   - The tile's drawn outline un-draws (200ms) while the tile stays put.
2. **Grow (400–1000ms).**
   - Measure the tile's rect, then animate it to fill the viewport: `top/left 0`, `width 100vw`, `height` to whatever height the case-study cover will have at the top of the page. Corner radius 12px → 0.
   - Use transforms (FLIP: scale + translate) for smoothness, with the image inside counter-scaled or using `object-fit: cover` so it doesn't squash.
   - Ease `cubic-bezier(0.65, 0, 0.35, 1)` (ease-in-out-cubic), 600ms. Slow start, fast middle, soft landing is what makes it feel like a camera zoom.
   - Optional extra zoom feel: scale the image **inside** the tile from 1 to 1.06 over the same time, so it feels like you're moving into it, not just that the box is getting bigger.
3. **Hand off (1000ms).**
   - Call `router.push(\`/${slug}\`)`. The case-study page renders its cover image full-bleed at the top, at exactly the rect the tile ended on. When that image has loaded (`onLoad`), remove the overlay. Because the pixels are identical, the swap is invisible.
   - Then the case-study content below fades up (existing `FADE_IN_TRANSITION`, 80ms stagger).
   - The overlay lives in a provider in the root layout (`ZoomTransition`), so it survives the route change. `PageTransition.tsx` fades every route in on mount; skip that fade when arriving through the zoom, or it will flash.

Technique note: the React/Next "View Transitions" feature can do shared-element morphs between routes, but this repo's `AGENTS.md` says the Next version differs from what models know. Check `node_modules/next/dist/docs/` for `viewTransition` support before relying on it. The manual overlay above works regardless, and you keep full control of the choreography (the drop-away has to finish before the grow starts, which View Transitions doesn't do well).

**Back from a case study:** a simple reverse is a nice-to-have: the cover shrinks back to a tile size at center, the home page redraws without the intro (short version, 3.9). For the first version, the plain fade is fine.

### 3.8 Jar / Gallery toggle

- **Toggle style:** two words, "jar" and "gallery", top center or top right of the stage. The active one is circled with the existing `ScribbleOval` (which draws on with `pathLength` when it moves to the other word, 300ms).
- **Jar → Gallery:**
  1. Jar items fade and scale down slightly (to 0.9, 200ms), jar drawing fades.
  2. Grid appears. Items load in **one by one, left to right, row by row**, in quick succession: each one does opacity 0 → 1, `y` 16px → 0, scale 0.94 → 1, 350ms, ease-out-quint, **stagger 55ms**. With 13 items that's about 1 second total: fast enough to feel like one motion, slow enough to see the sequence.
  3. Use the same cut-out item images as the jar (`public/images/items/`), on a light grid, each sized to a consistent visual weight (reuse the alpha-bbox sizing already in `useJarPhysics`).
- **Gallery → Jar:** grid items fade out quickly together (150ms, no stagger), then the jar fades in and the physics drop runs again from the top (re-spawn).
- **Stretch goal:** instead of fading, items fly from their jar positions straight to their grid cells (FLIP using each item's rendered transform, which `useJarPhysics` already tracks as `renderedPose`). Very satisfying, more work; do it after everything else.
- **Projects / favourites toggles** keep working in both views: in the gallery, matching items stay full and get their colored outline, the rest dim with the same white overlay (`--dim-white`).
- Clicking a project in the gallery runs the same zoom as 3.7.

### 3.9 Reduced motion, skipping and repeat visits

- **`prefers-reduced-motion: reduce`:** no intro, no boil (show frame 1), no slide-ups. Everything fades in over 200ms, the jar items appear already settled (the physics hook already has an `instant` path for this), and the zoom becomes a crossfade.
- **Skip:** any click, tap or key during the intro jumps to the end state (all timeline steps complete instantly, items drop).
- **Once per session:** store `introSeen` in `sessionStorage` (wrapped in try/catch). On later loads in the same session, play the **short version**: divider draws down in 400ms, sidebar text staggers in, items drop. About 1 second.
- **Mobile:** always the short version.

### 3.10 Shared motion constants

Put these in `lib/motion.ts` so nothing gets copy-pasted (the file already has this pattern):

```ts
export const BOIL_FPS = 8;
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;     // landings, draws, reveals
export const EASE_IN = [0.55, 0, 1, 0.45] as const;      // falling, exits
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;  // zoom, stretch
export const EASE_SPILL = [0.34, 1.3, 0.64, 1] as const; // overshoot settle
export const TILE_SPRING = { type: "spring", stiffness: 220, damping: 26, mass: 0.9 } as const;
export const STAGGER_TEXT = 0.08;
export const STAGGER_GALLERY = 0.055;
```

### 3.11 Making it run well

- Animate only `transform`, `opacity` and SVG `d`/`pathLength`. Never animate `top/left/width/height` directly (use FLIP).
- Write per-frame SVG paths through motion values, not React state.
- Preload all jar item images and the first project cover during the intro, so nothing pops in.
- Boil with CSS `steps()` wherever possible, so it costs nothing on the main thread.
- Test the intro at 4× CPU slowdown in Chrome DevTools. If it drops frames, the spill path math is the first thing to simplify (fewer points, or precompute the keyframe shapes).

---

## Assets you'll need to make

1. **3 boil frames of the jar** (`jar-1/2/3`), traced like the current one.
2. **Jar interior silhouette** (`jar-interior.svg`), a solid fill of the inside, same canvas.
3. *(Optional)* a hand-drawn spill reference sketch, so the procedural spill can be tuned to look like your drawing style.

Everything else (divider, outlines, dashes, water surface) is generated in code with the existing wobbly-line approach.

---

## Open questions

None of these block starting. I've picked a default for each so the build can go ahead.

1. **The rest of the page.** You said you're not sure yet. The default for now: the home page is one screen, no scrolling. The current "what's inside?" project list and footer are removed from home (projects live in the Work menu and the gallery). Easy to add a section below later.
2. **"prev …" line.** What goes there? Default: `prev apm intern @ rrc companies` from `lib/experience.ts`. Could also list a few (`prev rrc, uw blueprint, technova`).
3. **"projects and work" toggle.** The jar's current toggles are **projects / favourites**. I've assumed you meant those. Say if you want them renamed.
4. **Which way the spill goes.** I've assumed it spills off the **left** lip so it can travel toward the sidebar. Spilling right and sweeping all the way across is also possible, but longer.
5. **Big screens.** The 1536px frame stays centered on wider monitors, so the sidebar won't touch the far-left edge of the screen there. Alternative: let the sidebar stick to the window's left edge and only center the stage. Default is the centered frame, per your size rule.
6. **Other pages.** Should About, Playground and the case studies get the sidebar too (instead of the floating Taskbar), or keep the Taskbar for now? Default: keep the Taskbar on those pages until the home page is done.
7. **Gallery contents.** Default: all 13 jar items (projects and favourites). Projects are clickable into case studies; favourites show a small caption on hover.

# Portfolio rebrand brief (v2)

*amyz.wang · written 2026-10-27 from Amy's notes and sketches (`sketches/`, full board in `sketches/00-full-reference.png`). Builds on the current Next.js code in `amy's portfolio`. Nothing has been built from this yet.*

**How to use this doc**

- **Parts 1–4** are the brief: what the site is, every screen, every interaction, and the animation details.
- **Part 5** is what you need to make yourself (drawings, exports).
- **Part 6** is how to build it with Claude Code: setup, then 9 steps, each with a prompt you can copy and paste.
- **Part 7** lists what's still undecided. None of it blocks steps 1–6.

---

## Part 1. The idea

The site is **one screen, like a little app**. On the left is a thin sidebar with your name, a short intro and the menus. On the right is a big stage holding the jar. A hand-drawn, slightly squiggly line divides them.

Everything is hand-drawn and a little alive. Lines wobble and "buzz" like a cartoon, and motion moves in slightly choppy steps, like stop motion, instead of perfectly smooth computer easing.

The intro tells one small story. A drawn jar overflows, and one strand of the spill gets pulled like a thread through a needle. It unravels the whole drawing into the line that divides the page. **The site is drawn out of the jar.**

**What stays from the current site:** the jar art and items, the Matter.js physics (`components/sections/Hero/useJarPhysics.ts`), the highlight logic (`jar-visual-state.ts`), the hand-drawn oval generator (`wobblyOval.ts`), the case-study content in `components/case-studies/`, and the About and Playground pages.

**Size rule (unchanged):** your laptop layout, about **1536 × 696** CSS px, is the biggest the site gets. On bigger screens the whole frame stays that size, centered. **New:** there's no side padding inside that frame. The sidebar sits flush left, and the stage runs to the right edge.

---

## Part 2. The home page

Sketches: `02-home-jar.png` (jar mode), `03-home-grid.png` (work mode).

```
┌──────────────── frame: min(100vw, 1536px) × 100dvh, centered ────────────────┐
│                    │                                                          │
│                    ⌇                                              ○ projects  │
│    amy wang        ⌇                                              ○ items     │
│    short intro…    ⌇                                                          │
│    X in ✉          ⌇  ← links                                                 │
│                    ⌇                                                          │
│    Experience ˄    ⌇                  ╭──────────╮                            │
│    Design @ …      ⌇                  │   jar    │                            │
│    Campus @ …      ⌇                  │  items   │                            │
│    Mgmt Eng @ …    ⌇                  ╰──────────╯                            │
│                    ⌇                                                          │
│    Works ˄         ⌇                                                          │
│    CyberSea …      ⌇                                                          │
│    About           ⌇                                                          │
│    Play            ⌇                                                          │
│                    ⌇                                                          │
│    jar   work      ⌇  ← mode toggle                                           │
│                    │                                                          │
└───────────────────────────────────────────────────────────────────────────────┘
```

(The sidebar box is flush with the frame's top, left and bottom; nothing is drawn except the divider line on its right edge.)

### 2.1 The divider line

- A vertical hand-drawn line between the sidebar and the stage.
- It's **a bit squiggly**: a gentle wobble, not a ruler-straight line.
- It sits on the **right edge of the sidebar box** (see 2.2). It **doesn't touch the top or bottom**: it's inset about 32px from each.
- It buzzes gently (see 4.1), like every other drawn line.
- It's the same line the intro creates, so the intro ends exactly where this line sits.

### 2.2 Sidebar

**The box.** The sidebar is a box **flush with the window's top, left and bottom**: no padding outside it. The divider line is its right edge and belongs to that outer box (inset from the top and bottom). The text has its own, deeper inner padding, so the line starts clearly above the first line of text and ends clearly below the mode toggle. All spacing scales with the window; exact values are in `docs/rebrand/design-system.md`.

Top to bottom, everything on one left edge:

1. **Social icons:** X, LinkedIn, mail, plain black.
2. **Intro:** one paragraph, the name then the description ("Amy Wang is a designer who…"), at body size in medium weight. There's no separate big name.
3. **Menu:** three always-open groups (no dropdowns), each a medium heading with items under it:
   - **Works:** the case studies by name (CyberSea, Spotify Guessr, SkinSprout, Extras). Hovering one isolates it on the stage (3.1).
   - **Extra:** About Me (`/about`), Play (`/playground`).
   - **Experience:** Design @ Blueprint, Campus @ Notion, Management Eng @ Waterloo.

Menu items fade to 55% black on hover.

The **jar / work toggle** isn't in the sidebar: it sits top right of the stage as two hand-drawn pills, the selected one coloured in with pencil (jar red, work blue). See 2.4 and the design system.

### 2.3 Stage: jar mode (the default)

- The jar is **centered** in the stage and fills **most of it** (about 85% of the stage height, still capped at the laptop size).
- **No highlight toggles** (removed): instead, hovering a case study in the sidebar isolates its item in the jar (3.1).
- Projects stay **in** the jar alongside your items (default, see Part 7).
- Everything from the current jar still works: drag, rustle, items landing on things.

### 2.4 Switching modes

**jar → work** (click "work" at the top right of the stage):

1. **The jar is lowered off the table**, cartoon style:
   - **Anticipation:** the jar lifts about 10px and squashes slightly (scaleY 0.96) for about 120ms.
   - **Drop:** it accelerates down and out of the bottom of the stage (about 450ms, ease-in).
   - **Items react:** right as it starts moving, every item gets a small upward kick, so they lag behind, knock together, and resettle inside the jar as it goes. This is real physics, using the existing engine.
   - **Clink sound:** play the jar sound (`components/sections/Hero/jar-sound.ts`, `public/sounds/jar-drop.mp3`) on the toggle click. It's allowed here because the click counts as the user action browsers require. Add a mute option later.
2. **"what's inside?" comes down from the top** as the jar leaves, like the camera panning down into the jar. It drops from above the stage with a little overshoot and settles at the top.
3. **The grid loads in:** project tiles appear one by one in a **diagonal sweep** from top left, like a gradient washing across. It's fast: about 40ms between tiles, each tile 300ms.
   - Grid tiles are your project thumbnails, with title and year underneath. The two pills under the heading in the sketch are the category filters (work / personal / hackathon, the existing filters).
   - Clicking a tile opens the case study with the same zoom as the menu (3.2).

**work → jar** (click "jar"):

1. The grid and heading slide up and fade out together (200ms, no stagger, so leaving is quicker than arriving).
2. **The jar drops down from above** onto the "table". It lands with a squash (scaleY 0.92, scaleX 1.04) and springs back.
3. **Then the items fill it**: the existing physics spawn, falling in from the top.

---

## Part 3. Projects and case studies

Sketch: `05-click-zoom-and-case-study.png`. (`04-hover-slide-up.png` is superseded by 3.1 below.)

### 3.1 Hovering a case study in the work menu

Hovering a case study in the sidebar's **Works** list (or tabbing to it) **isolates that project on the stage**:

1. **In jar mode:** the project's own item in the jar **lifts up a little** (about 12px, scaling to 1.04, ~250ms ease-out) and draws above the pile, while **every other item dims** with the same white wash the old highlight toggles used. On leave it settles back down (~200ms) and the dimming clears.
   - The lift is purely visual (a transform on the item's drawing), never a push on its physics body, so the pile isn't disturbed.
   - Case studies map to jar items by slug (cybersea, spotify, skinsprout). **Extras** has no item in the jar, so hovering it changes nothing there.
2. **In work mode:** the same idea on the grid: the project's tile lifts slightly (6px) and the other tiles dim.
3. **Reduced motion:** dimming only, no lift.
4. **Prefetch** the case-study page on hover, so the click is instant.

(This replaces the earlier idea of a project preview sliding up from the bottom of the stage. The sketch `04-hover-slide-up.png` is out of date.)

### 3.2 Clicking: zoom into the case study

1. **Everything else disappears first** (about 350ms). The rest of the jar (or the other grid tiles), the mode toggle, and the menu items all fade and drop a little (8–12px), staggered quickly. The clicked project's lifted jar item (or its grid tile) stays.
2. **The sidebar shrinks.** It narrows from its full width to a thin rail (about 64px):
   - **The name retracts into the top-left corner**, becoming the logo. The logo design is still to come (Part 7); until then, use a placeholder like "aw".
   - The rail then shows **the case study's contents**: numbered sections 1, 2, 3, 4…, which jump to each section.
   - The divider line stays, sliding left with the rail.
3. **The project zooms in** (about 600ms, overlapping the end of step 2). Starting from the lifted jar item (or the grid tile), it grows into **its spot on the case-study page**: the large thumbnail on the left under the title. Its corners settle into the case-study layout.
4. **The case study fills in**: the title fades down into place, then the sections on the right fade up one after another.

This is all one continuous motion. The thumbnail on the home page and on the case study is the same image in the same final spot, so the page change is invisible.

### 3.3 Case study page layout

```
┌──────┬──────────────────────────────────────────────────────────────┐
│  aw  ⌇  Project title  ~~~~~~~~~~~~~~                               │
│      ⌇                                                              │
│  1.  ⌇  ┌────────────────────────────┐     section one ─────        │
│  2.  ⌇  │                            │     section two ─────        │
│  3.  ⌇  │        thumbnail           │     section three ───        │
│  4.  ⌇  │                            │     section four ────        │
│      ⌇  └────────────────────────────┘                              │
└──────┴──────────────────────────────────────────────────────────────┘
```

- **Thin rail on the left:** the logo at the top, then the numbered contents. The current section's number is highlighted (the existing `TableOfContents` in `CaseStudyKit.tsx` already tracks this).
- **Title** at the top of the content area.
- **Thumbnail** on the left, below the title. It **stays in place while you scroll** (sticky).
- **Sections** on the right, stacked vertically. This column scrolls.
- **Back:** clicking the logo returns home. The rail widens back into the sidebar and the home stage fades in. No intro.
- **Later:** a "view next case study" link at the bottom (Part 7).
- Existing case-study content (`components/case-studies/*`) moves into this layout. The writing doesn't change, only the frame around it.
- Housekeeping: `app/projects/[slug]/` is a leftover copy of `app/[slug]/`. Delete it so there's one case-study route.

---

## Part 4. Animation spec

### 4.1 The hand-drawn look (used everywhere)

**Buzzing lines.** Every code-drawn line (the divider, the circle around projects, the hover ovals, the underlines) has **3 versions**, each drawn with a different seed. They differ by 1–2px at most, and the code swaps between them **10 times a second**, always in order 1 → 2 → 3 → 1. Precompute the 3 paths once; never redraw every frame. `wobblyOval.ts` already makes a different shape per seed, so add:

- `buildWobblyLinePath(seed, from, to, amplitude)` for the divider and underlines.
- `buildWobblyRectPath(seed, width, height, radius)` for the outline around projects.
- An `amplitude` option on the existing generators, so the buzz can be tiny.

**The jar drawing buzzes too.** Optional, best version: draw the jar 3 times by tracing over it, and cycle the drawings the same way. Fallback: an SVG wobble filter (`feTurbulence` + `feDisplacementMap`, scale about 2) whose seed changes 10 times a second.

**Stop-motion timing.** For the intro and the jar's cartoon moves, update the drawing only **12 times a second** instead of 60. The motion steps slightly, like stop motion. Do this by rounding the animation's time to steps of 1/12 s before computing the frame. Keep the UI hovers (menus, underlines, slide-ups) smooth at 60fps, since choppy hovers feel broken rather than charming.

**Pen-stroke reveal.** Drawing a line "on" uses SVG `pathLength` from 0 to 1 (Framer Motion `motion.path` supports it directly). All the drawn ovals, underlines and outlines appear this way.

### 4.2 Intro: overflow and unravel

Sketch: `01-intro-spill.png`, and the top left of `00-full-reference.png`. Total about **4 seconds**. **Click or any key skips it.** It plays in full **once per visit** (sessionStorage); later loads in the same visit get a 1-second short version: the divider draws, the sidebar fades in, the jar drops.

**The key technique: the intro jar is one continuous line.** You draw the intro jar (with the liquid and both overflowing strands) as **a single unbroken stroke**, like a one-line drawing. The line starts at the tip of the left strand, goes up over the lip, around the whole jar, and ends at the tip of the right strand. Export it as an SVG with one `<path>` that has a stroke, not a filled shape (see Part 5). That one line is what gets pulled straight.

| Time (s) | What happens |
|---|---|
| 0.0 – 0.4 | The jar appears in the middle of the screen, already buzzing. |
| 0.4 – 1.4 | Liquid rises inside it: a pale fill clipped to the jar's inside, with a wobbly surface line. |
| 1.4 – 2.0 | It overflows: **two strands** run down the outside, one left and one right. They draw on with the pen reveal, accelerating like falling liquid. |
| 2.0 – 3.0 | **The unravel.** The tip of the right strand is the needle. It travels **down toward the bottom of the page, near the left side**, tracing the start of its route. Behind it, the line gets pulled out of the drawing: the jar visibly unwinds from the far end, like a thread pulled through a needle, until nothing is left but the line. The liquid fill fades as the jar unravels. |
| ~3.0 | **The split.** At a fork point the pulled line splits into **two strands**. |
| 3.0 – 3.8 | **Strand A** turns and goes **up**, becoming the sidebar divider: it settles into the squiggly line, with padding top and bottom, and starts buzzing. **Strand B** travels into the stage and **draws the real jar's outline** with the pen-stroke reveal, so the jar is literally drawn by the same thread. Both strands finish together at about 3.8s. |
| 3.8 → | Strand B's outline **cross-fades into the real jar art**, then the items fall in (existing physics). At the same time the sidebar loads top to bottom: name, intro, links, Experience, Works / About / Play, mode toggle. Each one fades and rises 8px, 70ms apart. |

**How the unravel works.** Put this in the step 8 prompt word for word.

- The thread has a fixed length: the length of the jar line.
- Each frame, the needle has travelled a distance `d` along its route (strand tip → down and left → up the divider).
- What you see is two pieces joined at the needle's starting point:
  - the route from its start to distance `d`, behind the needle;
  - the jar line with its **last `d` length removed** from the right-strand end.
- As `d` grows, the drawing shrinks from the far end exactly as fast as the route grows, so it really looks pulled.
- If the jar line is longer than the route, speed up the unravel of the last 20% (a zip), or trim the tail. Either way, the line ends exactly on the divider.
- Measure with `getTotalLength()` and `getPointAtLength()` on hidden SVG paths. Sample about 300 points, and write the path's `d` directly each frame (not through React state).
- Render on the 12fps stop-motion clock (4.1) so it feels hand-animated.

**How the split works.**

- The fork is **two paths that share a start point** (the fork point). Strand A's path runs from the fork up the divider; strand B's path runs from the fork into the stage and then along the jar's outline.
- Each strand's visible length grows from the fork, using `pathLength` (or `getPointAtLength()` when building `d` by hand, as for the unravel).
- Strand B's path ends on `jar-outline.svg` (Part 5): one continuous stroke matching `jar.svg`'s silhouette, scaled and placed exactly over where the real jar sits in the stage. When it's fully drawn, cross-fade it into the real jar image.
- If `jar-outline.svg` doesn't exist yet, approximate the outline from the jar's traced shape as a fallback.

### 4.3 Timings in one place

Put every number in one file (`lib/motion.ts`) so you can tune it without hunting:

```ts
export const BUZZ_FPS = 10;            // line buzz
export const STOP_MOTION_FPS = 12;     // intro + jar cartoon moves
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;   // landings, reveals
export const EASE_IN = [0.55, 0, 1, 0.45] as const;    // falling, exits
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;// zoom, pulls
export const PREVIEW_SPRING = { type: "spring", stiffness: 220, damping: 26 } as const;
export const SIDEBAR_STAGGER = 0.07;
export const GRID_STAGGER = 0.04;
export const HOVER_CLOSE_DELAY_MS = 150;
```

### 4.4 Accessibility and performance

- **Reduced motion** (`prefers-reduced-motion`): no intro, no buzz, no cartoon moves. Things simply fade in (200ms), the jar items appear already settled (the physics hook already supports this), and the zoom becomes a crossfade.
- Animate only `transform`, `opacity`, and SVG `d` / `pathLength`.
- Buzz with CSS `steps()` where possible, so it costs nothing.
- Pause the buzz when the tab is hidden.
- Preload jar items and project covers during the intro.

### 4.5 Mobile

Below 768px wide, the sidebar stacks on top as a compact header, and the menus become one row. The jar and grid sit below it. The intro is always the short version. Hover previews don't exist on touch, so tapping a case-study name goes straight to it with the zoom.

---

## Part 5. What you need to make

1. **Intro jar, one continuous line** (most important). The jar, the liquid surface, and both overflowing strands, all as **one unbroken stroke**: start at the left strand's tip and end at the right strand's tip. Export as SVG.
   - In Procreate, use a monoline brush and don't lift the pen. Export to SVG through Illustrator, Figma or Inkscape **as a stroke path, not traced outlines**.
   - Your current `jar.svg` is a traced filled shape, which can't be unravelled. The code needs one path.
   - If it's easier, draw it in Figma with the pen tool, as one path.
2. **Intro jar's inside**, a filled shape of the jar's interior, so the liquid fill only shows inside.
3. *(Optional)* **3 traced versions of the main jar** for its buzz. Otherwise the code fakes it with a wobble filter.
4. **Main jar outline, one continuous line** (`jar-outline.svg`). The main jar's silhouette as **one unbroken stroke** that matches `jar.svg`, so the intro's second strand can draw it (4.2, "How the split works"). Same export rules as item 1. Needed for step 8; the code can approximate it from the traced jar as a fallback.
5. **Logo**, the "Amy 王 → monogram" idea. Not needed until step 7.
6. **Short intro copy** for the sidebar.

---

## Part 6. Building it with Claude Code

### 6.1 Setup (once)

1. **Put the brief in the repo.** Copy this file to `docs/rebrand/brief.md`, and the sketches to `docs/rebrand/sketches/`. Claude Code reads files in the repo much more reliably than pasted text.
2. **Start a fresh branch from main:**
   ```
   git checkout main
   git checkout -b rebrand-v2
   ```
   (The old `rebrand` branch from the first attempt can be deleted with `git branch -D rebrand`.)
3. **Add a short section to `CLAUDE.md`**, so every session knows the rules:
   ```md
   ## Rebrand (in progress)
   - The spec is docs/rebrand/brief.md; sketches are in docs/rebrand/sketches/. Read the parts the task names before planning.
   - Work only on the step you're given. Don't start later steps.
   - Max layout size is ~1536x696 CSS px, centered on bigger screens, no side padding.
   - Keep the existing jar physics (useJarPhysics.ts). Extend it with small options; don't rewrite it.
   - Put every animation timing in lib/motion.ts.
   - Respect prefers-reduced-motion in everything you add.
   - Verify in the browser at 1536x696 and 390x844 before saying you're done. Commit on the current branch when the step works. Never push.
   ```
4. **Add two debug helpers in step 1**, because you'll use them constantly when tuning animation:
   - `?slow=4` plays every animation 4× slower.
   - `?intro=1` forces the intro to replay.

### 6.2 How to prompt well

- **One step per session.** Run `/clear` (or open a new session) between steps, so it isn't carrying the last step's clutter.
- **Plan first.** Start each step in plan mode (Shift+Tab) and read the plan before letting it code. Tell it what's wrong with the plan, not what's wrong with the code afterwards.
- **Point to sections, don't paste.** "Read Part 2.2 and 4.1 of the brief" is better than pasting them.
- **Attach the sketch** for the step. Pictures beat descriptions for layout.
- **Give feedback in feelings plus numbers.** "The slide-up feels floaty; make it snappier" works. "Stiffness 220 → 320" works even better. Use `?slow=4` to see what's actually happening.
- **Record your screen** when something looks off and attach the clip or a screenshot.
- **Commit when a step feels right** (`git commit -am "step 3: buzzing lines"`). If a later step breaks something, you can go back.

### 6.3 The steps

Each step works on its own and can be checked before moving on. Copy the prompt, attach the sketch listed, and run it in plan mode first.

---

**Step 1: Layout shell**

*Sketch: 02-home-jar.png*

> Read docs/rebrand/brief.md Parts 1 and 2 (skip 2.4's animations for now) and CLAUDE.md. Build the new home page layout: the 1536px-max frame with no side padding, the sidebar (name, intro, the unnamed work/about/play group, the contact heading and links, the jar/work mode toggle at the bottom), a plain vertical divider with top and bottom padding, and the stage with the existing JarStage centered and the projects/items highlight toggles stacked on the right. Work expands on hover with intent (and click/focus); no fancy animation yet. Mode toggle can switch between the jar and an empty "what's inside?" placeholder. Hide the footer and taskbar on the home page only. Add the ?slow and ?intro debug params from Part 6.1. Keep Hero/ and Projects/ files but stop rendering them on home. Check it at 1536x696 and 390 wide, then commit.

**Step 2: Hand-drawn line system**

*No sketch*

> Read brief Part 4.1. Move wobblyOval.ts to lib/wobbly.ts (update imports), add an amplitude option, and add buildWobblyLinePath and buildWobblyRectPath. Build a reusable <BuzzPath> component that renders 3 precomputed seeds and swaps them at BUZZ_FPS using CSS steps() (paused for reduced motion and hidden tabs), with an optional pen-stroke reveal using pathLength. Replace the plain divider with a squiggly buzzing BuzzPath line. Add all constants from Part 4.3 to lib/motion.ts. Commit.

**Step 3: Sidebar interactions**

*Sketch: 02-home-jar.png*

> Read brief Part 2.2. Polish the sidebar from step 1: make the hover circles around the headings buzz while they are drawn, and check every hover/focus state with the keyboard. Check the keyboard: Tab through everything and make sure focus shows the same effects. Commit.

**Step 4: Work mode grid**

*Sketch: 03-home-grid.png*

> Read brief Part 2.4 (only the grid parts) and 4.3. Build work mode: "what's inside?" heading with the category filter pills (reuse the existing filters from components/sections/Projects), and a grid of project tiles (cover, title, year). Tiles load in a fast diagonal sweep from top left (GRID_STAGGER). Switching back to jar: grid and heading slide up and fade out together, then the jar shows. Commit.

**Step 5: The jar's cartoon moves**

*No sketch*

> Read brief Part 2.4 and 4.1 (stop-motion timing). Add small options to useJarPhysics without rewriting it: a `start` flag so items only spawn when told, and a `jostle(strength)` function that gives every body an upward kick with slight random sideways spin. Then build the transitions. Jar → work: anticipation lift and squash, accelerate down off the stage, jostle at the start so items knock around inside, play jar-sound.ts on the click, and "what's inside?" drops in from the top with an overshoot. Work → jar: jar drops in from above, lands with a squash and springs back, then items spawn and fall in. Run the jar's moves on the 12fps stop-motion clock. Check with ?slow=4. Commit.

**Step 6: Works hover, finishing touches**

*No sketch*

> Read brief Part 3.1. The hover isolate-and-lift is already built (Works row → jar item lifts and the rest dim; in work mode the grid tile lifts and the rest dim). Finish it: prefetch the case-study route on hover/focus, check the keyboard path (Tab through Works and confirm each focus isolates its project), make sure the lifted item still reads clearly when it's buried at the bottom of the pile, and tune the lift with ?slow=4. Commit.

**Step 7: Zoom into the case study and the new case study layout**

*Sketch: 05-click-zoom-and-case-study.png*

> Read brief Parts 3.2 and 3.3. First rebuild the case-study page layout: thin left rail (logo placeholder "aw" at the top, numbered section contents that highlight the current section, reusing TableOfContents from CaseStudyKit.tsx), title at top, sticky thumbnail on the left below it, sections stacked on the right in a scrolling column. Move existing case-study content into it without changing the writing. Delete the leftover app/projects/[slug] route. Then build the transition from the lifted jar item (brief 3.1) or a grid tile: everything else fades and drops out (staggered), the sidebar narrows into the rail while the name retracts into the corner as the logo, then the thumbnail grows into its exact spot on the case-study page, and the route changes underneath it so the swap is invisible (keep the overlay in a provider in the root layout; skip PageTransition's fade for this arrival). Logo click reverses back home without the intro. Commit.

**Step 8: The intro**

*Sketches: 01-intro-spill.png, 00-full-reference.png. Needs the one-line jar SVG and the jar outline SVG from Part 5.*

> Read brief Part 4.2 carefully, especially "How the unravel works", and 4.1's stop-motion timing. The intro jar is public/images/drawings/intro-jar.svg (one stroked path from the left strand tip to the right strand tip) and intro-jar-inside.svg (the interior fill). Build the intro as a single timeline: the jar appears, liquid rises clipped to the inside, two strands overflow, then the right strand tip becomes the needle and pulls the whole line out (fixed thread length, consumed from the far end as the needle travels down-left). Around 3.0s the pulled line splits at a fork point into two strands (two paths sharing a start point, each growing from the fork): strand A goes up the divider route and ends exactly on the divider BuzzPath; strand B travels into the stage and draws the jar's outline from public/images/drawings/jar-outline.svg (one stroked path matching jar.svg, placed exactly over the real jar). Both finish together around 3.8s. Then strand B's outline cross-fades into the real jar art and its items fall, while the sidebar loads top to bottom. Read "How the split works" too. Render on the 12fps clock. Click or any key skips. Full version once per session, 1s short version otherwise, none for reduced motion. Write the path's d directly each frame, not through React state. Check with ?slow=4 and ?intro=1. Commit.

**Step 9: Polish**

> Read brief Parts 4.4 and 4.5. Do a reduced-motion pass, a mobile pass (sidebar becomes a top header, tap goes straight to the case study), and a performance pass (test the intro with 4x CPU slowdown in DevTools; simplify if it drops frames). Preload jar items and covers during the intro. Fix anything that looks off at 1536x696, 1920x1080 (should stay 1536 wide, centered) and 390x844. Commit.

---

## Part 7. Still to decide

None of these block steps 1–6. The default is listed for each.

1. **Logo** (the "Amy 王 → monogram" idea). You'll send an image. Needed in step 7; a placeholder "aw" until then. It could animate through its steps while the sidebar shrinks.
2. **"View next case study"** at the bottom of each case study. You'll decide later. Easy to add after step 7.
3. **Projects in the jar.** Decided: they stay in, so hovering a case study can lift its item (3.1).
4. **Highlight toggles.** Decided: removed. Hovering a case study isolates its item instead (3.1).
5. **Intro copy** for the sidebar. Placeholder: the current tagline.
6. **Scroll instead of a toggle** for switching modes. Not doing it (it fights the one-screen layout and the menu previews), but noted in case you want to revisit.
7. **Sound.** Default: the jar clink plays when switching modes. A small mute button may be worth adding.

# Intro brief v4: a rough one-line sketch
Spirit: a rough, hand-sketched, Heytea-style loading animation. One loose felt-pen line doodling on a white page, not a polished vector animation. Lumpy, uneven, a bit off. When in doubt, rougher.

Fixes, matched to her numbers:
1. Only ever ONE line until it splits into two strands. No closed circles, and no shapes moving as a block.
2. The jar is traced by ONE continuous line following its edges, never back-and-forth sketch strokes.
3. The dot starts at the exact viewport centre.
4. Shape roughness on everything: uneven radius, lumps, slight overshoots, irregular spacing. This is separate from the boil.
5. One stroke width for everything (dot, spiral, strands, divider, jar): the divider's on-screen width, with vector-effect non-scaling-stroke.
6. The first full intro in a session can't be skipped. The repeat short version stays skippable.
7. The circle becomes a loose, imperfect spiral drawn OUTWARD from the dot. It's drawn on by the pen and never rotates.
8. All positions are measured live from the viewport and DOM at start. If the window resizes mid-intro, jump to the end state.

The jar: the home jar's outline becomes the one-line jar. It's one continuous rough line tracing the silhouette (from the 047ba4d trace, cleaned into one route).
- Route: start at the left wall mid-height, go up the left wall, over the shoulder and neck, round the rim (front then back of the opening as one loop), down the right side, across the base, and back up the left to close.
- Seeded shape roughness of ±1–2px, with a fixed seed so it's the same jar every time. The boil settles to exactly this shape.
- Same stroke width as the divider.
- It replaces the multi-stroke outline on the resting page, with no swap and no blend. Document it in the design system.

Sequence (~5.5s at 600px/s):
1. Dot (0–0.4s): blank page. A small rough dot (an uneven ~4px blob) at the exact viewport centre, boiling.
2. Spiral (0.4–1.8s): the pen draws a loose, imperfect spiral OUTWARD from the dot, ~2 turns, growing to ~50px across. Each turn is a different lumpy width, the spacing is uneven, and the end overshoots a bit. It's drawn on and never rotates or moves as a solid shape.
3. Unwind and split (1.8–2.6s): the line's two ends pull away in opposite directions, unwinding the spiral like thread pulled from both ends. The centre end goes left and the outer end goes right. The coils loosen and straighten, so it stays one line pulled into two strands. No extra circles, and nothing pops in.
4. Left strand to divider (2.6–3.8s): the left end travels down-left on a slightly wobbly path to the bottom of the divider, then runs up it to the top. The tail is used up, so the divider stays.
5. Right strand to jar (2.6–5.3s): the right end travels to the jar's left wall at mid-height, then traces the whole jar as ONE continuous line along the route. The tail is used up, so the one-line jar stays.
6. Settle (5.3–5.6s): the boil eases to still. The divider and jar are the page itself. The sidebar fades in top to bottom, the items fall, and "scroll down!" draws.

Style:
- 12fps on twos.
- Shape roughness is fixed per shape: low-frequency, ±3–6px on the spiral and strands, ±1–2px on the jar, seeded. The boil is per frame, the 3-drawing cycle at ~0.8px, easing to 0.
- One stroke width, round caps and joins, black.
- No straight geometric lines or perfect arcs: even the travel paths curve and wobble a little.
- One pen speed, INTRO_PEN_PX_PER_S = 600, with soft eases only at the starts and ends of moves.

Rules:
- First visit: full and unskippable.
- Repeat visits: the 1.4s short version (the dot pops, two strands run straight to the divider and jar and draw them), skippable by click or key.
- Phones: the short version, with one strand tracing the jar since there's no divider.
- No intro with reduced motion or when returning from a case study.
- ?intro=1 replays the full version, and ?slow=4 slows it.

Done when:
- One line only, with no explicit circles. The spiral grows outward, imperfect, from the exact centre on every screen size.
- The jar is drawn by one continuous line, and that line is the jar that stays.
- Every line is the same width, and it all looks rough and hand-sketched.
- The first visit can't be skipped.
- It looks right at 1366×768, 1536×696, 1920×1080 and 2560×1440.

---

# Intro brief v3: one line becomes everything
Replaces the v2 intro (fill/foam/rainbow), which stays switched off behind its flag. The source is Amy's sketch video.

Amy: "starts in a circle and moves around / it should be in a stop motion squiggly style as u currently have / the lines follow the outline of the jar to become the jar rather than sketching it out outright".

Ground rules:
- 12fps on twos.
- 3-version line boil (~0.8px), easing to zero in the last 0.3s.
- One continuous thread: nothing appears without the line travelling there. No pen lifts or jumps.
- "Becoming the jar" means the strand's head travels the jar's contour and leaves the jar behind it.
- The final frame is the exact real artwork and divider, so a pixel diff shows nothing.
- Black, thin line.

Sequence (~5s):
1. Dot (0–0.5s): blank page, a ~4px dot at the stage centre, boiling.
2. Circle (0.5–1.7s): the dot unspools into a curl, then a "c", then a small open circle (~60px). The circle keeps moving: its open end chases itself round while the circle drifts in a small wobbly orbit about the centre, like a pen doodling.
3. Open and split (1.7–2.4s): the circle opens into a wide ∩ arc with curled ends, then breaks at the bottom into two strands. Each has a curl at its free end, and they pull apart left and right.
4. Left strand to divider (2.4–3.6s): a moving thread of fixed visible length (~150px, tail used up) travels left and down to the bottom of the divider, then runs up the real divider path to the top, leaving it drawn.
5. Right strand to jar (2.4–4.8s): it travels right and touches the jar's left wall at about mid-height, then forks into two heads that flow along the outline in opposite directions.
   - UP head: up the left wall, over the shoulder and neck, round the rim and lid lines (including the inner opening and the lid double edge).
   - DOWN head: down the left wall, across the base, up the right wall.
   - The heads meet on the right side, and every jar stroke is then in place.
6. Settle and handoff (4.8–5.1s): the boil eases to still and the lines are the real jar and divider. The sidebar fades in top to bottom, the items fall, and "scroll down!" draws.

Build:
- Measure the divider and jar artwork from the DOM. Build one continuous contour route that visits every jar stroke, split at the left-wall mid-height contact point into an up route and a down route.
- Separate strokes (rim ellipse, lid edge, inner opening) are reached by following the touching outline, never by jumping across empty space.
- Dot to circle: ~14 precomputed curl/spiral frames resampled to the same point count, plus a seeded wobbly orbit.
- Split: precomputed arcs with curled ends.
- Each strand is a fixed-length window advancing at INTRO_PEN_PX_PER_S (600). The tail stops erasing once the head is on its target, so the target stays drawn.
- Jar flow: the two heads advance at the same speed. The jar artwork shows only where the line has passed, exactly along its own strokes.
- One SVG overlay written in rAF, everything precomputed, no React state per frame. The overlay hides in the same frame the real artwork shows.

Kept:
- The full version plays once per session. Otherwise there's a 1.4s short version: the dot pops into two strands that flow straight onto the divider and jar.
- Phones get the short version with no divider, so a single strand flows onto the jar.
- No intro with reduced motion or when returning from a case study.
- A click or any key skips. ?intro=1 and ?slow=4 work.

Done when:
- It starts as a dot that becomes a moving circle, which opens and splits into two strands.
- The left strand lands on and runs up the divider. The right strand forks at the jar wall and flows along the outline until the jar is complete.
- Nothing appears without the line travelling there.
- The final frame is exact, it plays smoothly at 1536×696 and 1920×1080, and the design-system Intro section is updated.

## As built (v3)
- **Where the dot starts:** halfway between the divider and the jar's left wall, level with where the right strand will touch the jar, not at the stage's centre. The jar sits in the stage's centre, so a dot there would start on top of the jar, and the right strand couldn't "travel right" to its wall.
- **Where the ∩ parts:** at its top (its ends are at the bottom, curled). Each strand's curl leads.
- **Length:** about 6.0s at 1536×696 and 6.1s at 1920×1080, mostly the rim and lid lines at 600px/s.
- **Switches:** `INTRO_STYLE` in lib/motion.ts picks "line" (v3), "sketch" (just the drawing on) or "overflow" (v2).

---

# Intro brief v2: the overflowing jar

> **For now: sketch only.** Amy: "only keep the sketch of the jar and line for now, i think that looks better". The intro is a blank page, then the divider and the real jar drawing on stroke by stroke at the pen speed, boiling and settling still at the end (about 3.9s at 1536×696). Repeat visits and phones still get the 1.4s short version. The small jar, ink, foam and rainbow strands stay in the code behind `INTRO_FULL_SEQUENCE = false` (lib/motion.ts).

Ground rules:
- Stop motion everywhere: one 12fps clock, on twos. Every frame must be visibly different so the motion reads.
- Line boil, the "squiggly shakiness" (Amy's reference: a hand-drawn loading animation by anthea_irl on X): everything in the intro boils. That covers the jar lines, the ink edge, the foam, the bubbles and the strands. On each 12fps frame, redraw every line with a fresh, small, seeded wobble: about 0.6–1px of displacement along its normal, varying smoothly along the line, so it looks shaky and alive rather than like jittery noise. During the last 0.3s of the trace, ease the boil to zero so the final frame is exactly the real artwork and the pixel diff stays clean. Make it one constant, INTRO_BOIL_PX.
- One pen speed: all line drawing (the small jar, the rainbow arcs, the divider, the real jar) runs at the same screen px/s, set from the small jar's draw time. Keep it in one constant, INTRO_PEN_PX_PER_S.
- Exact artwork: whatever ends on the page is drawn on from the real artwork's own SVG paths. That means every stroke of the jar drawing, including the rim's inner opening and the lid double edge, plus the real divider path. No morph and no blend: the drawn line is the real jar and divider.
- Black only: solid black ink, thin line in the jar's stroke weight.

Sequence (~8s, skippable):
1. Blank (0–0.3s): white page.
2. Small jar (0.3–1.5s): the real jar drawing scaled to ~1/3 and centred, drawn on like a pen. Every stroke goes in a natural pen order: left wall, base, right wall, then the rim and lid lines.
3. Fill (1.5–3.3s): black ink fills from the bottom in ~9 clear steps, each held 2 frames. The surface is a wavy line that sloshes side to side with a different wave shape each frame, plus a small meniscus at the glass. Each step should be an obvious rise.
4. Spill (3.3–4.9s): the ink domes above the rim (2–3 frames). Then foam bubbles over and visibly travels: wide, shallow, open scallop arcs pile on the rim in rows, then roll down both outside walls in ~4 waves. Each wave starts at the rim and creeps further down each frame until it reaches the bottom on both sides. Small circle bubbles rise, drift and pop.
5. Rainbow split (4.9–6.2s): the foam settles into two strands, one from the top of the foam on each side, never from random spots.
   - They arc out slowly in stop motion like two halves of a rainbow: up and outward, then curving down toward the bottom of the screen.
   - Meanwhile the small jar and its ink fade out in steps.
   - The left arc lands at the bottom end of the sidebar divider.
   - The right arc lands at the start point of the real jar's pen route (the bottom of its left wall).
6. Trace (6.2–8.0s), at the same pen speed:
   - The left strand draws the divider bottom to top along the real divider path.
   - The right strand traces the real jar's strokes in pen order. At the end of a stroke it lifts and jumps to the next, never straying outside the drawing.
   - At the end, every stroke of the real jar is drawn exactly in place.
7. Handoff (8.0s+): nothing swaps, because the drawn paths are the real jar and divider. The sidebar fades in top to bottom, the items fall, and "scroll down!" draws.

Build:
1. Load the real jar artwork's SVG paths (every stroke, page coordinates measured from the DOM) and the real divider path. Choose a pen order and a direction for each stroke.
2. Draw on with stroke-dasharray/dashoffset on these exact paths, stepped at 12fps at INTRO_PEN_PX_PER_S. The small jar is the same paths scaled ~1/3 around the screen centre, at the same on-screen pen speed.
3. Fill: a black shape clipped to the jar interior, ~9 discrete level steps, with a seeded-noise wavy top (a new seed each frame, deterministic across loads).
4. Spill:
   - Dome: ~3 precomputed frames.
   - Foam: rows of wide, shallow, open arcs along the rim and outside walls, each wave revealed further down each frame.
   - Bubbles: small stroked circles that rise, wobble and pop in one frame.
5. Rainbow:
   - Two precomputed curves from the foam tops: an outward arch curving down to the landing points (the divider bottom and the jar's first stroke start).
   - The strand draws along the curve at pen speed in 12fps steps.
   - Its tail erases behind it like thread, keeping a fixed visible length of ~120px.
6. Trace:
   - The left head continues straight into the divider draw.
   - The right head continues into the jar's first stroke, then each stroke in order.
   - The thread tail is used up, so only the artwork stays.
7. Rendering:
   - One SVG overlay exactly over the real jar and divider, with attributes written in rAF.
   - No React state per frame, and everything precomputed before frame 1.
   - At the end the overlay equals the real paths, so a same-frame visibility toggle shows no change.
   - Preload jar item images.

Kept:
- The full version plays once per session. Otherwise there's a 1.5s short version: just beat 6, fast.
- Phones get the short version only.
- No intro with reduced motion or when returning from a case study.
- A click or any key skips.
- ?intro=1 replays and ?slow=4 slows.

Done when:
- The fill visibly rises step by step, and the foam visibly spills and travels down both sides.
- The split leaves from the foam tops as two slow rainbow arcs in stop motion.
- The trace is the real artwork: a pixel diff of the final frame against the page with no intro shows nothing.
- All line drawing runs at the same pen speed.
- design-system.md's Intro section is updated.

## Reference notes
- **kenjilambert.com** (Amy's reference for the shakiness). There's no code filter on it. The wobble is hand-drawn frame-by-frame animation baked into files: an MP4 loading animation (4.8s, 320×290) and animated WebP drawings (a 72-frame logo at about 30fps; art pieces at about 15fps). Every frame differs from the one before, in a repeating cycle of 3 drawings: the classic boil loop. **Adopted:** the same feel in code. A turbulence displacement filter cycles 3 seeds, one per drawing, on the intro's 12fps clock, at about 0.8px.
- **anthea_irl on X** (the first reference): the video wouldn't load in the browser I had, so I couldn't watch it.
- **The jar artwork's SVG** is a single filled shape traced by potrace, not separate strokes. "Drawn on from the artwork's own paths" is done by revealing the artwork along strokes extracted from its ink (lib/jar-outline.ts), so the drawn result is the artwork itself.
- **Landing point:** the right strand lands at the bottom of the jar's **right** wall, not the left. The left wall's foot sits right under the small jar, so an arc landing there had to cut straight down through it. The pen order is therefore: up the right wall, the rim and lid lines, down the left wall, across the base.

## v3 proposal: one line that spirals, and text that "finds its font"

Amy's ideas (Nov 2026), written up before building. Everything else in v2 stays: the stop-motion clock, the boil, one pen speed, the foam, the two rainbow strands, and the exact artwork at the end.

### A. The spiral (parked: not planned)
> **Parked.** Amy: "if ur doing the foam then we dont need the spiral, this is just two diff ideas". The intro keeps the foam, then the two rainbow strands (v2). This is kept only as an alternative to the foam overflow.

Amy: "have a line come in do a loop make like a spiral and then separate into the two different sketches … more cohesive."

1. **One line out.** As the foam settles, a single strand rises from the top of the foam, out of the middle of the rim, instead of two.
2. **The spiral.** It sweeps up and out, then curls into a spiral above the jar, in the middle of the screen. It's about 2 turns, tightening inward to a point, drawn at the pen speed in 12fps steps. The small jar and its ink fade out in steps while it curls.
3. **The split.** From the spiral's centre the line separates into two strands that unwind outward in opposite directions. The spiral is used up as thread: its coils erase from the outside in as the strands pull away. One strand arcs down-left to the foot of the divider, the other down-right to the foot of the jar's right wall.
4. **Trace.** As now: the left strand draws the divider bottom to top, and the right strand draws the real jar stroke by stroke. The last frame is exactly the page.

So the story reads as one continuous line: jar → overflow → one strand → spiral → two drawings.

- **Spiral:** an Archimedean spiral, outer radius about ⅙ of the window height, 2 turns, its tail joining the strand smoothly. Precompute it as one polyline, plus the two unwinding strands from its centre.
- **Thread:** a fixed visible length (INTRO_THREAD_PX) while travelling. During the split, the coil erases from its outer end at the same pen speed the strands are drawn.
- **Time:** about +0.5s overall versus v2.

### B. Text loading in (waiting for Amy's go-ahead)
Amy: "the words about to load in before they actually do, like when you're changing fonts before it settles on one" or "a background that indicates where the text will be".

**Option 1, the font flicker (recommended).** When the sidebar loads, each line of text flickers through other typefaces on the intro's 12fps clock before settling on Geist: Gaegu (the hand), a serif, a mono, Roboto. It's 4–6 drawings per line (about 0.4s), lines starting 70ms apart, top to bottom.
- No layout shift. Each line keeps its final box, and the flickering versions are scaled to that box's width, so nothing reflows.
- Only fonts already on the page are used (Geist, Gaegu, Roboto) plus the system serif and mono, so nothing extra downloads.
- Reduced motion: text just fades in.
- Why I recommend it: it's stop-motion and hand-made, the same family as the boil. It reads as the page being drawn, not as a loading screen.

**Option 2, placeholders.** Before the text arrives, each line's spot shows a soft rounded bar the width of the line, drawn in the same boiling pen line. Each bar wipes into its text, top to bottom. This is clearer about where things will be, but it's closer to a familiar app "skeleton" look.

**Could combine:** placeholder outlines draw first, then the text flickers in inside them. That's richer, but busier at a moment when the jar is also handing off. I'd start with Option 1 alone.

Applies to: the sidebar on the full intro, and the short version. The case-study pages and the work grid stay as they are.

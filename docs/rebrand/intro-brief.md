# Intro brief v2: the overflowing jar

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

Amy's ideas (Nov 2026), written up before building. Everything else in v2 stays: the stop-motion clock, the boil, one pen speed, and the exact artwork at the end.

### A. The spiral (replaces the two rainbow strands)
Amy: "have a line come in do a loop make like a spiral and then separate into the two different sketches … more cohesive."

1. **One line out.** As the foam settles, a single strand rises from the top of the foam, out of the middle of the rim, instead of two.
2. **The spiral.** It sweeps up and out, then curls into a spiral above the jar, in the middle of the screen. It's about 2 turns, tightening inward to a point, drawn at the pen speed in 12fps steps. The small jar and its ink fade out in steps while it curls.
3. **The split.** From the spiral's centre the line separates into two strands that unwind outward in opposite directions. The spiral is used up as thread: its coils erase from the outside in as the strands pull away. One strand arcs down-left to the foot of the divider, the other down-right to the foot of the jar's right wall.
4. **Trace.** As now: the left strand draws the divider bottom to top, and the right strand draws the real jar stroke by stroke. The last frame is exactly the page.

So the story reads as one continuous line: jar → overflow → one strand → spiral → two drawings.

- **Spiral:** an Archimedean spiral, outer radius about ⅙ of the window height, 2 turns, its tail joining the strand smoothly. Precompute it as one polyline, plus the two unwinding strands from its centre.
- **Thread:** a fixed visible length (INTRO_THREAD_PX) while travelling. During the split, the coil erases from its outer end at the same pen speed the strands are drawn.
- **Time:** about +0.5s overall versus v2.

### B. Text loading in
Amy: "the words about to load in before they actually do, like when you're changing fonts before it settles on one" or "a background that indicates where the text will be".

**Option 1, the font flicker (recommended).** When the sidebar loads, each line of text flickers through other typefaces on the intro's 12fps clock before settling on Geist: Gaegu (the hand), a serif, a mono, Roboto. It's 4–6 drawings per line (about 0.4s), lines starting 70ms apart, top to bottom.
- No layout shift. Each line keeps its final box, and the flickering versions are scaled to that box's width, so nothing reflows.
- Only fonts already on the page are used (Geist, Gaegu, Roboto) plus the system serif and mono, so nothing extra downloads.
- Reduced motion: text just fades in.
- Why I recommend it: it's stop-motion and hand-made, the same family as the boil. It reads as the page being drawn, not as a loading screen.

**Option 2, placeholders.** Before the text arrives, each line's spot shows a soft rounded bar the width of the line, drawn in the same boiling pen line. Each bar wipes into its text, top to bottom. This is clearer about where things will be, but it's closer to a familiar app "skeleton" look.

**Could combine:** placeholder outlines draw first, then the text flickers in inside them. That's richer, but busier at a moment when the jar is also handing off. I'd start with Option 1 alone.

Applies to: the sidebar on the full intro, and the short version. The case-study pages and the work grid stay as they are.

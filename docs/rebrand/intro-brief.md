# Intro brief: the overflowing jar
Replaces step 8 / Part 4.2. Amy: "the jar is small in the center like a proper load in and the fill is just with black, it will just animate like how disney animates water overflowing out of a cup like you can see slowly one by one the layer is rising and then it moves out like in stop motion, and then the lines disconnect, one goes to the left to form the line and one goes to the right and becomes the jar EXACTLY like it exactly becomes the jar"

## Sequence (~4.5s)
1. Blank load-in (0–0.3s): white page only. No sidebar, divider or items.
2. Small jar (0.3–0.9s): about 1/4 the real jar's height, centred on screen. It's the real jar's traced line scaled down, drawing on like a pen.
3. Fill (0.9–2.2s): solid black ink rises inside in visible steps (stop motion), one layer at a time. The top surface is a wobbly line that sloshes slightly every frame, like a Disney water surface.
4. Overflow (2.2–3.0s): ink reaches the rim and bulges above it in a cartoon surface-tension dome, then spills over both sides of the lip. Two thick black drips run down the outside walls, with tapered tails and round droplet heads. Stop motion.
5. Disconnect (3.0–4.2s): the drips thin into lines and the ink drains into them. The jar line breaks at the bottom into two strands.
   - LEFT strand: the tip leads like a needle, and the left half of the jar unspools behind it as thread. It travels left, then lands exactly on the sidebar divider.
   - RIGHT strand: the right half stretches up and right, then morphs point for point into the real jar's outline at the real jar's size and position.
6. Handoff (4.2–4.5s): the drawn line is pixel-identical to the real jar and divider, so they swap in with no visible jump. The sidebar fades in top to bottom, items fall in, and "scroll down!" draws as now.

## Motion
- Fill and overflow: 12fps on twos, so each frame is a new pose with slight boil, not a smooth tween.
- Line travel and morph: smooth 60fps (constant INTRO_LINE_FPS).
- Ink is pure black #000. Stroke = LINE_STROKE_WIDTH. No blue or any other colour.
- The needle starts with an ease-in pull and settles softly. Nothing overshoots its final position.

## Build
1. Resample the traced one-line jar (047ba4d) by arc length to ~400 points.
2. Small jar = the same points scaled ~0.25× around the viewport centre.
3. Ink:
   - Clip a path to the jar interior, built from the outline.
   - The per-frame top edge is a seeded-noise wobbly polyline (deterministic).
   - The level rises in ~8 discrete steps.
   - Precompute every frame's d.
4. Dome (~6 keyframes) and drips (~8 keyframes): precompute them and quantise to the 12fps clock.
5. Disconnect:
   - Split the points at the bottom centre.
   - Left: a fixed-thread-length walk along a route from the jar to the bottom-left, then up the divider. Measure the divider path from the DOM on mount, consume points from the far end, and end exactly on the divider.
   - Right: per-point interpolation from small-jar to the real jar's traced outline at its measured on-screen box, with a slight stagger along the line so it reads as stretching, not scaling.
6. Handoff:
   - Assert the paths match the targets within 0.5px.
   - Swap the real jar and divider in and the intro layer out in the same frame.
   - Then start the sidebar fade and the item drop.
7. Rendering: one SVG overlay, with d written in rAF. No React state per frame. Precompute everything before the first frame, and preload jar item images during the intro.

## Kept rules
- Full version once per session. After that, a 1s short version: the small jar draws, then morphs straight into the jar and divider.
- No intro with reduced motion or when returning from a case study.
- A click or any key skips.
- ?intro=1 replays and ?slow=4 slows it down.
- Phones get the short version only.

## Done when
- The ink rises in clear steps and overflows with a dome and two drips, so it looks hand-animated.
- The left strand lands exactly on the divider and the right strand becomes the real jar exactly, with no jump at the handoff frame.
- It's smooth at 1536×696 and 1920×1080 with a 4× CPU slowdown.
- design-system.md has an "Intro" motion section, and brief.md links to intro-brief.md.

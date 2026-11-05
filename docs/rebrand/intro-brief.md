# Intro brief v7: one thin line, released like a paper ribbon

*Replaces v4–v6. Written 2026-11-05 after Amy watched v6 (bf6d631).*

## What stays

- A rough dot at the **exact viewport centre**.
- The **original jar drawing**, traced by the pen along its own strokes (v5). The page keeps the original jar.
- The stop-motion squiggle (boil) on twos. The line's *movement* stays smooth (v6).
- The first visit can't be skipped. The repeat and phone version (`?intro=2`) stays as it is: the divider and jar draw on together in 0.7s.
- `?intro=1` replays the full intro and `?slow=4` slows it.

## Amy's notes on v6, and the fix for each

| # | Her note | Fix |
|---|---|---|
| 1 | "the line thicknesses dont match. the spiral is much thicker than the jar lines - it should be the thickness of the jar" | The dot, loop and both strands use the jar's **on-screen** stroke width, measured live (see "Line weight"). |
| 2 | "after the spiral, the lines pause and then overlap weirdly. it should be a natural flow from the spiral and then separates into two tails" | **No pause and no crossing.** The pen never stops between the loop and the release, and the strands never cross each other or the loop. |
| 2b | "the spiral separating from different sides so after the spiral releases into a full circle … one end goes away into the line and the other becomes a jar … imitate a paper flowing … that type of smooth up and down release" | The spiral settles into **one loose full circle**, which **opens on two opposite sides** and **releases like a paper ribbon**, floating off in a soft up-and-down wave. |

## Line weight

- The jar drawing is an SVG scaled into its box, so its real stroke width on screen is `stroke-width × (rendered width ÷ viewBox width)`. Measure this at start and on resize.
- Draw the dot, loop and strands at exactly that width, with `vector-effect: non-scaling-stroke`, round caps and round joins.
- The divider keeps its own width. Where the left strand becomes the divider, its width eases to the divider's over the last ~80px so there's no step.
- **Done when** a zoomed screenshot shows the loop line and the jar line the same thickness.

## The sequence (about 2.6s)

| # | Beat | Time | What you see |
|---|---|---|---|
| 1 | **Dot** | 0–0.25s | A small rough dot at the exact centre. |
| 2 | **Spiral into a circle** | 0.25–1.0s | The pen spirals lazily outward (about 1 turn), then settles into **one loose, slightly lumpy full circle**, about 60px across. The pen comes round and just overlaps its start, so it reads as a closed hand-drawn loop. It slows softly as it closes but **never stops**. |
| 3 | **Release** | 0.9–1.6s | This overlaps the close by 0.1s. The circle **opens at two points on opposite sides**: the lower-left (towards the divider) and the right (towards the jar). It's like a paper ring being cut and let go. The two free ends peel away from the circle along its own tangent. The loop **unrolls from both sides at once**: the circle shrinks as its line feeds into the two tails, until nothing of the circle is left. |
| 4 | **Ribbon flow** | 1.0–1.9s | Each tail travels like a strip of paper floating down. Its path has a **soft up-and-down wave** (one or two gentle crests, about 12–20px amplitude, decaying as it arrives) instead of a straight line or a single arc. The wave rides along the tail, so the trailing line follows the head's path, ribbon style. The right tail sets off 0.1s before the left one, and both move with an ease-in-out. |
| 5 | **Divider and jar** | 1.4–2.5s | The left tail reaches the bottom of the divider and runs up it. The right tail reaches the start of the jar's pen route and traces the original jar. Each one flows in at the speed it arrived at, with no pause. |
| 6 | **Settle** | 2.5–2.6s | The boil eases to still. The sidebar fades in, the items fall, and "scroll down!" draws. |

## Flow rules (no pause, no overlap)

- **Continuous speed:** the pen's speed is continuous from the dot to the end. It slows, but never reaches 0 between beats, and there are no hold frames.
- **Continuous direction:** every join (spiral to circle, circle to tail, tail to divider, tail to jar) has matching tangents, with no kinks.
- **No crossing:** the two tails leave in opposite directions and their paths never cross each other or the remaining loop. If the centre is close to the jar, the right tail takes a short rising wave rather than doubling back over the loop.
- **Tail length:** each tail's visible length stays roughly constant while it travels. The back of the line erases at the same speed the head draws, so you see a moving ribbon, not a growing scribble. Once on the divider or jar, the erasing stops and the drawing stays.
- **Wave motion:** the wave is in the path, not a wobble. Shake still comes only from the boil (about 0.5px during beats 2–4, 0.8px on the jar).

## Done when

- The loop and strands look exactly as thick as the jar's lines.
- The spiral closes into one circle, which opens on two sides and floats off as two ribbon tails with a gentle wave, with no pause, overlap or crossing.
- The dot is at the exact centre and the end frame is the original jar, at 1536×696 and 1920×1080 (plus 2560×1440 if possible).

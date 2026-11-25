"use client";

import { motion, useReducedMotion } from "framer-motion";
import styles from "./ScrollHint.module.css";
import { content } from "@/lib/content";
import { EASE_OUT, SCROLL_HINT_DRAW_S, SCROLL_HINT_LABEL_S, SCROLL_HINT_OUT_S, slowTransition } from "@/lib/motion";
import { buildWobblyCurvePath, buildWobblyLinePath, LINE_STROKE_WIDTH, type CurveSegment } from "@/lib/wobbly";

const copy = content.en.sidebar.modes;
/** How long a stroke's show/hide flip takes: effectively instant. */
const STROKE_FLIP_S = 0.01;

// The curly arrow, drawn in a VIEW_W × VIEW_H box (scaled with the jar):
// down from under the label, one loop-de-loop, then on down to an open
// arrowhead. Low wobble, like the jar's ink.
const VIEW_W = 60;
const VIEW_H = 100;
const LOOP: CurveSegment[] = [
  [[34, 4], [42, 20], [38, 38], [26, 46]],
  [[26, 46], [12, 54], [4, 42], [14, 35]],
  [[14, 35], [24, 28], [32, 44], [26, 62]],
  [[26, 62], [22, 74], [20, 84], [20, 95]],
];
const ARROW = buildWobblyCurvePath(130, LOOP, 0.4);
/** Stroke width in the box's own units: the arrow is drawn ~80px wide at
 * 1536×696, so this lands on the jar's ink (LINE_STROKE_WIDTH) there, and
 * scales with the jar like its ink does. (Not non-scaling-stroke: that
 * breaks the pen-draw's pathLength dashes.) */
const ARROW_STROKE = (LINE_STROKE_WIDTH * VIEW_W) / 80;
const HEAD = [
  buildWobblyLinePath(131, [13, 87], [20, 95], 0.15),
  buildWobblyLinePath(132, [20, 95], [27, 88], 0.15),
];
// `short`: the same loop with a much shorter tail after it (the footer's
// "back to top"), in a box SHORT_VIEW_H tall.
const SHORT_VIEW_H = 76;
const SHORT_LOOP: CurveSegment[] = [...LOOP.slice(0, 3), [[26, 62], [24, 66], [22, 69], [21, 72]]];
const SHORT_ARROW = buildWobblyCurvePath(130, SHORT_LOOP, 0.4);
const SHORT_HEAD = [
  buildWobblyLinePath(131, [15, 66], [21, 72], 0.15),
  buildWobblyLinePath(132, [21, 72], [27, 66], 0.15),
];

// `up` + `short` (the footer's "back to top"): its own drawing, drawn
// pointing up (not the down arrow flipped, whose head sat off the line's
// end): from just above the label, up with one loop, to an open head that
// follows the line's last direction. In a VIEW_W x UP_VIEW_H box.
// Shortened 2026-11-25 (it read a little long): the same loop, with less
// tail under it and less shaft above it.
const UP_VIEW_H = 54;
const UP_LOOP: CurveSegment[] = [
  [[30, 52], [35, 45], [37, 38], [31, 33]],
  [[31, 33], [23, 27], [13, 32], [17, 38]],
  [[17, 38], [22, 45], [34, 40], [34, 28]],
  [[34, 28], [34, 20], [32, 12], [30, 5]],
];
const UP_ARROW = buildWobblyCurvePath(140, UP_LOOP, 0.35);
const UP_HEAD = [
  buildWobblyLinePath(141, [23.5, 12.5], [30, 5], 0.12),
  buildWobblyLinePath(142, [30, 5], [36, 12], 0.12),
];
/** The footer's arrow is drawn small (90px wide), so its line is heavier
 * than the jar's ink to read at that size. */
const UP_STROKE = ARROW_STROKE * 2.2;

/**
 * A little doodle annotation, in the style of a café's hand-drawn menu
 * board: a small lowercase label and a thin curly arrow. Used for:
 * - "scroll down!" beside the jar (default; Home/JarView.tsx puts it in the
 *   jar's wrapper, so it moves and scales with the jar). Desktop only (CSS)
 *   — mobile has its tap cues.
 * - "jump to jar" at the bottom of the work view's right column (`up`: the
 *   arrow points up, label under it; Home/WorkGrid.tsx).
 * While `shown`, the arrow pen-draws on and the label fades in; when it
 * stops being shown it fades straight out. Also a button (`onActivate`).
 * Reduced motion: it just appears.
 */
export default function ScrollHint({
  shown,
  onActivate,
  label = copy.scrollHint,
  ariaLabel = copy.toWorkLabel,
  up = false,
  short = false,
  className = styles.besideJar,
}: {
  shown: boolean;
  onActivate: () => void;
  label?: string;
  ariaLabel?: string;
  /** Arrow points up (from under the label) instead of down. */
  up?: boolean;
  /** A shorter tail after the loop. */
  short?: boolean;
  /** Where it sits; defaults to beside the jar. */
  className?: string;
}) {
  const reduced = useReducedMotion() ?? false;
  const upDrawn = up && short;
  const viewH = upDrawn ? UP_VIEW_H : short ? SHORT_VIEW_H : VIEW_H;
  const strokes = upDrawn ? [UP_ARROW, ...UP_HEAD] : short ? [SHORT_ARROW, ...SHORT_HEAD] : [ARROW, ...HEAD];
  const draw = reduced ? { duration: 0 } : slowTransition({ duration: SCROLL_HINT_DRAW_S, ease: EASE_OUT });
  const fadeIn = reduced ? { duration: 0 } : slowTransition({ duration: SCROLL_HINT_LABEL_S, ease: EASE_OUT });
  const fadeOut = reduced ? { duration: 0 } : slowTransition({ duration: SCROLL_HINT_OUT_S, ease: "easeOut" as const });

  return (
    <motion.button
      type="button"
      className={`${styles.hint} ${up ? styles.up : ""} ${upDrawn ? styles.upDrawn : ""} ${className}`}
      aria-label={ariaLabel}
      tabIndex={shown ? 0 : -1}
      initial={false}
      animate={{ opacity: shown ? 1 : 0 }}
      transition={shown ? { duration: 0 } : fadeOut}
      style={{ pointerEvents: shown ? "auto" : "none" }}
      onClick={onActivate}
    >
      <motion.span
        className={styles.label}
        initial={{ opacity: 0 }}
        animate={{ opacity: shown ? 1 : 0 }}
        transition={shown ? fadeIn : { duration: 0 }}
      >
        {label}
      </motion.span>
      <svg
        className={styles.arrow}
        viewBox={`0 0 ${VIEW_W} ${viewH}`}
        fill="none"
        aria-hidden="true"
      >
        {strokes.map((d, i) => (
          <motion.path
            key={i}
            d={d}
            stroke="currentColor"
            strokeWidth={upDrawn ? UP_STROKE : ARROW_STROKE}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={shown ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
            // The head draws once the line reaches it. Each stroke is hidden
            // while undrawn (its round cap would leave a dot); those flips
            // take STROKE_FLIP_S, not 0 — a zero-length animation with no
            // delay was skipped when it re-ran, leaving the line drawn but
            // invisible after scrolling away and back.
            transition={
              shown
                ? {
                    ...draw,
                    delay: i === 0 ? 0 : (draw.duration ?? 0) * 0.85,
                    opacity: { duration: STROKE_FLIP_S, delay: i === 0 ? 0 : (draw.duration ?? 0) * 0.85 },
                  }
                : { duration: STROKE_FLIP_S, delay: SCROLL_HINT_OUT_S }
            }
          />
        ))}
      </svg>
    </motion.button>
  );
}

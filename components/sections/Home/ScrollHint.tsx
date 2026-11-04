"use client";

import { motion, useReducedMotion } from "framer-motion";
import styles from "./ScrollHint.module.css";
import { content } from "@/lib/content";
import { EASE_OUT, SCROLL_HINT_DRAW_S, SCROLL_HINT_LABEL_S, SCROLL_HINT_OUT_S, slowTransition } from "@/lib/motion";
import { buildWobblyCurvePath, buildWobblyLinePath, LINE_STROKE_WIDTH, type CurveSegment } from "@/lib/wobbly";

const copy = content.en.sidebar.modes;

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

/**
 * A little doodle annotation, in the style of a café's hand-drawn menu
 * board: a small lowercase label and a thin curly arrow. Two of them:
 * - "scroll down!" beside the jar (default; Home/JarView.tsx puts it in the
 *   jar's wrapper, so it moves and scales with the jar). Desktop only (CSS)
 *   — mobile has its tap cues.
 * - "jump to jar" at the bottom of the work list (`up`: the arrow points up,
 *   label under it; Home/WorkGrid.tsx, every screen size).
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
  className = styles.besideJar,
}: {
  shown: boolean;
  onActivate: () => void;
  label?: string;
  ariaLabel?: string;
  /** Arrow points up (from under the label) instead of down. */
  up?: boolean;
  /** Where it sits; defaults to beside the jar. */
  className?: string;
}) {
  const reduced = useReducedMotion() ?? false;
  const draw = reduced ? { duration: 0 } : slowTransition({ duration: SCROLL_HINT_DRAW_S, ease: EASE_OUT });
  const fadeIn = reduced ? { duration: 0 } : slowTransition({ duration: SCROLL_HINT_LABEL_S, ease: EASE_OUT });
  const fadeOut = reduced ? { duration: 0 } : slowTransition({ duration: SCROLL_HINT_OUT_S, ease: "easeOut" as const });

  return (
    <motion.button
      type="button"
      className={`${styles.hint} ${up ? styles.up : ""} ${className}`}
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
      <svg className={styles.arrow} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} fill="none" aria-hidden="true">
        {[ARROW, ...HEAD].map((d, i) => (
          <motion.path
            key={i}
            d={d}
            stroke="currentColor"
            strokeWidth={ARROW_STROKE}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={shown ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
            // The head draws once the line reaches it.
            transition={
              shown
                ? { ...draw, delay: i === 0 ? 0 : (draw.duration ?? 0) * 0.85, opacity: { duration: 0, delay: i === 0 ? 0 : (draw.duration ?? 0) * 0.85 } }
                : { duration: 0, delay: SCROLL_HINT_OUT_S }
            }
          />
        ))}
      </svg>
    </motion.button>
  );
}

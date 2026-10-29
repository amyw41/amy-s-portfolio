"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { motion, useAnimate, useReducedMotion } from "framer-motion";
import styles from "./ModeToggle.module.css";
import type { HomeMode } from "./Sidebar";
import { content } from "@/lib/content";
import {
  CRAYON_ERASE_S,
  CRAYON_HINT_OPACITY,
  CRAYON_HINT_S,
  CRAYON_HINT_STROKES,
  CRAYON_STAGGER_S,
  CRAYON_STROKE_S,
  EASE_IN,
  EASE_OUT,
  slowMs,
} from "@/lib/motion";
import { buildCrayonStrokes, buildWobblyRectPath, LINE_STROKE_WIDTH } from "@/lib/wobbly";

const copy = content.en.sidebar.modes;

// jar = red, work = blue (the site's two category colours, lib/tokens.css).
const MODES: { mode: HomeMode; color: string }[] = [
  { mode: "jar", color: "var(--c-red)" },
  { mode: "work", color: "var(--c-blue)" },
];

// Geometry, in px (the SVGs are drawn 1:1). Each label gets an equal-width
// segment; its shading fills the segment with SHADE_INSET all round.
const SEGMENT_W = 60;
const TRACK_H = 32;
const SHADE_INSET = 4;
const TRACK_W = SEGMENT_W * MODES.length;
const SHADE_W = SEGMENT_W - SHADE_INSET * 2;
const SHADE_H = TRACK_H - SHADE_INSET * 2;
/** Low wobble: slightly imperfect pen lines, like the jar's ink — not wavy. */
const PEN_AMPLITUDE = 0.25;
/** The crayon: how wide each stroke is, and how many fill a side. */
const CRAYON_W = 5;
const CRAYON_STROKES = 11;

/** Seconds, scaled by ?slow. */
const slowS = (s: number) => slowMs(s * 1000) / 1000;

type ShadeState = "on" | "off" | "hint";

/**
 * One side's crayon shading: loose diagonal strokes, run through a grain
 * filter so they read as waxy crayon — grainy, a little broken, building up
 * where they overlap.
 * - on: coloured in stroke by stroke, like a quick scribble;
 * - off: the shading fades out (from on), or the hint strokes retract;
 * - hint (hovering the unpicked side): a couple of faint strokes.
 * Starts in whatever state it mounts in, with no animation.
 */
function CrayonShade({ seed, color, state, x }: { seed: number; color: string; state: ShadeState; x: number }) {
  const reduced = useReducedMotion() ?? false;
  const [scope, animate] = useAnimate<SVGGElement>();
  const strokes = useMemo(() => buildCrayonStrokes(seed, SHADE_W, SHADE_H, CRAYON_STROKES, CRAYON_W), [seed]);
  const filterId = `crayon-${useId().replace(/:/g, "")}`;
  // The state it was last animated to, so leaving "on" (fade) and leaving
  // "hint" (retract) can differ.
  const prevRef = useRef<ShadeState>(state);
  // Bumped per change, so a superseded sequence stops before resetting.
  const seqRef = useRef(0);
  const [initial] = useState(state);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = state;
    if (prev === state) return;
    const seq = ++seqRef.current;
    const group = scope.current;
    const paths = [...group.querySelectorAll("path")];
    const d = (s: number) => (reduced ? 0 : slowS(s));
    // Draws a stroke on or off. An undrawn stroke is also hidden: at
    // pathLength 0 its round caps would still leave a dot.
    const draw = (p: SVGPathElement, on: boolean, duration: number, delay = 0) => {
      if (on) animate(p, { opacity: 1 }, { duration: 0, delay });
      animate(p, { pathLength: on ? 1 : 0 }, { duration, delay, ease: on ? EASE_OUT : EASE_IN });
      if (!on) animate(p, { opacity: 0 }, { duration: 0, delay: delay + duration });
    };

    if (state === "on") {
      animate(group, { opacity: 1 }, { duration: 0 });
      // Hint strokes already drawn stay put; the rest scribble in.
      paths.forEach((p, i) => draw(p, true, d(CRAYON_STROKE_S), d(CRAYON_STAGGER_S) * i));
    } else if (state === "hint") {
      animate(group, { opacity: CRAYON_HINT_OPACITY }, { duration: 0 });
      paths.forEach((p, i) => (i < CRAYON_HINT_STROKES ? draw(p, true, d(CRAYON_HINT_S)) : draw(p, false, 0)));
    } else if (prev === "hint") {
      // Leaving a hover hint: the strokes retract.
      paths.forEach((p) => draw(p, false, d(CRAYON_HINT_S)));
    } else {
      // Leaving "on": the shading fades away, then the strokes reset
      // (undrawn, at full opacity) ready to scribble in again next time.
      (async () => {
        await animate(group, { opacity: 0 }, { duration: d(CRAYON_ERASE_S), ease: EASE_OUT });
        if (seq !== seqRef.current) return;
        paths.forEach((p) => draw(p, false, 0));
        animate(group, { opacity: 1 }, { duration: 0 });
      })();
    }
  }, [state, reduced, animate, scope]);

  return (
    <svg
      className={styles.shade}
      style={{ left: x + SHADE_INSET, top: SHADE_INSET }}
      width={SHADE_W}
      height={SHADE_H}
      viewBox={`0 0 ${SHADE_W} ${SHADE_H}`}
      aria-hidden="true"
    >
      <defs>
        {/* Crayon texture: roughen the strokes' edges a touch, then knock
         * small holes in them where the paper's tooth would skip. */}
        <filter id={filterId} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="2" xChannelSelector="R" yChannelSelector="G" result="rough" />
          <feTurbulence type="fractalNoise" baseFrequency="1.8" numOctaves="1" seed={seed + 1} result="tooth" />
          <feColorMatrix in="tooth" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.6" result="grain" />
          <feComposite in="rough" in2="grain" operator="in" />
        </filter>
      </defs>
      <g ref={scope} filter={`url(#${filterId})`} style={{ opacity: initial === "hint" ? CRAYON_HINT_OPACITY : 1 }}>
        {strokes.map((s, i) => {
          const drawn = initial === "on" || (initial === "hint" && i < CRAYON_HINT_STROKES);
          return (
            <motion.path
              key={i}
              d={s.d}
              fill="none"
              stroke={color}
              strokeOpacity={s.opacity}
              strokeWidth={CRAYON_W}
              strokeLinecap="round"
              initial={{ pathLength: drawn ? 1 : 0, opacity: drawn ? 1 : 0 }}
            />
          );
        })}
      </g>
    </svg>
  );
}

/**
 * The jar / work switch, top right of the stage: a segmented toggle drawn
 * by hand — one pill track holding both labels — with the picked side
 * shaded in crayon (jar red, work blue) instead of a knob. Picking the
 * other side scribbles it in stroke by stroke while the old shading fades;
 * hovering the unpicked side sketches a faint hint. Reduced motion: the
 * shading just appears.
 */
export default function ModeToggle({ mode, onChange }: { mode: HomeMode; onChange: (mode: HomeMode) => void }) {
  const track = useMemo(() => buildWobblyRectPath(60, TRACK_W - 1, TRACK_H - 1, (TRACK_H - 1) / 2, PEN_AMPLITUDE), []);
  const [hovered, setHovered] = useState<HomeMode | null>(null);

  return (
    <div className={styles.toggle} role="group" aria-label={copy.label} style={{ width: TRACK_W, height: TRACK_H }}>
      {MODES.map(({ mode: m, color }, i) => (
        <CrayonShade
          key={m}
          seed={30 + i}
          color={color}
          x={i * SEGMENT_W}
          state={m === mode ? "on" : m === hovered ? "hint" : "off"}
        />
      ))}

      <svg
        className={styles.track}
        width={TRACK_W}
        height={TRACK_H}
        viewBox={`-0.5 -0.5 ${TRACK_W} ${TRACK_H}`}
        fill="none"
        aria-hidden="true"
      >
        <path d={track} stroke="#000" strokeWidth={LINE_STROKE_WIDTH} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>

      {MODES.map(({ mode: m }) => (
        <button
          key={m}
          type="button"
          className={`${styles.button} ${m === mode ? styles.active : ""}`}
          style={{ width: SEGMENT_W }}
          aria-pressed={m === mode}
          onClick={() => onChange(m)}
          onPointerEnter={() => setHovered(m)}
          onPointerLeave={() => setHovered((h) => (h === m ? null : h))}
        >
          {copy[m]}
        </button>
      ))}
    </div>
  );
}

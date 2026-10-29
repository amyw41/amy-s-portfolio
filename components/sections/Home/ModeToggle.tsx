"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import styles from "./ModeToggle.module.css";
import type { HomeMode } from "./Sidebar";
import { content } from "@/lib/content";
import { EASE_IN, EASE_OUT, MODE_FILL_S, MODE_SLOSH_PX, MODE_TILT_DEG, MODE_TILT_MS, slowMs } from "@/lib/motion";
import { buildWashPath, buildWobblyRectPath } from "@/lib/wobbly";

const copy = content.en.sidebar.modes;

// Geometry, in px (the doodles are drawn 1:1 in an ICON × ICON box).
const ICON = 24;
/** The doodles' ink: a touch heavier than LINE_STROKE_WIDTH, which reads
 * too faint at this size. */
const DOODLE_STROKE = 0.75;
/** Low wobble: slightly imperfect pen lines, like the jar's ink — not wavy. */
const PEN_AMPLITUDE = 0.18;
/** The pen tail at the end of each tiny loop, px. */
const PEN_TAIL = 0.6;
/** The wash is laid on a little off the lines, like a quick colouring-in. */
const WASH_OFFSET: [number, number] = [0.8, 0.7];
const WASH_OPACITY = 0.55;

/** A rounded rect at (x, y), as SVG markup: the ink, and the same shape
 * nudged by WASH_OFFSET for the wash's clip (a <clipPath> only takes bare
 * shapes, so the offset goes on each path, not a wrapping group). */
function rectAt(seed: number, x: number, y: number, w: number, h: number, r: number) {
  const d = buildWobblyRectPath(seed, w, h, r, PEN_AMPLITUDE, 0, PEN_TAIL);
  return {
    ink: `<path transform="translate(${x} ${y})" d="${d}"/>`,
    clip: `<path transform="translate(${x + WASH_OFFSET[0]} ${y + WASH_OFFSET[1]})" d="${d}"/>`,
  };
}
const join = (shapes: { ink: string; clip: string }[]) => ({
  ink: shapes.map((s) => s.ink).join(""),
  clip: shapes.map((s) => s.clip).join(""),
});

interface Doodle {
  mode: HomeMode;
  color: string;
  /** The outline, as SVG markup (pre-built: the paths never change). */
  ink: string;
  /** The area the wash fills (the ink's shapes minus any lid, nudged by
   * WASH_OFFSET), as <clipPath> content. */
  fillArea: string;
  /** How far down the wash's surface sits when full — the jar's liquid
   * stops short of the neck; the grid fills right up. */
  fullY: number;
  /** Wave height of the wash's surface, px. */
  surface: number;
  /** Whether the surface sloshes sideways as it fills (the jar's liquid). */
  slosh: boolean;
}

// jar = red, work = blue (the site's two category colours, lib/tokens.css).
const jarLid = rectAt(70, 6.5, 3, 11, 4, 1.5);
const jarBody = rectAt(71, 3.5, 7, 17, 16.5, 4.5);
const gridCells = join([
  rectAt(81, 2, 2, 9, 9, 2),
  rectAt(82, 13, 2.4, 9, 9, 2),
  rectAt(83, 2.3, 13, 9, 9, 2),
  rectAt(84, 13, 13, 9, 9, 2),
]);
const DOODLES: Doodle[] = [
  {
    mode: "jar",
    color: "var(--c-red)",
    ink: jarLid.ink + jarBody.ink,
    fillArea: jarBody.clip,
    fullY: 10,
    surface: 0.9,
    slosh: true,
  },
  { mode: "work", color: "var(--c-blue)", ink: gridCells.ink, fillArea: gridCells.clip, fullY: 0, surface: 0.5, slosh: false },
];

/** The wash: wider than the icon so it can slosh, and tall enough to cover
 * it from any resting height. */
const WASH_W = ICON + MODE_SLOSH_PX * 2;
const washPaths = Object.fromEntries(
  DOODLES.map((d, i) => [d.mode, buildWashPath(90 + i, WASH_W, ICON + 2, d.surface, d.slosh ? 2 : 1.3)]),
) as Record<HomeMode, string>;
/** Below the icon: an empty doodle's wash waits here, out of sight. */
const EMPTY_Y = ICON + 2;

/**
 * The jar / work switch, top right of the stage: two small hand-drawn icon
 * buttons — a jar doodle and a 2×2 grid doodle — each with its label. The
 * picked one is coloured in with a soft pencil wash (jar red, work blue);
 * picking the other fills it from the bottom up while the old one drains.
 * The jar's wash is liquid: a wavy surface that sloshes as it rises.
 * Hovering an unpicked doodle tilts it (CSS). Reduced motion: instant.
 */
export default function ModeToggle({ mode, onChange }: { mode: HomeMode; onChange: (mode: HomeMode) => void }) {
  const reduced = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const fillS = slowMs(MODE_FILL_S * 1000) / 1000;

  return (
    <div
      className={styles.toggle}
      role="group"
      aria-label={copy.label}
      style={{ "--tilt": `${MODE_TILT_DEG}deg`, "--tilt-ms": `${MODE_TILT_MS}ms` } as React.CSSProperties}
    >
      {DOODLES.map((d) => {
        const on = d.mode === mode;
        const clipId = `${uid}-${d.mode}-clip`;
        const grainId = `${uid}-${d.mode}-grain`;
        return (
          <button
            key={d.mode}
            type="button"
            className={`${styles.button} ${on ? styles.active : ""}`}
            aria-pressed={on}
            onClick={() => onChange(d.mode)}
          >
            <svg className={styles.doodle} width={ICON} height={ICON} viewBox={`0 0 ${ICON} ${ICON}`} aria-hidden="true">
              <defs>
                <clipPath id={clipId} dangerouslySetInnerHTML={{ __html: d.fillArea }} />
                {/* Pencil grain: roughens the wash's edges and breaks up
                 * its colour a little, so it reads as coloured-in, not a
                 * flat fill. */}
                <filter id={grainId} x="-10%" y="-10%" width="120%" height="120%">
                  <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed={d.mode === "jar" ? 3 : 7} />
                  <feDisplacementMap in="SourceGraphic" scale="1.2" xChannelSelector="R" yChannelSelector="G" result="rough" />
                  <feTurbulence type="fractalNoise" baseFrequency="2.2" numOctaves="1" seed={11} result="noise" />
                  <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 1.35" result="grain" />
                  <feComposite in="rough" in2="grain" operator="in" />
                </filter>
              </defs>
              <g clipPath={`url(#${clipId})`} filter={`url(#${grainId})`}>
                <motion.path
                  d={washPaths[d.mode]}
                  fill={d.color}
                  fillOpacity={WASH_OPACITY}
                  initial={false}
                  animate={{ y: on ? d.fullY : EMPTY_Y, x: on || !d.slosh ? -MODE_SLOSH_PX : 0 }}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { duration: fillS, ease: on ? EASE_OUT : EASE_IN }
                  }
                />
              </g>
              <g
                fill="none"
                stroke="#000"
                strokeWidth={DOODLE_STROKE}
                strokeLinecap="round"
                dangerouslySetInnerHTML={{ __html: d.ink }}
              />
            </svg>
            <span className={styles.label}>{copy[d.mode]}</span>
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { geist } from "@/lib/fonts";
import { ROADMAP_MAP, ROADMAP_STOPS, type RoadmapStop } from "@/lib/roadmap";
import { buildWobblyCurvePath, buildWobblyLinePath, LINE_STROKE_WIDTH } from "@/lib/wobbly";
import {
  cubicBezier,
  EASE_IN,
  EASE_IN_OUT,
  EASE_OUT,
  EASE_OVERSHOOT,
  ROADMAP_LABEL_LAG_S,
  ROADMAP_PIN_FROM_SCALE,
  ROADMAP_PIN_GROW,
  ROADMAP_PIN_GROW_S,
  ROADMAP_PIN_POP_S,
  ROADMAP_PIN_SHRINK_S,
  ROADMAP_POPUP_FROM_SCALE,
  ROADMAP_POPUP_IN_S,
  ROADMAP_POPUP_OUT_S,
  ROADMAP_ROUTE_DELAY_S,
  ROADMAP_ROUTE_DRAW_S,
  ROADMAP_SCRIM_OPACITY,
  ROADMAP_SCRIM_S,
  slowTransition,
} from "@/lib/motion";
import { MAP_H, MAP_SHAPES, MAP_W, PAPER_CURL, PAPER_H, PAPER_PATH, PAPER_W, ROUTE_PATH, STOP_ROUTE_T } from "./mapDrawing";
import styles from "./Roadmap.module.css";

// The route is drawn at an even pen pace eased in and out (EASE_IN_OUT), so
// the moment it reaches a stop is where that curve's progress hits the
// stop's share of the route.
const routeEase = cubicBezier(EASE_IN_OUT);
function timeAt(progress: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (routeEase(mid) < progress) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
const PIN_DELAYS = STOP_ROUTE_T.map((t, i) =>
  i === 0 ? ROADMAP_ROUTE_DELAY_S * 0.4 : ROADMAP_ROUTE_DELAY_S + timeAt(t) * ROADMAP_ROUTE_DRAW_S - ROADMAP_PIN_POP_S * 0.4,
);

// ---------- hand-drawn bits ----------

// The pin: a teardrop, its tip on the spot, drawn in a PIN_W × PIN_H box.
// Its round head is centred at (10, 10), HEAD_R across; hovered, the photo
// shows through it.
const PIN_W = 20;
const PIN_H = 27;
const HEAD_R = 6.6;
const PIN_SEGMENTS: Parameters<typeof buildWobblyCurvePath>[1] = [
  [[10, 26], [6, 20], [1.5, 15], [1.5, 10]],
  [[1.5, 10], [1.5, 4.5], [5.5, 1.2], [10, 1.2]],
  [[10, 1.2], [14.5, 1.2], [18.5, 4.5], [18.5, 10]],
  [[18.5, 10], [18.5, 15], [14, 20], [10, 26]],
];
const PIN_PATHS = ROADMAP_STOPS.map((_, i) => buildWobblyCurvePath(600 + i, PIN_SEGMENTS, 0.12));

// The popup's close ×.
const CLOSE = 16;
const CLOSE_PATHS = [
  buildWobblyLinePath(641, [2, 2], [CLOSE - 2, CLOSE - 2], 0.2),
  buildWobblyLinePath(642, [CLOSE - 2, 2], [2, CLOSE - 2], 0.2),
];

const PIN_VARS = {
  "--pin-w": `${PIN_W}px`,
  "--pin-h": `${PIN_H}px`,
  "--pin-grow": ROADMAP_PIN_GROW,
  "--grow-ms": `${ROADMAP_PIN_GROW_S * 1000}ms`,
  "--shrink-ms": `${ROADMAP_PIN_SHRINK_S * 1000}ms`,
  "--head-x": `${(10 / PIN_W) * 100}%`,
  "--head-y": `${(10 / PIN_H) * 100}%`,
  "--head-d": `${((HEAD_R * 2) / PIN_W) * 100}%`,
} as CSSProperties;

// ---------- pieces ----------

function Pin({
  stop,
  index,
  grown,
  open,
  reduced,
  onHover,
  onActivate,
  pinRef,
}: {
  stop: RoadmapStop;
  index: number;
  grown: boolean;
  open: boolean;
  reduced: boolean;
  onHover: (id: string | null) => void;
  onActivate: (id: string, pointer: string) => void;
  pinRef: (el: HTMLButtonElement | null) => void;
}) {
  const pointer = useRef("mouse");
  const side = stop.label ?? "right";
  return (
    <motion.div
      className={styles.pinSpot}
      style={{ left: `${stop.x}%`, top: `${stop.y}%`, zIndex: grown ? 3 : 2 }}
      data-grown={grown || undefined}
      data-side={side}
      initial={reduced ? false : { opacity: 0, scale: ROADMAP_PIN_FROM_SCALE }}
      animate={{ opacity: 1, scale: 1 }}
      transition={slowTransition({ duration: ROADMAP_PIN_POP_S, ease: EASE_OVERSHOOT, delay: PIN_DELAYS[index] })}
    >
      <button
        ref={pinRef}
        type="button"
        className={styles.pin}
        data-pin
        data-open={open || undefined}
        aria-label={`${stop.place}: ${stop.marker.caption}`}
        aria-haspopup="dialog"
        onPointerDown={(e: PointerEvent) => (pointer.current = e.pointerType)}
        onPointerEnter={(e: PointerEvent) => e.pointerType === "mouse" && onHover(stop.id)}
        onPointerLeave={(e: PointerEvent) => e.pointerType === "mouse" && onHover(null)}
        onFocus={(e) => e.currentTarget.matches(":focus-visible") && onHover(stop.id)}
        onBlur={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          // A keyboard click (detail 0) acts like the mouse: it opens.
          onActivate(stop.id, e.detail === 0 ? "mouse" : pointer.current);
          pointer.current = "mouse";
        }}
      >
        <svg className={styles.pinIcon} viewBox={`0 0 ${PIN_W} ${PIN_H}`} aria-hidden="true">
          <path className={styles.pinBody} d={PIN_PATHS[index]} strokeWidth={LINE_STROKE_WIDTH} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <circle className={styles.pinDot} cx={10} cy={10} r={2.8} />
        </svg>
        {/* The photo, showing through the head once it has grown. */}
        <span className={styles.pinPhoto} aria-hidden="true">
          {stop.marker.photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={stop.marker.photo.src} alt="" draggable={false} />
          )}
        </span>
      </button>
      <motion.span
        className={styles.pinText}
        aria-hidden="true"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={slowTransition({ duration: 0.3, ease: EASE_OUT, delay: PIN_DELAYS[index] + ROADMAP_LABEL_LAG_S })}
      >
        <span className={styles.pinLabel}>{stop.place}</span>
        <span className={styles.pinCaption}>{stop.marker.caption}</span>
      </motion.span>
    </motion.div>
  );
}

/** The popup: in the middle of the window over the darkened page, with a
 * stop's story and photos. */
function Popup({ stop, reduced, onClose }: { stop: RoadmapStop; reduced: boolean; onClose: () => void }) {
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [stop.id]);
  return (
    <div className={`${geist.variable} ${styles.popupLayer}`}>
      <motion.div
        className={styles.scrim}
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: ROADMAP_SCRIM_OPACITY, transition: slowTransition({ duration: ROADMAP_SCRIM_S, ease: EASE_OUT }) }}
        exit={{ opacity: 0, transition: slowTransition({ duration: ROADMAP_SCRIM_S, ease: EASE_IN }) }}
      />
      <motion.section
        className={styles.popup}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: ROADMAP_POPUP_FROM_SCALE }}
        animate={{ opacity: 1, scale: 1, transition: slowTransition({ duration: ROADMAP_POPUP_IN_S, ease: EASE_OUT }) }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, scale: ROADMAP_POPUP_FROM_SCALE, transition: slowTransition({ duration: ROADMAP_POPUP_OUT_S, ease: EASE_IN }) }}
      >
        <button type="button" className={styles.popupClose} onClick={onClose} aria-label="Close">
          <svg width={CLOSE} height={CLOSE} viewBox={`0 0 ${CLOSE} ${CLOSE}`} fill="none" aria-hidden="true">
            {CLOSE_PATHS.map((d, i) => (
              <path key={i} d={d} stroke="currentColor" strokeWidth={LINE_STROKE_WIDTH} strokeLinecap="round" />
            ))}
          </svg>
        </button>
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className={styles.popupTitle}>
          {stop.place}
        </h2>
        <p className={styles.popupWhen}>{stop.when}</p>
        {stop.panel.paragraphs.map((p) => (
          <p key={p} className={styles.popupParagraph}>
            {p}
          </p>
        ))}
        {stop.panel.photos.length > 0 && (
          <div className={styles.popupPhotos}>
            {stop.panel.photos.map((photo) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={photo.src} src={photo.src} alt={photo.alt} draggable={false} />
            ))}
          </div>
        )}
      </motion.section>
    </div>
  );
}

// ---------- the map ----------

/**
 * The map on its torn paper (the placeholder drawing, or Amy's own once
 * ROADMAP_MAP is set), the dashed route drawing itself in from stop to
 * stop, a pin on each stop. Hovering (or focusing) a pin grows it, its head
 * opening onto the stop's photo, with its caption under the label; clicking
 * it opens the stop's popup in the middle of the window over the darkened
 * page. On touch, the first tap does the hover's job and a second opens the
 * popup. Esc, ×, or clicking the dark closes it.
 */
export default function MapStage() {
  const reduced = useReducedMotion() ?? false;
  const [hovered, setHovered] = useState<string | null>(null);
  const [touchShown, setTouchShown] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const pinEls = useRef(new Map<string, HTMLButtonElement>());
  const maskId = useId().replace(/:/g, "");
  // On the client (where <body> exists to portal the popup into).
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const grownId = hovered ?? touchShown;
  const openStop = ROADMAP_STOPS.find((s) => s.id === openId);

  const close = () => {
    const id = openId;
    setOpenId(null);
    if (id) pinEls.current.get(id)?.focus({ preventScroll: true });
  };

  // While the popup is open: Esc closes it, and the page behind doesn't
  // scroll.
  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpenId(null);
      pinEls.current.get(openId)?.focus({ preventScroll: true });
    };
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = before;
      window.removeEventListener("keydown", onKey);
    };
  }, [openId]);

  const activate = (id: string, pointer: string) => {
    if (pointer !== "mouse" && touchShown !== id) {
      // Touch: the first tap does the hover's job.
      setTouchShown(id);
      return;
    }
    setTouchShown(null);
    setHovered(null);
    setOpenId(id);
  };

  const routeTransition = slowTransition({ duration: ROADMAP_ROUTE_DRAW_S, ease: EASE_IN_OUT, delay: ROADMAP_ROUTE_DELAY_S });

  return (
    <div className={styles.paper} style={PIN_VARS} onClick={() => setTouchShown(null)}>
      {/* The paper the map is drawn on: its squiggly, softly torn edge
       * and rounded corners give it personality, and its bottom right
       * corner curls up. */}
      <svg className={styles.paperSvg} viewBox={`0 0 ${PAPER_W} ${PAPER_H}`} preserveAspectRatio="none" aria-hidden="true">
        <path className={styles.paperFill} d={PAPER_PATH} strokeWidth={LINE_STROKE_WIDTH} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <path d={PAPER_CURL} fill="none" stroke="currentColor" strokeWidth={LINE_STROKE_WIDTH} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className={styles.mapBox}>
        {/* The map drawing: Amy's own image, or the placeholder. */}
        {ROADMAP_MAP ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.mapImage} src={ROADMAP_MAP.src} alt={ROADMAP_MAP.alt} draggable={false} />
        ) : (
          <svg className={styles.mapSvg} viewBox={`0 0 ${MAP_W} ${MAP_H}`} aria-hidden="true">
            {MAP_SHAPES.map((p, i) => (
              <path
                key={i}
                d={p.d}
                fill={p.fill ?? "none"}
                stroke={p.ink ? "currentColor" : "none"}
                strokeWidth={p.ink}
                strokeDasharray={p.dash}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
        )}

        {/* The route: a dashed line, revealed by a solid one drawn along it
         * in a mask, so it appears as the pen passes. */}
        <svg className={styles.routeSvg} viewBox={`0 0 ${MAP_W} ${MAP_H}`} aria-hidden="true">
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse" x={0} y={0} width={MAP_W} height={MAP_H}>
              <motion.path
                d={ROUTE_PATH}
                fill="none"
                stroke="#fff"
                strokeWidth={16}
                strokeLinecap="round"
                initial={reduced ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={routeTransition}
              />
            </mask>
          </defs>
          <path className={styles.route} d={ROUTE_PATH} mask={`url(#${maskId})`} vectorEffect="non-scaling-stroke" />
        </svg>

        <h1 className={styles.title}>{"Amy's life map"}</h1>

        {ROADMAP_STOPS.map((stop, i) => (
          <Pin
            key={stop.id}
            stop={stop}
            index={i}
            grown={grownId === stop.id}
            open={openId === stop.id}
            reduced={reduced}
            onHover={setHovered}
            onActivate={activate}
            pinRef={(el) => {
              if (el) pinEls.current.set(stop.id, el);
              else pinEls.current.delete(stop.id);
            }}
          />
        ))}
      </div>

      {/* Portalled to <body>: the paper is turned, and a transformed
       * ancestor would trap the fixed popup inside it. */}
      {isClient &&
        createPortal(
          <AnimatePresence>{openStop && <Popup key="popup" stop={openStop} reduced={reduced} onClose={close} />}</AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

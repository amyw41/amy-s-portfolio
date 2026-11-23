"use client";

import { motion, useReducedMotion } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  EASE_IN_OUT,
  EASE_OUT,
  PREVIEW_GROW_S,
  PREVIEW_SCRIM_S,
  PREVIEW_SHRINK_S,
  slowMs,
  slowTransition,
} from "@/lib/motion";
import { buildWobblyLinePath } from "@/lib/wobbly";
import styles from "./HeroPreview.module.css";

/**
 * The case-study header's preview: a wide rounded rectangle under the title
 * on the right showing the project's media, with its live demo over it
 * (CyberSea's 3D tank, which can be turned by dragging even while small).
 * Clicking it (without dragging) grows that same rectangle, smoothly, into a
 * big view filling the window over a white scrim, where the demo can be
 * used; the × (or Esc, or clicking the scrim) shrinks it back.
 *
 * It's the same element the whole time (never remounted), so a live demo
 * keeps running through the grow instead of starting over. A demo can ask
 * whether it's open with usePreviewOpen() (MeshDemo shows its full controls
 * only then).
 *
 * Values: docs/rebrand/design-system.md "Case-study header"; timings in
 * lib/motion.ts (PREVIEW_*).
 */

type Phase = "closed" | "opening" | "open" | "closing";

const PreviewContext = createContext<{ open: boolean; settled: boolean }>({ open: false, settled: false });

/** Whether the preview this demo sits in is open (`open`, from the click),
 * and whether it has finished growing (`settled`). */
export function usePreviewOpen() {
  return useContext(PreviewContext);
}

type Rect = { top: number; left: number; width: number; height: number };

const toRect = (r: DOMRect): Rect => ({ top: r.top, left: r.left, width: r.width, height: r.height });

/** Where the open preview sits: the window, in by the frame's gap (the case
 * study's --frame-gap, clamp(8px, 2.3dvh, 28px): 16px at 696 tall). With
 * no live demo filling it (phones), it takes the media's own shape instead,
 * as big as fits, centred, so a video isn't cropped. */
function openRect(card: HTMLElement | null): Rect {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const gap = Math.min(28, Math.max(8, h * 0.023));
  const box = { top: gap, left: gap, width: w - gap * 2, height: h - gap * 2 };
  if (!card || card.querySelector("[data-preview-fill]")) return box;
  const video = card.querySelector("video");
  const img = card.querySelector("img");
  const aspect =
    video && video.videoWidth ? video.videoWidth / video.videoHeight : img && img.naturalWidth ? img.naturalWidth / img.naturalHeight : 0;
  if (!aspect) return box;
  const width = Math.min(box.width, box.height * aspect);
  const height = width / aspect;
  return { top: (h - height) / 2, left: (w - width) / 2, width, height };
}

// The hand-drawn × that closes it (lib/wobbly.ts, low wobble like the back
// arrow).
const ICON = 14;
const CLOSE_PATHS = [
  buildWobblyLinePath(146, [2.5, 2.5], [ICON - 2.5, ICON - 2.5], 0.2),
  buildWobblyLinePath(147, [ICON - 2.5, 2.5], [2.5, ICON - 2.5], 0.2),
];

function Icon({ paths }: { paths: string[] }) {
  return (
    <svg width={ICON} height={ICON} viewBox={`0 0 ${ICON} ${ICON}`} fill="none" aria-hidden="true">
      {paths.map((d, i) => (
        <path key={i} d={d} stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

/** How far the pointer can move between press and release and still count
 * as a click (further is a drag). */
const CLICK_SLOP_PX = 5;

export default function HeroPreview({
  media,
  demo,
  label,
  className = "",
  squareProps,
}: {
  /** The still or video under everything (and all that phones show). */
  media: ReactNode;
  /** A live demo drawn over the media (it decides itself where it runs). */
  demo?: ReactNode;
  /** What clicking it does, for screen readers ("Open the 3D model"). */
  label: string;
  className?: string;
  /** Extra attributes on the square (the zoom-from-home target). */
  squareProps?: Record<string, unknown> & { style?: CSSProperties };
}) {
  const reduced = useReducedMotion() ?? false;
  const [phase, setPhase] = useState<Phase>("closed");
  const squareRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  // Where the pointer went down, so a drag (turning the tank) isn't taken
  // for a click.
  const downRef = useRef<{ x: number; y: number } | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const runningRef = useRef<Animation | null>(null);

  const open = phase === "opening" || phase === "open";
  const floating = phase !== "closed";

  /** Moves the card (fixed to the window) from where it is now to `to`,
   * then calls `done`. Web Animations, so a close mid-grow carries on from
   * wherever the grow had got to. */
  const glide = useCallback(
    (to: Rect, seconds: number, done: () => void) => {
      const card = cardRef.current;
      if (!card) return;
      const now = toRect(card.getBoundingClientRect());
      runningRef.current?.cancel();
      const px = (r: Rect) => ({ top: `${r.top}px`, left: `${r.left}px`, width: `${r.width}px`, height: `${r.height}px` });
      Object.assign(card.style, { position: "fixed", ...px(to) });
      const ms = reduced ? 0 : slowMs(seconds * 1000);
      if (ms === 0) {
        done();
        return;
      }
      const anim = card.animate([px(now), px(to)], { duration: ms, easing: `cubic-bezier(${EASE_IN_OUT.join(",")})` });
      runningRef.current = anim;
      anim.onfinish = () => {
        if (runningRef.current === anim) runningRef.current = null;
        done();
      };
    },
    [reduced],
  );

  const onOpen = () => {
    if (phase !== "closed") return;
    setPhase("opening");
    glide(openRect(cardRef.current), PREVIEW_GROW_S, () => setPhase("open"));
  };

  const onClose = useCallback(() => {
    const square = squareRef.current;
    if (!square) return;
    setPhase("closing");
    glide(toRect(square.getBoundingClientRect()), PREVIEW_SHRINK_S, () => {
      // Back in its square: drop the inline box.
      const card = cardRef.current;
      if (card) for (const k of ["position", "top", "left", "width", "height"] as const) card.style[k] = "";
      setPhase("closed");
    });
  }, [glide]);

  // While it's out: the page underneath doesn't scroll (its scrollbar's
  // room is kept, so nothing shifts), Esc closes it, and it follows the
  // window if that's resized.
  useLayoutEffect(() => {
    if (!floating) return;
    const html = document.documentElement;
    const bar = window.innerWidth - html.clientWidth;
    const prev = { overflow: html.style.overflow, paddingRight: html.style.paddingRight };
    html.style.overflow = "hidden";
    if (bar > 0) html.style.paddingRight = `${bar}px`;
    return () => {
      html.style.overflow = prev.overflow;
      html.style.paddingRight = prev.paddingRight;
    };
  }, [floating]);

  useEffect(() => {
    if (phase !== "open") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onResize = () => {
      const card = cardRef.current;
      const r = openRect(card);
      if (card) Object.assign(card.style, { top: `${r.top}px`, left: `${r.left}px`, width: `${r.width}px`, height: `${r.height}px` });
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [phase, onClose]);

  useEffect(() => () => runningRef.current?.cancel(), []);

  // Focus goes to the × once it's open, and back to the square once closed.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (phase !== "closed" && phase !== "closing" && !wasOpen.current) closeButtonRef.current?.focus({ preventScroll: true });
    if (phase === "closed" && wasOpen.current) cardRef.current?.focus({ preventScroll: true });
    wasOpen.current = phase !== "closed";
  }, [phase]);

  return (
    <PreviewContext.Provider value={{ open, settled: phase === "open" }}>
      <div
        ref={squareRef}
        {...squareProps}
        className={`${styles.square} ${className}`}
        style={squareProps?.style}
      >
        <div
          ref={cardRef}
          // Small: filling its square. Out: fixed to the window (its box set
          // by glide() above).
          className={`${styles.card} ${floating ? styles.cardFloating : ""}`}
          data-hero-media=""
          // Small, the preview itself is the button: a click (not a drag)
          // opens it, as do Enter and Space.
          role={open ? "dialog" : floating ? undefined : "button"}
          tabIndex={floating ? undefined : 0}
          aria-modal={open ? true : undefined}
          aria-label={open ? label.replace(/^Open /, "") : floating ? undefined : label}
          onPointerDown={(e) => {
            downRef.current = { x: e.clientX, y: e.clientY };
          }}
          onClick={(e) => {
            const down = downRef.current;
            downRef.current = null;
            if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > CLICK_SLOP_PX) return;
            onOpen();
          }}
          onKeyDown={(e) => {
            if (floating || e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
            e.preventDefault();
            onOpen();
          }}
        >
          {media}
          {demo}
          {open && (
            <button ref={closeButtonRef} type="button" className={`${styles.badge} ${styles.close}`} aria-label="Close" onClick={onClose}>
              <Icon paths={CLOSE_PATHS} />
            </button>
          )}
        </div>
      </div>

      {/* The white scrim over the page, under the open preview. */}
      <motion.div
        className={styles.scrim}
        aria-hidden="true"
        initial={false}
        animate={{ opacity: open ? 1 : 0 }}
        transition={reduced ? { duration: 0 } : slowTransition({ duration: PREVIEW_SCRIM_S, ease: EASE_OUT })}
        style={{ pointerEvents: open ? "auto" : "none", visibility: floating ? "visible" : "hidden" }}
        onClick={onClose}
      />
    </PreviewContext.Provider>
  );
}

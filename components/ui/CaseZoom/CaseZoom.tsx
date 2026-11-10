"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  EASE_IN_OUT,
  ZOOM_GROW_S,
  ZOOM_SCRIM_IN_S,
  ZOOM_SCRIM_OUT_S,
  ZOOM_SETTLE_S,
  slowMs,
} from "@/lib/motion";

type Mode = "jar" | "work";
/** "growing": the page is frozen under the scrim and the copy is growing
 * toward the case study's thumbnail; "landing": the copy is on the real
 * thumbnail and the scrim is fading off the case study. ("leaving" is the
 * old zoom's home exit, kept only so Home's own check still compiles.) */
type Phase = "idle" | "leaving" | "growing" | "landing";
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  rotate: number;
  radius: number;
}

interface CaseZoomValue {
  phase: Phase;
  /** The case study being zoomed into. */
  slug: string | null;
  /** Zooms from `from` (a grid card's cover or a jar item) into the case
   * study at `href`. Returns false when it doesn't apply (phone, reduced
   * motion, already zooming): the caller then just navigates normally. */
  start(opts: { href: string; slug: string; from: HTMLElement; src: string }): boolean;
  /** The pointer is on a way into a case study: fetch it now so it's ready
   * by the time the zoom lands. */
  prefetch(href: string): void;
  /** The case study's logo was clicked: home should come back in the mode
   * it was left in, widening the rail back into the sidebar. */
  goHome(): void;
  /** Set by goHome until home has played its return. */
  returning: boolean;
  doneReturning(): void;
  /** The home page's mode, kept across the trip so the way back lands on
   * the same view. */
  lastMode: Mode;
  setLastMode(mode: Mode): void;
}

const CaseZoomContext = createContext<CaseZoomValue | null>(null);

export function useCaseZoom(): CaseZoomValue | null {
  return useContext(CaseZoomContext);
}

/** The case-study thumbnail the zoom lands on: CaseStudyLayout marks it with
 * this attribute (its value is the slug). */
export const ZOOM_TARGET_ATTR = "data-case-thumb";

/** Set on <html> while the zoom runs: globals.css freezes the page under it
 * (animations held, no pointer). */
const FREEZE_ATTR = "data-zoom-freeze";

/** The rotation (radians) in a jar item's transform. */
function rotationOf(el: HTMLElement): number {
  const m = /rotate\(([-\d.e]+)rad\)/.exec(el.style.transform);
  return m ? Number(m[1]) : 0;
}

/** Waits, polling every ~frame and up to `ms`, for the element `find` returns
 * to be on the page with a size. */
function waitFor(find: () => HTMLElement | null, ms: number): Promise<HTMLElement | null> {
  const until = performance.now() + ms;
  return new Promise((resolve) => {
    const tick = () => {
      const el = find();
      if (el && el.getBoundingClientRect().width > 0) resolve(el);
      else if (performance.now() > until) resolve(null);
      // setTimeout, not rAF: rAF doesn't run in a hidden tab.
      else window.setTimeout(tick, 16);
    };
    tick();
  });
}

/** The width of a page scrollbar (the case study scrolls; home doesn't). */
function scrollbarWidth(): number {
  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute;top:-999px;width:100px;height:100px;overflow:scroll";
  document.body.appendChild(probe);
  const w = probe.offsetWidth - probe.clientWidth;
  probe.remove();
  return w;
}

/**
 * Where the case study's thumbnail will be, before that page exists, from
 * the case-study layout's own sizes (CaseStudyLayout.module.css: the 64px
 * rail and 1px divider, --pad-y, --stage-pad-x, the 32px title, the 24px
 * gap, the 42/58 columns 48px apart, the 3:2 thumbnail, 4px corners) at this
 * window size. The grow aims here at once; the landing corrects any
 * difference.
 */
function predictThumb(): Box {
  const clamp = (lo: number, v: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const vw = window.innerWidth - scrollbarWidth();
  const vh = window.innerHeight;
  const padY = clamp(24, 0.069 * vh, 80);
  const padX = clamp(21, 0.02734 * window.innerWidth, 70);
  const left = 64 + 1 + padX;
  const contentW = vw - 65 - 2 * padX;
  const w = ((contentW - 48) * 42) / 100;
  return { x: left, y: padY + 32 * 1.1 + 24, w, h: (w * 2) / 3, rotate: 0, radius: 4 };
}

/**
 * The zoom into a case study (docs/rebrand/zoom-brief.md), kept in the root
 * layout so it lives across the route change. On a click, all at once:
 * the page freezes (FREEZE_ATTR), a white scrim fades over it
 * (ZOOM_SCRIM_IN_S), and a copy of the clicked thumbnail grows, physically
 * bigger, from its spot toward where the case study's thumbnail will be
 * (predictThumb, ZOOM_GROW_S) while the route changes underneath. Once that
 * thumbnail is on the page, the copy settles onto its exact rect
 * (ZOOM_SETTLE_S), the scrim fades off the case study (ZOOM_SCRIM_OUT_S) and
 * the real thumbnail takes over. Phones and reduced motion just navigate.
 */
export default function CaseZoomProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [slug, setSlug] = useState<string | null>(null);
  // `to` is where the copy is heading; `settle` marks the short final move
  // onto the real thumbnail (its own duration).
  const [overlay, setOverlay] = useState<{ src: string; from: Box; to: Box; settle: boolean } | null>(null);
  const [returning, setReturning] = useState(false);
  const lastModeRef = useRef<Mode>("jar");
  // Resolves when the grow has arrived (the landing waits for both that and
  // the case study's thumbnail).
  const grownRef = useRef<(() => void) | null>(null);

  // The freeze: on while growing, off as it lands (the case study's own
  // fade-ins can then run).
  useEffect(() => {
    const root = document.documentElement;
    if (phase === "growing") {
      root.setAttribute(FREEZE_ATTR, "");
      document.querySelectorAll("video").forEach((v) => v.pause());
    } else root.removeAttribute(FREEZE_ATTR);
  }, [phase]);

  const finish = useCallback(() => {
    setOverlay(null);
    setPhase("idle");
    setSlug(null);
  }, []);

  const start = useCallback<CaseZoomValue["start"]>(
    ({ href, slug: target, from, src }) => {
      if (phase !== "idle") return false;
      if (!window.matchMedia("(min-width: 768px)").matches) return false;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;

      // The copy starts exactly over the clicked thumbnail: its own
      // (unrotated) size, centred where it is, at its rotation.
      const r = from.getBoundingClientRect();
      const w = from.offsetWidth || r.width;
      const h = from.offsetHeight || r.height;
      const fromBox: Box = {
        x: r.left + r.width / 2 - w / 2,
        y: r.top + r.height / 2 - h / 2,
        w,
        h,
        rotate: rotationOf(from),
        radius: parseFloat(getComputedStyle(from).borderTopLeftRadius) || 0,
      };
      setSlug(target);
      setOverlay({ src, from: fromBox, to: predictThumb(), settle: false });
      setPhase("growing");
      // The page changes underneath straight away.
      router.push(href);

      const grown = new Promise<void>((resolve) => (grownRef.current = resolve));
      // A backstop in case the grow's end never reports (e.g. a hidden tab
      // holds animation frames): the page mustn't stay frozen.
      window.setTimeout(() => grownRef.current?.(), slowMs(ZOOM_GROW_S * 1000) + 150);
      (async () => {
        const thumb = await waitFor(
          () => document.querySelector<HTMLElement>(`[${ZOOM_TARGET_ATTR}="${target}"]`),
          slowMs(6000),
        );
        await grown;
        if (!thumb) {
          finish();
          return;
        }
        const t = thumb.getBoundingClientRect();
        setOverlay(
          (o) =>
            o && {
              ...o,
              settle: true,
              to: {
                x: t.left,
                y: t.top,
                w: t.width,
                h: t.height,
                rotate: 0,
                radius: parseFloat(getComputedStyle(thumb).borderTopLeftRadius) || 0,
              },
            },
        );
        setPhase("landing");
        window.setTimeout(finish, slowMs(Math.max(ZOOM_SETTLE_S, ZOOM_SCRIM_OUT_S) * 1000) + 30);
      })();
      return true;
    },
    [phase, router, finish],
  );

  const value = useMemo<CaseZoomValue>(
    () => ({
      phase,
      slug,
      start,
      prefetch: (href) => router.prefetch(href),
      goHome: () => setReturning(true),
      returning,
      doneReturning: () => setReturning(false),
      get lastMode() {
        return lastModeRef.current;
      },
      setLastMode: (mode) => {
        lastModeRef.current = mode;
      },
    }),
    [phase, slug, start, returning, router],
  );

  const zooming = phase === "growing" || phase === "landing";
  const box = overlay?.to;

  return (
    <CaseZoomContext.Provider value={value}>
      {children}
      {zooming && (
        // The background fading back: white over the whole page, under the
        // copy. Fades off the case study as the copy lands.
        <motion.div
          aria-hidden="true"
          style={{ position: "fixed", inset: 0, zIndex: 999, background: "#fff", pointerEvents: "none" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "growing" ? 1 : 0 }}
          transition={{
            duration: slowMs((phase === "growing" ? ZOOM_SCRIM_IN_S : ZOOM_SCRIM_OUT_S) * 1000) / 1000,
            ease: "easeOut",
          }}
        />
      )}
      {overlay && box && (() => {
        // The copy is drawn once at its landing size and moved only by
        // transform (position, uniform scale, rotation), which the GPU does
        // without redrawing it: animating its width and height redrew the
        // whole image every frame, on the main thread, while the case study
        // was rendering. A start of a different shape (a jar item) is
        // cropped to that shape with clip-path and opens out as it grows.
        const W = box.w;
        const H = box.h;
        const f = overlay.from;
        const s = Math.max(f.w / W, f.h / H);
        const ix = Math.max(0, (W - f.w / s) / 2);
        const iy = Math.max(0, (H - f.h / s) / 2);
        return (
          <motion.div
            aria-hidden="true"
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              width: W,
              height: H,
              zIndex: 1000,
              pointerEvents: "none",
              willChange: "transform",
              backgroundImage: `url("${overlay.src}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            initial={{
              x: f.x + f.w / 2 - W / 2,
              y: f.y + f.h / 2 - H / 2,
              scale: s,
              rotate: (f.rotate * 180) / Math.PI,
              clipPath: `inset(${iy}px ${ix}px round ${f.radius / s}px)`,
            }}
            animate={{
              x: box.x,
              y: box.y,
              scale: 1,
              rotate: (box.rotate * 180) / Math.PI,
              clipPath: `inset(0px 0px round ${box.radius}px)`,
            }}
            transition={
              overlay.settle
                ? { duration: slowMs(ZOOM_SETTLE_S * 1000) / 1000, ease: "easeOut" }
                : { duration: slowMs(ZOOM_GROW_S * 1000) / 1000, ease: EASE_IN_OUT }
            }
            onAnimationComplete={() => {
              if (!overlay.settle) grownRef.current?.();
            }}
          />
        );
      })()}
    </CaseZoomContext.Provider>
  );
}

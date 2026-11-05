"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { EASE_IN_OUT, ZOOM_GROW_S, ZOOM_LEAVE_S, slowMs } from "@/lib/motion";

type Mode = "jar" | "work";
type Phase = "idle" | "leaving" | "growing";
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  rotate: number;
  radius: number;
}

interface CaseZoomValue {
  /** "leaving": the home page is fading out; "growing": the case study is
   * up and the thumbnail is growing into it. */
  phase: Phase;
  /** The case study being zoomed into. */
  slug: string | null;
  /** Zooms from `from` (a grid card's cover or a jar item) into the case
   * study at `href`. Returns false when it doesn't apply (phone, reduced
   * motion, already zooming): the caller then just navigates normally. */
  start(opts: { href: string; slug: string; from: HTMLElement; src: string }): boolean;
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

/** The rotation (radians) in a jar item's transform. */
function rotationOf(el: HTMLElement): number {
  const m = /rotate\(([-\d.e]+)rad\)/.exec(el.style.transform);
  return m ? Number(m[1]) : 0;
}

/** Waits, a frame at a time and up to `ms`, for the element `find` returns
 * to be on the page with a size. */
function waitFor(find: () => HTMLElement | null, ms: number): Promise<HTMLElement | null> {
  const until = performance.now() + ms;
  return new Promise((resolve) => {
    const tick = () => {
      const el = find();
      if (el && el.getBoundingClientRect().width > 0) resolve(el);
      else if (performance.now() > until) resolve(null);
      else requestAnimationFrame(tick);
    };
    tick();
  });
}

/**
 * The zoom into a case study (brief Part 3.2), kept in the root layout so it
 * lives across the route change. On a click: a copy of the clicked
 * thumbnail is laid exactly over it, above everything; the home page plays
 * its exit (reading `phase`) for ZOOM_LEAVE_S; then the route changes
 * underneath (PageTransition skips its fade for this arrival), and once the
 * case study's thumbnail is on the page the copy grows into its exact spot
 * over ZOOM_GROW_S and hands over to it. Phones and reduced motion just
 * navigate.
 */
export default function CaseZoomProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [slug, setSlug] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<{ src: string; from: Box; to: Box | null } | null>(null);
  const [returning, setReturning] = useState(false);
  const lastModeRef = useRef<Mode>("jar");

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
      setOverlay({ src, from: fromBox, to: null });
      setPhase("leaving");
      router.prefetch(href);

      window.setTimeout(async () => {
        setPhase("growing");
        router.push(href);
        const thumb = await waitFor(
          () => document.querySelector<HTMLElement>(`[${ZOOM_TARGET_ATTR}="${target}"]`),
          slowMs(4000),
        );
        if (!thumb) {
          setOverlay(null);
          setPhase("idle");
          setSlug(null);
          return;
        }
        const t = thumb.getBoundingClientRect();
        setOverlay(
          (o) =>
            o && {
              ...o,
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
      }, slowMs(ZOOM_LEAVE_S * 1000));
      return true;
    },
    [phase, router],
  );

  const value = useMemo<CaseZoomValue>(
    () => ({
      phase,
      slug,
      start,
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
    [phase, slug, start, returning],
  );

  const box = overlay ? (overlay.to ?? overlay.from) : null;

  return (
    <CaseZoomContext.Provider value={value}>
      {children}
      {overlay && box && (
        <motion.div
          aria-hidden="true"
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            zIndex: 1000,
            overflow: "hidden",
            pointerEvents: "none",
            backgroundImage: `url("${overlay.src}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          initial={{
            x: overlay.from.x,
            y: overlay.from.y,
            width: overlay.from.w,
            height: overlay.from.h,
            rotate: (overlay.from.rotate * 180) / Math.PI,
            borderRadius: overlay.from.radius,
          }}
          animate={{
            x: box.x,
            y: box.y,
            width: box.w,
            height: box.h,
            rotate: (box.rotate * 180) / Math.PI,
            borderRadius: box.radius,
          }}
          transition={{ duration: overlay.to ? slowMs(ZOOM_GROW_S * 1000) / 1000 : 0, ease: EASE_IN_OUT }}
          onAnimationComplete={() => {
            if (!overlay.to) return;
            // Landed: the real thumbnail takes over.
            setOverlay(null);
            setPhase("idle");
            setSlug(null);
          }}
        />
      )}
    </CaseZoomContext.Provider>
  );
}

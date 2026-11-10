"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { useReducedMotion } from "framer-motion";
import styles from "./Foil.module.css";
import { FOIL_REVEAL_LAG_MS } from "@/lib/motion";

/**
 * The foil hover (the sidebar's social icons, the footer strip's links): a
 * fixed gradient (raspberry, light yellow, blue) laid over the thing, shown only
 * through a soft half circle under the mouse, and only on its ink (blended so
 * the background around it keeps its colour). The circle rises in on enter,
 * follows the mouse (trailing by FOIL_REVEAL_LAG_MS) and sinks on leave; its
 * centre goes in as --fx0 / --fy0 (registered in globals.css so it can
 * transition). --foil-pos (seeded) picks which patch of the gradient each
 * one shows.
 *
 * Use: spread `handlers` on the hovered element; for an icon, give it
 * foilHostLight and put <FoilGlow foil={...} /> inside; for text, put
 * <FoilText foil={...}>{text}</FoilText> in a foilHostText element (it
 * renders the text itself).
 */
export function useFoil(seed: number) {
  const reduced = useReducedMotion() ?? false;
  const style = useMemo(() => {
    // Two seeded 0-100% offsets: where in the gradient this one looks.
    const a = ((seed * 9301 + 49297) % 233280) / 233280;
    const b = ((seed * 49297 + 9301) % 233280) / 233280;
    return {
      "--foil-lag": `${reduced ? 0 : FOIL_REVEAL_LAG_MS}ms`,
      "--foil-pos": `${Math.round(a * 100)}% ${Math.round(b * 100)}%`,
    } as CSSProperties;
  }, [seed, reduced]);
  // The gradient layer only exists while it's in use (from the pointer
  // arriving until it has sunk away after leaving). At rest it isn't on the
  // page at all: the cloud is many layers of gradient, and having one under
  // every link meant the whole sidebar was slow to draw, so its load-in (and
  // everything moving with it, like the jar's bounce) stuttered.
  const [active, setActive] = useState(false);
  const host = useRef<HTMLElement | null>(null);
  const pos = useRef({ x: 0, risen: false });
  const sinkTimer = useRef(0);
  const apply = (risen: boolean) => {
    const el = host.current;
    if (!el) return;
    const glow = el.querySelector<HTMLElement>("[data-foil]");
    const h = glow?.offsetHeight ?? el.offsetHeight;
    // Risen: the centre just under the bottom edge, so a half circle shows.
    // Sunk: far enough below to be out of sight. The gradient copy, and (for
    // text) the plain text under it, which fades out where the copy fades in.
    el.querySelectorAll<HTMLElement>("[data-foil], [data-foil-base]").forEach((n) => {
      n.style.setProperty("--fx0", `${pos.current.x.toFixed(1)}px`);
      n.style.setProperty("--fy0", `${risen ? h + 1 : h + 24}px`);
    });
  };
  const track = (e: PointerEvent<HTMLElement>, risen: boolean) => {
    host.current = e.currentTarget;
    const box = e.currentTarget.getBoundingClientRect();
    // In the host's own CSS px (it may be scaled, e.g. mid-zoom).
    const k = e.currentTarget.offsetWidth ? box.width / e.currentTarget.offsetWidth : 1;
    pos.current = { x: (e.clientX - box.left) / k, risen };
  };
  // Just mounted: start sunk under the pointer, then rise on the next frame
  // (so it transitions up rather than appearing).
  useEffect(() => {
    if (!active) return;
    apply(false);
    const raf = requestAnimationFrame(() => apply(pos.current.risen));
    return () => cancelAnimationFrame(raf);
  }, [active]);
  useEffect(() => () => window.clearTimeout(sinkTimer.current), []);
  return {
    style,
    active,
    handlers: {
      onPointerEnter: (e: PointerEvent<HTMLElement>) => {
        track(e, true);
        window.clearTimeout(sinkTimer.current);
        if (active) apply(true);
        else setActive(true);
      },
      onPointerMove: (e: PointerEvent<HTMLElement>) => {
        track(e, true);
        if (active) apply(true);
      },
      onPointerLeave: (e: PointerEvent<HTMLElement>) => {
        track(e, false);
        apply(false);
        // Gone once it has sunk out of sight.
        window.clearTimeout(sinkTimer.current);
        sinkTimer.current = window.setTimeout(() => setActive(false), (reduced ? 0 : FOIL_REVEAL_LAG_MS) + 80);
      },
    },
  };
}

/** The gradient layer for an icon: blended so only the icon's black ink on
 * white takes the colour (lighten). Its host needs foilHostLight. */
export function FoilGlow({ foil }: { foil: ReturnType<typeof useFoil> }) {
  if (!foil.active) return null;
  return <span className={`${styles.glow} ${styles.onLight}`} data-foil style={foil.style} aria-hidden="true" />;
}

/** Text with the foil: the text itself, and a copy laid exactly over it
 * filled with the gradient (clipped to the letters), so only the letters
 * take the colour, whatever the background. Under the half circle the
 * plain text fades out as the copy fades in, so the two never show at once
 * (no fringe of the plain colour round the gradient letters). Goes inside a
 * foilHostText element; renders the text, so the host doesn't. */
export function FoilText({ foil, children }: { foil: ReturnType<typeof useFoil>; children: string }) {
  return (
    <>
      {/* The plain text; masked (to fade under the circle) only while the
       * foil is in use. */}
      <span className={foil.active ? styles.base : undefined} data-foil-base style={foil.style}>
        {children}
      </span>
      {foil.active && (
        <span className={`${styles.glow} ${styles.text}`} data-foil style={foil.style} aria-hidden="true">
          {children}
        </span>
      )}
    </>
  );
}

export const foilHostLight = styles.hostLight;
export const foilHostText = styles.hostText;

/** A bit of plain text with the foil hover on it (not a link): its own
 * host, handlers and gradient copy in one. */
export function FoilHover({ seed, children }: { seed: number; children: string }) {
  const foil = useFoil(seed);
  return (
    <span className={styles.hostText} {...foil.handlers}>
      <FoilText foil={foil}>{children}</FoilText>
    </span>
  );
}

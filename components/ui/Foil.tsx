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
  // Where the pointer came in (x in the host's px, and the host's height),
  // while the layer exists; null at rest. The layer is first drawn sunk
  // right there, so it rises straight up under the pointer. (Before, it was
  // first drawn at the registered default, x = 0, and the rise could start
  // with a sweep in from the left, or skip the rise entirely, depending on
  // when the browser first styled it: the hover felt inconsistent,
  // 2026-11-21.)
  const [start, setStart] = useState<{ x: number; h: number } | null>(null);
  const active = start !== null;
  const host = useRef<HTMLElement | null>(null);
  const pos = useRef({ x: 0, risen: false });
  const height = useRef(0);
  const sinkTimer = useRef(0);
  // The circle's x as drawn, gliding after the pointer one frame at a time
  // (follow, below). It used to be a CSS transition restarted on every
  // pointer move, which stuttered whenever moves came unevenly
  // (2026-11-21); this eases the same way every frame whatever the mouse
  // does.
  const drawnX = useRef(0);
  const followRaf = useRef(0);
  const lastFrame = useRef(0);
  const layers = () =>
    host.current ? host.current.querySelectorAll<HTMLElement>("[data-foil], [data-foil-base]") : [];
  const follow = (now: number) => {
    const dt = lastFrame.current ? Math.min(64, now - lastFrame.current) : 16;
    lastFrame.current = now;
    const target = pos.current.x;
    // Exponential ease towards the pointer: ~95% of the way there after
    // FOIL_REVEAL_LAG_MS, the trail the transition used to give.
    const k = reduced ? 1 : 1 - Math.exp((-3 * dt) / FOIL_REVEAL_LAG_MS);
    drawnX.current += (target - drawnX.current) * k;
    if (Math.abs(target - drawnX.current) < 0.1) drawnX.current = target;
    const x = `${drawnX.current.toFixed(1)}px`;
    layers().forEach((n) => n.style.setProperty("--fx0", x));
    if (drawnX.current !== target) followRaf.current = requestAnimationFrame(follow);
    else followRaf.current = 0;
  };
  const glide = () => {
    if (followRaf.current) return;
    lastFrame.current = 0;
    followRaf.current = requestAnimationFrame(follow);
  };
  const apply = (risen: boolean) => {
    // The host's height, measured once on entering (reading it on every
    // move forced a layout per pointer event).
    const h = height.current;
    // Risen: the centre just under the bottom edge, so a half circle shows.
    // Sunk: far enough below to be out of sight (a CSS transition, see
    // Foil.module.css). The gradient copy, and (for text) the plain text
    // under it, which fades out where the copy fades in.
    layers().forEach((n) => n.style.setProperty("--fy0", `${risen ? h + 1 : h + 24}px`));
    glide();
  };
  const track = (e: PointerEvent<HTMLElement>, risen: boolean) => {
    host.current = e.currentTarget;
    const box = e.currentTarget.getBoundingClientRect();
    // In the host's own CSS px (it may be scaled, e.g. mid-zoom).
    const k = e.currentTarget.offsetWidth ? box.width / e.currentTarget.offsetWidth : 1;
    pos.current = { x: (e.clientX - box.left) / k, risen };
  };
  // Just mounted (drawn sunk under the pointer, see `start`): rise. Two
  // frames, so the sunk position has been drawn once and the rise is a
  // transition, not a jump.
  useEffect(() => {
    if (!active) return;
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => apply(pos.current.risen));
    });
    return () => cancelAnimationFrame(raf);
    // Only on mounting the layer; apply reads refs, so it never goes stale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  useEffect(
    () => () => {
      window.clearTimeout(sinkTimer.current);
      cancelAnimationFrame(followRaf.current);
    },
    [],
  );
  // The layer's style: the seeded patch and lag, plus, while it's in use,
  // where it starts (sunk under the pointer; later moves are set directly
  // on the element by apply).
  const layerStyle = useMemo(
    () => (start ? ({ ...style, "--fx0": `${start.x.toFixed(1)}px`, "--fy0": `${start.h + 24}px` } as CSSProperties) : style),
    [style, start],
  );
  return {
    style: layerStyle,
    active,
    handlers: {
      onPointerEnter: (e: PointerEvent<HTMLElement>) => {
        track(e, true);
        window.clearTimeout(sinkTimer.current);
        height.current = e.currentTarget.offsetHeight;
        if (active) apply(true);
        else {
          drawnX.current = pos.current.x;
          setStart({ x: pos.current.x, h: height.current });
        }
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
        sinkTimer.current = window.setTimeout(() => setStart(null), (reduced ? 0 : FOIL_REVEAL_LAG_MS) + 80);
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

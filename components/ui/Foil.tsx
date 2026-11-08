"use client";

import { useMemo, type CSSProperties, type PointerEvent } from "react";
import { useReducedMotion } from "framer-motion";
import styles from "./Foil.module.css";
import { FOIL_REVEAL_LAG_MS } from "@/lib/motion";

/**
 * The foil hover (the sidebar's social icons, the footer strip's links): a
 * fixed gradient (raspberry, light yellow) laid over the thing, shown only
 * through a soft half circle under the mouse, and only on its ink (blended so
 * the background around it keeps its colour). The circle rises in on enter,
 * follows the mouse (trailing by FOIL_REVEAL_LAG_MS) and sinks on leave; its
 * centre goes in as --fx0 / --fy0 (registered in globals.css so it can
 * transition). --foil-pos (seeded) picks which patch of the gradient each
 * one shows.
 *
 * Use: spread `handlers` on the hovered element; for an icon, give it
 * foilHostLight and put <FoilGlow foil={...} /> inside; for text, wrap the
 * text in a foilHostText span with <FoilText foil={...}>{same text}</FoilText>
 * after it.
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
  const place = (e: PointerEvent<HTMLElement>, risen: boolean) => {
    const glow = e.currentTarget.querySelector<HTMLElement>("[data-foil]");
    if (!glow) return;
    const box = glow.getBoundingClientRect();
    // In the glow's own CSS px (the box may be scaled, e.g. mid-zoom).
    const k = glow.offsetWidth ? box.width / glow.offsetWidth : 1;
    const x = (e.clientX - box.left) / k;
    const h = glow.offsetHeight;
    // Risen: the centre just under the bottom edge, so a half circle shows.
    // Sunk: far enough below to be out of sight.
    glow.style.setProperty("--fx0", `${x.toFixed(1)}px`);
    glow.style.setProperty("--fy0", `${risen ? h + 1 : h + 24}px`);
  };
  return {
    style,
    handlers: {
      onPointerEnter: (e: PointerEvent<HTMLElement>) => place(e, true),
      onPointerMove: (e: PointerEvent<HTMLElement>) => place(e, true),
      onPointerLeave: (e: PointerEvent<HTMLElement>) => place(e, false),
    },
  };
}

/** The gradient layer for an icon: blended so only the icon's black ink on
 * white takes the colour (lighten). Its host needs foilHostLight. */
export function FoilGlow({ foil }: { foil: ReturnType<typeof useFoil> }) {
  return <span className={`${styles.glow} ${styles.onLight}`} data-foil style={foil.style} aria-hidden="true" />;
}

/** The gradient layer for text: a copy of the text laid exactly over it,
 * filled with the gradient (clipped to the letters), so only the letters
 * take the colour, whatever the background. Its host needs foilHostText. */
export function FoilText({ foil, children }: { foil: ReturnType<typeof useFoil>; children: string }) {
  return (
    <span className={`${styles.glow} ${styles.text}`} data-foil style={foil.style} aria-hidden="true">
      {children}
    </span>
  );
}

export const foilHostLight = styles.hostLight;
export const foilHostText = styles.hostText;

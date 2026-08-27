"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// useLayoutEffect is a no-op on the server (React warns if called during
// SSR) — aliasing to useEffect there and using the real layout effect only
// in the browser is the standard hydration-safe pattern (matches
// jar-portfolio's own useIsomorphicLayoutEffect, which this hook is a
// trimmed port of).
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Tracks a DOM node's own rendered *width* via ResizeObserver — a narrower
 * port of jar-portfolio's useElementSize (components/WhatsInside/layout.ts),
 * which tracks width AND height because its caller (the /etc/[category]
 * detail carousel) has to fit inside one fixed-height viewport slot. The
 * plate view here has no such height ceiling — it's an ordinary page
 * section that's free to grow as tall as it needs — so only width, the one
 * dimension PlateView's scale-to-fit actually solves against, is tracked.
 *
 * Starts at 0 identically on every render path (server, hydration, first
 * client mount) so there's never a server/client value to hydration-
 * mismatch against; the layout effect then corrects it synchronously before
 * the browser paints, so despite starting at 0 there's no visible flash of
 * the wrong (unscaled) size.
 */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.offsetWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

/**
 * Same as useElementWidth but tracks BOTH width and height, for callers
 * that need to scale-to-fit inside a constrained height budget (e.g.
 * the detail page's 100dvh slot, where the composition must shrink
 * on short viewports too).
 */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ width: el.offsetWidth, height: el.offsetHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}

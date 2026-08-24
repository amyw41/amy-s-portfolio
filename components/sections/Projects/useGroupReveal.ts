"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Reveals an entire group of elements together, all at once, the moment a
 * single shared container (passed in as `containerRef`) scrolls into view —
 * as opposed to useScrollReveal's per-element behaviour, where each
 * registered element reveals independently as it individually crosses the
 * threshold. That per-element version is what "skinsprout, cybersea,
 * spotify, extras should all move up at the same time" was asking to move
 * away from for the project cards: with one observer per card, cards spread
 * far enough down the page cross into view across several different scroll
 * moments, reading as a staggered trickle rather than one arrival. Here,
 * every consumer shares this hook's single `revealed` boolean, so they all
 * flip from hidden to shown in the same render, keyed off one container
 * (the cards' shared parent, `.list` in Projects/index.tsx) rather than any
 * one card's own position.
 *
 * Deliberately a plain ref (`useRef` + `useEffect` on the caller's side),
 * not a per-card ref-*callback* the way useScrollReveal/useFlipReorder wire
 * up — a callback ref re-fires on every render whose identity changes
 * (harmless for those two, since they're keyed by a stable per-card id and
 * de-dupe naturally), but bolting a single shared trigger onto one
 * card's own ref-callback slot did exactly that to the point of covering up
 * a real bug: this needs exactly one observer, over exactly one element,
 * still mounted every time this runs — a single `useEffect` on a normal
 * ref is the plain, direct way to get that.
 *
 * One-shot: the observer disconnects the instant it fires, so scrolling
 * back up past the container later never un-reveals or re-triggers it.
 *
 * No separate reduced-motion branch needed — same reasoning as
 * useScrollReveal: the un-animated CSS default IS the final revealed
 * appearance, so this hook flipping `revealed` to true is bookkeeping
 * either way, a visual change only when motion is on.
 */
export function useGroupReveal(containerRef: RefObject<HTMLElement | null>) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (revealed) return;
    const el = containerRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      // Feature-detection fallback, not a response to any external
      // event — same justification (and same pattern) as useJarPhysics.ts's
      // own post-mount setState for reading location.search.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRevealed(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -80px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [containerRef, revealed]);

  return revealed;
}

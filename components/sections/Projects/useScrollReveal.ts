"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/** Elements that become visible together in the same observer callback (a
 * fast scroll, or a tall viewport where several sit in view at once) rise
 * in this far apart from each other — never staggered against scroll
 * position itself, which is a different thing (see the brief). */
const REVEAL_STAGGER_MS = 100;

export interface RevealState {
  revealed: boolean;
  /** ms — apply as this element's own transition-delay once revealed, so
   * a same-callback batch rises in staggered rather than all at once. */
  delayMs: number;
}

const NOT_REVEALED: RevealState = { revealed: false, delayMs: 0 };

/**
 * One IntersectionObserver shared by every registered element (never one
 * per element — see the brief). Each element reveals exactly once: the
 * moment it crosses in, it's unobserved, so scrolling back up past it later
 * never replays the reveal.
 *
 * The reduced-motion "skip the animation entirely" requirement is handled
 * in CSS, not here (see Projects.module.css's .header / ProjectCard.module
 * .css's .reveal): the un-animated default in both is already the final,
 * revealed appearance, with the hidden initial state + transition scoped
 * inside a `prefers-reduced-motion: no-preference` query. So this hook
 * doesn't need its own reduced-motion branch — marking something revealed
 * here is bookkeeping either way, a visual change only when motion is on.
 */
export function useScrollReveal() {
  const [revealed, setRevealed] = useState<Record<string, RevealState>>({});
  const nodeToId = useRef<Map<Element, string>>(new Map());

  const observer = useMemo(() => {
    if (typeof IntersectionObserver === "undefined") return null;
    const io = new IntersectionObserver(
      (entries) => {
        // Sort so a same-callback batch stagger reads top-to-bottom rather
        // than in whatever order the browser happened to enumerate entries.
        const hits = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (hits.length === 0) return;

        setRevealed((prev) => {
          const next = { ...prev };
          hits.forEach((entry, i) => {
            const id = nodeToId.current.get(entry.target);
            if (id) next[id] = { revealed: true, delayMs: i * REVEAL_STAGGER_MS };
          });
          return next;
        });
        for (const entry of hits) io.unobserve(entry.target);
      },
      { threshold: 0.15, rootMargin: "0px 0px -80px 0px" },
    );
    return io;
  }, []);

  useEffect(() => {
    return () => observer?.disconnect();
  }, [observer]);

  // Stable per-id ref callback, same pattern as useFlipReorder's own
  // registerRef — elements here never unmount during the section's
  // lifetime (filtering only reorders/dims, see Projects/index.tsx's
  // displayIds), so there's no unobserve-on-unmount path to handle beyond
  // the whole-observer disconnect above.
  const registerRef = useMemo(() => {
    return (id: string) => (el: HTMLElement | null) => {
      if (el) {
        nodeToId.current.set(el, id);
        observer?.observe(el);
      }
    };
  }, [observer]);

  function getRevealState(id: string): RevealState {
    return revealed[id] ?? NOT_REVEALED;
  }

  return { registerRef, getRevealState };
}

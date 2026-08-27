"use client";

import { useLayoutEffect, useMemo, useRef } from "react";

/** Soft ease-out — matches the jar's own 250ms ease-out transitions in
 * spirit (JarItem.module.css), just longer since this is animating a much
 * bigger on-screen distance (a full card reorder) rather than an opacity
 * fade. */
const FLIP_DURATION_MS = 450;
const FLIP_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * Classic FLIP (First, Last, Invert, Play), keyed by a stable card id
 * (project slug / 'extras') rather than DOM index — so a card is diffed
 * against its OWN previous position regardless of how many other cards
 * moved around it.
 *
 * Transform-only, on purpose (never top/height — see the brief): every
 * card already has its real, final layout position the instant React
 * commits the new order (this hook doesn't touch layout at all); we just
 * read that position, compute how far it moved from where it was last
 * measured, instantly offset it back there with a transform, then animate
 * that transform to zero. The card's actual box never moves — only its
 * paint does — so this stays cheap regardless of how tall the list is.
 *
 * `order` should be a plain array of ids in current display order; only
 * its *contents* are compared (via a joined-string dependency) so passing
 * a fresh array reference each render doesn't cause spurious re-measures.
 */
/** Just the top/left this hook's math actually needs, measured in
 * document-absolute coordinates rather than a real (viewport-relative)
 * DOMRect — see where these get taken, below, for why. */
interface FlipPoint {
  top: number;
  left: number;
}

/**
 * `layoutKey`: optional — pass this when the caller's own box positions can
 * shift for a reason that has NOTHING to do with reordering (e.g.
 * ExtrasCaseStudy's masonry is packed against a measured container width
 * that starts at 0 and self-corrects a moment after mount — see
 * useElementWidth's own comment — so its very first real reorder used to
 * diff against rects captured during that bogus zero-width layout, which
 * read as a big meaningless jump rather than a clean slide: "jolts into
 * place" on the first click, fine after that once a real reorder had
 * already re-baselined things by accident). A `layoutKey` change re-
 * baselines silently (same no-animate path the very first run already
 * takes) instead of animating it as if it were a reorder, so the NEXT
 * genuine reorder always diffs against honest, current positions. Callers
 * with a layout that never depends on a measured value (Projects/index.tsx)
 * can simply omit it — omitted on every render, so it never appears to
 * "change," and behaviour is identical to before this param existed.
 */
export function useFlipReorder(order: string[], layoutKey?: string | number) {
  const nodesRef = useRef<Map<string, HTMLElement>>(new Map());
  const prevRectsRef = useRef<Map<string, FlipPoint> | null>(null);
  const isFirstRunRef = useRef(true);
  const prevLayoutKeyRef = useRef<string | number | undefined>(layoutKey);

  const registerRef = useMemo(() => {
    return (id: string) => (el: HTMLElement | null) => {
      if (el) nodesRef.current.set(id, el);
      else nodesRef.current.delete(id);
    };
  }, []);

  const orderKey = order.join("|");

  useLayoutEffect(() => {
    // Invert-then-play for one node — pulled out to its own function (not
    // inlined in the loop below) purely for readability; it's still called
    // synchronously, in order, for every node that moved.
    function flipOne(el: HTMLElement, dx: number, dy: number) {
      // Invert: jump instantly to where it visually still is.
      el.style.transition = "none";
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      // Force a style/layout flush so the browser actually commits the
      // instant jump above before the next line changes it again —
      // otherwise both writes coalesce into a single paint and there's
      // nothing to animate FROM.
      el.getBoundingClientRect();
      // Play: animate the invert away, back down to the real position.
      el.style.transition = `transform ${FLIP_DURATION_MS}ms ${FLIP_EASING}`;
      el.style.transform = "";
    }

    const nodes = nodesRef.current;
    // getBoundingClientRect() is viewport-relative — fine for a reorder that
    // happens to fire without the page having scrolled in between, but nine
    // times out of ten in practice the very first couple of filter clicks on
    // a fresh load happen right after the user scrolled down to actually
    // see the cards. That scroll moves every card's viewport-relative rect
    // by however far the page moved, with nothing to do with reordering at
    // all — and since this hook diffs "now" against whatever was measured
    // last render, that scroll delta leaks straight into dx/dy, on top of
    // the real reorder distance. The result: a big, spurious jump that
    // undoes itself over FLIP_DURATION_MS, before/after any actual card
    // movement. Adding the current scroll offset converts each rect to
    // document-absolute coordinates, which don't change just because the
    // user scrolled — so a scroll between two reorders (or between mount
    // and the first one) no longer pollutes the measured delta. Once the
    // user stops scrolling between clicks the two methods agree, which is
    // why this only ever showed up on the first click or two.
    const newRects = new Map<string, FlipPoint>();
    for (const [id, el] of nodes) {
      const r = el.getBoundingClientRect();
      newRects.set(id, { top: r.top + window.scrollY, left: r.left + window.scrollX });
    }

    const prevRects = prevRectsRef.current;
    const reducedMotion = typeof window !== "undefined" && window.matchMedia(REDUCED_MOTION).matches;
    // See layoutKey's own doc comment above — a layout-driven position
    // change is not a reorder, so it doesn't get the invert+play treatment.
    const layoutChanged = prevLayoutKeyRef.current !== layoutKey;

    if (!isFirstRunRef.current && prevRects && !reducedMotion && !layoutChanged) {
      for (const [id, el] of nodes) {
        const oldRect = prevRects.get(id);
        const newRect = newRects.get(id);
        // A card with no prior rect (just mounted — e.g. first paint of a
        // card that didn't exist yet) has nowhere to invert FROM; it just
        // appears at its new position, which is correct, not a bug.
        if (!oldRect || !newRect) continue;

        const dx = oldRect.left - newRect.left;
        const dy = oldRect.top - newRect.top;
        if (dx === 0 && dy === 0) continue;

        flipOne(el, dx, dy);
      }
    }
    // reducedMotion (or the first run) intentionally does nothing here:
    // nodes are already sitting at their real new position with no
    // transform applied, which is exactly the "snap instantly" behaviour
    // the brief asks for — there's no jump to undo in the first place.

    isFirstRunRef.current = false;
    prevLayoutKeyRef.current = layoutKey;
    prevRectsRef.current = newRects;
    // orderKey (not `order`) is the real dependency — see its own comment.
    // layoutKey is deliberately also a dependency: see its own doc comment.
  }, [orderKey, layoutKey]);

  return registerRef;
}

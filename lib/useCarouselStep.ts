"use client";

import { useCallback, useState } from "react";

// Step-counter bookkeeping behind the /playground/[category] detail page's
// rotating photo arc — ported directly from jar-portfolio's own
// lib/useCarouselStep.ts (there, shared between two carousels; this repo
// only has the one, but the hook itself is unchanged).
//
// `step` is deliberately never wrapped back into 0..itemCount-1 — that's
// what actually fixes the "one item suddenly sweeps/snaps to the opposite
// side" bug a wrapped-index approach has: deriving each item's on-screen
// offset as "shortest path from the wrapped index to this item" is correct
// in isolation, but as the wrapped index ticks over, the *shortest* path
// for whichever item sits near the halfway point can flip from one side to
// the other in a single step — and that one item visibly jumps across the
// whole arc while everything else slides normally. Driving every item's
// position from one shared, monotonic step instead means there's only ever
// one motion happening: the whole wheel shifts by exactly one slot, in one
// direction, together, because no individual item ever recomputes which
// side it's "closer" to.
//
// Everything downstream of this stays local to the caller — how many
// neighbors actually render, that they sit on a curved arc rather than a
// line, any per-item jump/freeze handling for an odd item count's own
// halfway ties (see CategoryDetail.tsx).
export function useCarouselStep(itemCount: number) {
  const [step, setStep] = useState(0);
  const index = itemCount === 0 ? 0 : ((step % itemCount) + itemCount) % itemCount;

  const goBy = useCallback((delta: number) => setStep((s) => s + delta), []);

  // Only for UI that can jump straight to an arbitrary target, potentially
  // several slots away — picks whichever direction around the loop is
  // shorter. Ordinary single-slot moves (arrows, clicking a neighbor)
  // should call goBy directly instead: they only ever move by exactly one
  // slot, so there's no "which direction" choice to make in the first
  // place. Not currently called by CategoryDetail.tsx (nothing there jumps
  // more than one slot at a time), kept for parity with the source hook and
  // any future UI that needs it (e.g. dot indicators).
  const goTo = useCallback(
    (targetIndex: number) => {
      if (itemCount === 0) return;
      let delta = (((targetIndex - index) % itemCount) + itemCount) % itemCount;
      if (delta > itemCount / 2) delta -= itemCount;
      goBy(delta);
    },
    [index, itemCount, goBy],
  );

  // Resets back to step 0 — for a carousel whose underlying item list can
  // change out from under an already-mounted instance (not currently
  // exercised here since each /playground/[category] route mounts a fresh
  // CategoryDetail instance per category, but kept for parity with the
  // source hook).
  const reset = useCallback(() => setStep(0), []);

  return { step, index, goBy, goTo, reset };
}

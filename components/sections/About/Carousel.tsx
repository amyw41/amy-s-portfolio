"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WHATS_INSIDE_ITEMS } from "@/lib/whatsInsideItems";
import { useElementWidth } from "@/components/sections/Playground/useElementWidth";
import { NEIGHBOR_SCALE, computeLayout } from "./whatsInsideLayout";
import styles from "./About.module.css";

const ITEM_COUNT = WHATS_INSIDE_ITEMS.length;
// Ratio of the original desktop design (track height 448px at itemSize
// 360px) — kept constant (even though CENTER_SCALE below is now smaller
// than the 1.3 it was tuned for) so there's still headroom to spare rather
// than cutting it exactly to size.
const TRACK_HEIGHT_RATIO = 448 / 360;
// Was 1.3 — the featured/center item read as too large, per request.
const CENTER_SCALE = 1.1;
const FAR_SCALE = 0.55;

/**
 * Ported from jar-portfolio's components/WhatsInside/Carousel.tsx — a
 * centered, scaled-up featured item with faded/shrunk neighbors (invisible
 * past that), prev/next arrows, dot indicators below to jump to any item.
 * Single static image per item (object-fit: contain — these are
 * product-style photos on a transparent background, not video), no
 * StarBadge easter egg (dropped — it wasn't verifiable against anything in
 * this codebase or jar-portfolio).
 *
 * THE WIDTH FIX: `wrapRef` is attached to `.carouselWidthMeasure` below,
 * which is `width: 100%` with no flex/align-items shrink-to-fit context of
 * its own — it's a plain block box that stretches to fill whatever
 * `.pageContainer`-scoped element contains it (WhatsInside.tsx's own
 * `.pageContainer` div), so `useElementWidth`'s measured value is that
 * element's *real* rendered width, not a smaller shrink-to-fit one. The
 * actual flex-centered visual layout (`.carouselWrap`) is a CHILD of that
 * measured box, not the measured box itself — keeping those two concerns
 * (what gets measured vs. how it's visually laid out) on separate elements
 * is what a previous, broken attempt at this section got backwards.
 */
export default function Carousel() {
  const [index, setIndex] = useState(0);
  const [wrapRef, containerWidth] = useElementWidth<HTMLDivElement>();
  const { itemSize, imageSize, spacing, containerWidth: trackWidth, gap } = computeLayout(containerWidth);
  const trackHeight = itemSize * TRACK_HEIGHT_RATIO;

  // Wraps so the carousel loops infinitely: index -1 becomes the last item,
  // index ITEM_COUNT becomes the first.
  const goTo = (i: number) => setIndex(((i % ITEM_COUNT) + ITEM_COUNT) % ITEM_COUNT);

  // Canonical (shortest-path-to-center) offset for item `i` at a given
  // index — always bounded to (-ITEM_COUNT/2, ITEM_COUNT/2]. Staying
  // inside that bound is what makes the loop actually loop: click "next"
  // enough times and every item's offset has to come back around through
  // this same small range, not keep growing.
  const canonicalOffset = (i: number, idx: number) => {
    let diff = (((i - idx) % ITEM_COUNT) + ITEM_COUNT) % ITEM_COUNT;
    if (diff > ITEM_COUNT / 2) diff -= ITEM_COUNT;
    return diff;
  };

  // Remembers the last CANONICAL offsets (not whatever was actually
  // rendered — see the effect below) purely so this render's jolt-
  // smoothing pick has something to compare against.
  const prevCanonicalRef = useRef<number[]>(WHATS_INSIDE_ITEMS.map((_, i) => canonicalOffset(i, 0)));

  // Each item's rendered slide offset, picked to be CONTINUOUS with where
  // that same item was sitting a moment ago instead of independently
  // nearest to center. Nearest-to-center alone is correct for a single
  // snapshot, but recomputing it fresh from scratch on every index change
  // means an item can flip which "lap" of the ring it's representing
  // between two renders — e.g. a right neighbor at offset +1 can suddenly
  // need to become offset -4 after a far dot click, and Framer Motion just
  // animates the raw jump from +1 to -4, a jolt that visibly slides
  // backwards through the center instead of the carousel rotating toward
  // the clicked item. Comparing against the *previous* offset instead of
  // zero picks whichever of the two adjacent laps (the canonical value, or
  // that value ± ITEM_COUNT) is actually closer, so every item's motion
  // stays continuous and moving the same direction for this transition —
  // capped to exactly one alternate lap (not unboundedly many, as an
  // earlier version of this did) so a long run of same-direction clicks
  // can never drift the reference out of range and stop the loop from
  // looping.
  const offsets = useMemo(() => {
    return WHATS_INSIDE_ITEMS.map((_, i) => {
      const raw = canonicalOffset(i, index);
      const alt = raw > 0 ? raw - ITEM_COUNT : raw + ITEM_COUNT;
      const prev = prevCanonicalRef.current[i] ?? 0;
      return Math.abs(raw - prev) <= Math.abs(alt - prev) ? raw : alt;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Re-canonicalizes the stored reference (NOT `offsets` itself, which may
  // have picked the alternate lap for this one transition) so it's always
  // back in the bounded range before the next click, keeping the loop
  // reliable no matter how many clicks happen in a row.
  useEffect(() => {
    prevCanonicalRef.current = WHATS_INSIDE_ITEMS.map((_, i) => canonicalOffset(i, index));
  }, [index]);

  return (
    <div ref={wrapRef} className={styles.carouselWidthMeasure}>
      <div className={styles.carouselWrap}>
        {/* Arrows are laid out as flex siblings of the item track, not
            absolutely positioned over it, so they always sit clear of the
            items. The flex gap here matches the gap baked into `spacing`
            below, so every gutter (arrow-neighbor, neighbor-center, ...)
            is equal. */}
        <div className={styles.carouselRow} style={{ gap }}>
          <button type="button" onClick={() => goTo(index - 1)} aria-label="Previous item" className={styles.navArrow}>
            <ChevronLeft size={23} strokeWidth={1.25} />
          </button>

          <div className={styles.carouselTrack} style={{ width: trackWidth, height: trackHeight }}>
            {/* Keyed so the one-time correction from the unmeasured
                (containerWidth===0) default to the real measured width
                remounts this fresh instead of animating a spring transition
                between the two — without the key, Framer Motion sees that
                as a prop change on an already-mounted tree and springs the
                items from clustered-near-center out to their real
                positions, which reads as an unwanted "pop" on first
                paint. */}
            <motion.div key={containerWidth === 0 ? "measuring" : "ready"} className={styles.carouselItemLayer}>
              {WHATS_INSIDE_ITEMS.map((item, i) => {
                const offset = offsets[i];
                const dist = Math.abs(offset);
                const isCenter = dist === 0;
                const scale = isCenter ? CENTER_SCALE : dist === 1 ? NEIGHBOR_SCALE : FAR_SCALE;
                const imageOpacity = isCenter ? 1 : dist === 1 ? 0.55 : 0;
                const nameOpacity = isCenter ? 1 : dist === 1 ? 0.5 : 0;

                return (
                  <motion.button
                    type="button"
                    key={item.id}
                    onClick={() => goTo(i)}
                    aria-label={`Go to ${item.name}`}
                    aria-hidden={dist > 1}
                    tabIndex={dist > 1 ? -1 : 0}
                    initial={false}
                    animate={{ x: offset * spacing, scale }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    style={{ zIndex: 10 - dist, width: itemSize, height: itemSize }}
                    className={styles.carouselItem}
                  >
                    <motion.div
                      animate={{ opacity: imageOpacity }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className={styles.carouselItemImageWrap}
                      style={{ width: imageSize, height: imageSize }}
                    >
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="(min-width: 640px) 230px, 205px"
                        draggable={false}
                        unoptimized={process.env.NODE_ENV !== "production"}
                        className={styles.carouselItemImage}
                      />
                    </motion.div>

                    <motion.span
                      animate={{ opacity: nameOpacity, scale: isCenter ? 0.85 : 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      // Floored at 11px — the itemSize-relative ratio alone
                      // (16/360) reads fine near MAX_ITEM_SIZE but shrinks
                      // to a couple of illegible px at the small end of the
                      // width-solve (narrow phones, MIN_ITEM_SIZE); this
                      // keeps the caption readable at every itemSize the
                      // solve can actually produce.
                      style={{
                        maxWidth: Math.max(itemSize * (270 / 360), 90),
                        fontSize: Math.max(itemSize * (16 / 360), 11),
                      }}
                      className={styles.carouselItemCaption}
                    >
                      {item.name}
                    </motion.span>
                  </motion.button>
                );
              })}
            </motion.div>
          </div>

          <button type="button" onClick={() => goTo(index + 1)} aria-label="Next item" className={styles.navArrow}>
            <ChevronRight size={23} strokeWidth={1.25} />
          </button>
        </div>

        <div className={styles.dots}>
          {WHATS_INSIDE_ITEMS.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to ${item.name}`}
              className={`${styles.dot} ${i === index ? styles.dotActive : ""}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WHATS_INSIDE_ITEMS } from "@/lib/whatsInsideItems";
import { useElementWidth } from "@/components/sections/Playground/useElementWidth";
import { NEIGHBOR_SCALE, computeLayout } from "./whatsInsideLayout";
import StarBadge from "./StarBadge";
import styles from "./About.module.css";

const ITEM_COUNT = WHATS_INSIDE_ITEMS.length;
// Ratio of the original desktop design (track height 448px at itemSize
// 360px) — kept constant so the track always has enough headroom for the
// center item's 1.3x hover/active scale without clipping it against
// overflow-hidden.
const TRACK_HEIGHT_RATIO = 448 / 360;
// Extra headroom on top of the ratio above, sized to fit the star badge's
// own hover-grow/click-bounce and its icon's upward jump-spin — fixed px,
// not scaled by itemSize, since the badge itself is a fixed size regardless
// of viewport.
const STAR_HEADROOM_PX = 48;
const CENTER_SCALE = 1.3;
const FAR_SCALE = 0.55;

/**
 * Ported from amy-wangs-jar's components/WhatsInside/Carousel.tsx — the
 * jar's own physical "favourite" items (WHATS_INSIDE_ITEMS), not project
 * cards. Two deliberate changes from that source:
 * - Width comes from useElementWidth (a ref on this component's own
 *   wrapping div, already inside .pageContainer) instead of the source's
 *   own useViewportWidth (raw window.innerWidth) — see whatsInsideLayout.ts's
 *   own top comment for why that swap is what actually keeps this
 *   contained to .pageContainer's edges at every viewport width.
 * - The arrow buttons and bottom dot indicators no longer use the source's
 *   own #2460A4 (jar-portfolio's blue) — replaced with a light gray, per
 *   request ("anything that is the dark blue color from my old project can
 *   become a light gray").
 */
export default function Carousel({
  litItems,
  onToggleLit,
}: {
  litItems: Set<string>;
  onToggleLit: (id: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [wrapRef, containerWidth] = useElementWidth<HTMLDivElement>();
  const { itemSize, imageSize, spacing, containerWidth: trackWidth, gap } = computeLayout(containerWidth);
  const trackHeight = itemSize * TRACK_HEIGHT_RATIO + STAR_HEADROOM_PX;

  // Wraps so the carousel loops infinitely: index -1 becomes the last item,
  // index ITEM_COUNT becomes the first.
  const goTo = (i: number) => setIndex(((i % ITEM_COUNT) + ITEM_COUNT) % ITEM_COUNT);

  // Shortest signed distance from `index` to `i` around the loop, e.g. with
  // 10 items, the item right after the last one is offset +1 from it (not
  // -9) so it slides in from the correct side instead of snapping across
  // the screen.
  const wrappedOffset = (i: number) => {
    let diff = (((i - index) % ITEM_COUNT) + ITEM_COUNT) % ITEM_COUNT;
    if (diff > ITEM_COUNT / 2) diff -= ITEM_COUNT;
    return diff;
  };

  return (
    <div ref={wrapRef} className={styles.carouselWrap}>
      {/* Arrows are laid out as flex siblings of the item track, not
          absolutely positioned over it, so they always sit clear of the
          items. The flex gap here matches the gap baked into `spacing`
          below, so every gutter (arrow-neighbor, neighbor-center, ...) is
          equal. */}
      <div className={styles.carouselRow} style={{ gap }}>
        <button type="button" onClick={() => goTo(index - 1)} aria-label="Previous item" className={styles.navArrow}>
          <ChevronLeft size={23} strokeWidth={1.25} />
        </button>

        <div
          className={styles.carouselTrack}
          style={{ width: trackWidth, height: trackHeight }}
        >
          {/* Keyed so the one-time correction from the unmeasured
              (containerWidth===0) default to the real measured width
              remounts this fresh instead of animating a spring transition
              between the two — without the key, Framer Motion sees that as
              a prop change on an already-mounted tree and springs the
              items from clustered-near-center out to their real positions,
              which reads as an unwanted "pop" on first paint. */}
          <motion.div key={containerWidth === 0 ? "measuring" : "ready"} className={styles.carouselItemLayer}>
            {WHATS_INSIDE_ITEMS.map((item, i) => {
              const offset = wrappedOffset(i);
              const dist = Math.abs(offset);
              const isCenter = dist === 0;
              const scale = isCenter ? CENTER_SCALE : dist === 1 ? NEIGHBOR_SCALE : FAR_SCALE;
              const imageOpacity = isCenter ? 1 : dist === 1 ? 0.55 : 0;
              const textOpacity = isCenter ? 1 : dist === 1 ? 0.5 : 0;

              return (
                // div with role="button", not an actual <button> — this
                // item wraps the StarBadge (also a real <button>) when
                // centered, and HTML doesn't allow a <button> inside a
                // <button>.
                <motion.div
                  role="button"
                  key={item.id}
                  onClick={() => goTo(i)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      goTo(i);
                    }
                  }}
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

                  {/* Anchored to the outer itemSize box (bigger than the
                      imageSize box above), not to the image itself —
                      sitting in that existing margin is what keeps it
                      reading consistently across items regardless of each
                      product photo's own shape. Nested here (inside the
                      item's own animated box) rather than as a separate
                      overlay is what lets it travel with the item for free
                      during slide transitions. */}
                  {isCenter && (
                    <div className={styles.carouselStarSlot}>
                      <StarBadge size={30} iconSize={15} lit={litItems.has(item.id)} onToggle={() => onToggleLit(item.id)} />
                    </div>
                  )}

                  <motion.span
                    animate={{ opacity: textOpacity, scale: isCenter ? 0.75 : 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    style={{ maxWidth: itemSize * (270 / 360), fontSize: itemSize * (16 / 360) }}
                    className={styles.carouselItemCaption}
                  >
                    {item.description}
                  </motion.span>
                </motion.div>
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
  );
}

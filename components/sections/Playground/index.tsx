"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import CircleToggle from "@/components/ui/CircleToggle";
import PlateCircle from "./PlateCircle";
import PhotoTile from "./PhotoTile";
import { useElementWidth } from "./useElementWidth";
import {
  DESIGN_WIDTH,
  MAX_SCALE,
  PLATE_SIZE,
  SLIDE_UP_TRANSITION,
  VIEWPORT_AMOUNT,
  VISIBLE_STAGE_HEIGHT,
  photoRevealDelay,
  toPx,
} from "./posterLayout";
import { ETC_CATEGORIES } from "@/lib/etc";
import styles from "./Playground.module.css";
import { content } from "@/lib/content";

const copy = content.en.playground;

type ViewMode = "plate" | "collage";

/**
 * "What's on my plate?" — ported from jar-portfolio's app/etc/page.tsx (see
 * PhotoTile.tsx and posterLayout.ts for the poster-scaling and
 * single-persistent-element changes from that source) plus a new collage
 * view jar-portfolio doesn't have yet.
 *
 * `revealedCats` — which categories' plates have scrolled into view at
 * least once — lives here (not in a child) so it survives view-mode
 * toggling; every plate/photo below reads it to skip replaying its
 * scroll-reveal on anything but the genuine first time.
 */
export default function Playground() {
  const [viewMode, setViewMode] = useState<ViewMode>("plate");
  const [revealedCats, setRevealedCats] = useState<Set<string>>(new Set());
  const [wrapRef, availableWidth] = useElementWidth<HTMLDivElement>();

  const isPlateMode = viewMode === "plate";
  // 0 until the very first client measurement — useElementWidth corrects
  // that synchronously before paint, so scale:0 (poster invisible) never
  // actually renders.
  const scale = availableWidth > 0 ? Math.min(availableWidth / DESIGN_WIDTH, MAX_SCALE) : 0;

  function markRevealed(slug: string) {
    setRevealedCats((prev) => (prev.has(slug) ? prev : new Set(prev).add(slug)));
  }

  return (
    <section className={styles.section}>
      <div className={`pageContainer ${styles.container}`}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <div className={styles.heading}>
            <h1 className={styles.title}>{copy.title}</h1>
            <p className={styles.caption}>{copy.caption}</p>
          </div>

          <div className={styles.toggles}>
            <CircleToggle
              label={copy.toggles.plate}
              color="var(--c-red)"
              active={isPlateMode}
              onToggle={() => setViewMode("plate")}
            />
            <CircleToggle
              label={copy.toggles.collage}
              color="var(--c-blue)"
              active={!isPlateMode}
              onToggle={() => setViewMode("collage")}
            />
          </div>
        </motion.div>

        {/* Sized (height) only in plate mode — VISIBLE_STAGE_HEIGHT * scale,
            since .poster below is absolutely positioned inside it and a
            transform never contributes to a parent's auto height. In
            collage mode there's no artificial canvas at all — height is
            just left to the columns layout's own natural flow. Stays
            mounted (and its ResizeObserver running) across both modes so
            `scale` is already correct the instant you switch back to plate
            view, never a stale/zero flash. */}
        <div ref={wrapRef} className={styles.stageWrap} style={isPlateMode ? { height: VISIBLE_STAGE_HEIGHT * scale } : undefined}>
          <div
            className={isPlateMode ? styles.poster : styles.collage}
            style={
              isPlateMode
                ? { width: DESIGN_WIDTH, height: VISIBLE_STAGE_HEIGHT, transform: `scale(${scale})` }
                : undefined
            }
          >
            {/* Plates only ever exist in plate mode — unlike the photos
                below, they don't morph into anything in collage view, so a
                plain conditional mount + fade is enough; no `layout` prop,
                no shared-element concerns. */}
            {isPlateMode &&
              ETC_CATEGORIES.map((cat) => {
                const revealed = revealedCats.has(cat.slug);
                return (
                  <div
                    key={cat.slug}
                    className={styles.plateSlot}
                    style={{ left: `${cat.plateXPct}%`, top: toPx(cat.plateYPct) }}
                  >
                    <motion.div
                      initial={revealed ? false : { opacity: 0, y: 40 }}
                      animate={revealed ? { opacity: 1, y: 0 } : undefined}
                      whileInView={!revealed ? { opacity: 1, y: 0 } : undefined}
                      viewport={{ once: true, amount: VIEWPORT_AMOUNT }}
                      onViewportEnter={() => markRevealed(cat.slug)}
                      transition={SLIDE_UP_TRANSITION}
                    >
                      <PlateCircle label={cat.label} src={cat.plateImage} size={PLATE_SIZE} />
                    </motion.div>
                  </div>
                );
              })}

            {/* One persistent wrapper per category, ALWAYS mounted in both
                modes (never conditionally rendered like the plates above) —
                that's what lets it just get restyled between modes instead
                of unmounting/remounting, exactly like .poster/.collage
                themselves one level up. In plate mode it's an unstyled
                pass-through div (position:static, no box of its own — its
                children are absolutely positioned against .poster directly,
                same as if this wrapper weren't there at all); in collage
                mode it becomes that category's own column-width masonry
                container (see .collageSection), which is what keeps
                drawing/dancing/nails each a clean, independently-packed
                block stacked on the ones before it — a single masonry
                container spanning all three categories can't do that (see
                Playground.module.css's own comment on why). Since this
                wrapper's own identity never changes across modes, every
                PhotoTile inside it stays the same persistent element too —
                the FLIP animation between plate/collage positions keeps
                working exactly as it does for every other photo. */}
            {ETC_CATEGORIES.map((cat) => (
              <div key={cat.slug} className={isPlateMode ? undefined : styles.collageSection}>
                {cat.photos.map((photo) => (
                  <PhotoTile
                    key={photo.src}
                    photo={photo}
                    mode={viewMode}
                    visible={revealedCats.has(cat.slug)}
                    delay={photoRevealDelay(cat.photos, photo)}
                    fallback={{ xPct: cat.plateXPct, yPct: cat.plateYPct }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

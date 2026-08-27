"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import CircleToggle from "@/components/ui/CircleToggle";
import PlateCircle from "./PlateCircle";
import PhotoTile from "./PhotoTile";
import { useElementWidth } from "./useElementWidth";
import { computeJustifiedLayout, estimateCaptionHeight, getCaptionFont, getColumnWidth } from "./justifiedLayout";
import {
  DESIGN_WIDTH,
  MAX_SCALE,
  PLATE_SIZE,
  SLIDE_UP_TRANSITION,
  VIEWPORT_AMOUNT,
  VISIBLE_STAGE_HEIGHT,
  toPx,
} from "./posterLayout";
import { ETC_CATEGORIES } from "@/lib/etc";
import styles from "./Playground.module.css";
import { content } from "@/lib/content";

const copy = content.en.playground;

type ViewMode = "plate" | "collage";

// Collage mode's own row-packing tuning (see justifiedLayout.ts) — a flat,
// category-ordered list (drawing, then dancing, then nails, each in
// lib/etc.ts's own listed order) is what actually gives the packed rows
// their row-major reading order; ETC_CATEGORIES itself never reorders.
const COLLAGE_PHOTOS = ETC_CATEGORIES.flatMap((cat) => cat.photos);
const COLLAGE_GAP = 8;
// 3 columns per request ("3 per row") — narrowed on smaller viewports so a
// column never gets squeezed to a sliver, same mobile-safety intent as the
// old grid's own breakpoint.
function collageColumnCount(containerWidth: number): number {
  if (containerWidth > 0 && containerWidth < 420) return 1;
  if (containerWidth > 0 && containerWidth < 700) return 2;
  return 3;
}

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
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("plate");
  const [revealedCats, setRevealedCats] = useState<Set<string>>(new Set());
  const [wrapRef, availableWidth] = useElementWidth<HTMLDivElement>();

  // Kicks off compiling each category's detail route in the background as
  // soon as this page mounts, rather than waiting on a plate's own Link to
  // scroll into view — makes clicking into a plate feel instant instead of
  // compiling the route on first click (matches jar-portfolio's own
  // app/etc/page.tsx).
  useEffect(() => {
    for (const cat of ETC_CATEGORIES) {
      router.prefetch(`/playground/${cat.slug}`);
    }
  }, [router]);

  const isPlateMode = viewMode === "plate";
  // 0 until the very first client measurement — useElementWidth corrects
  // that synchronously before paint, so scale:0 (poster invisible) never
  // actually renders.
  const scale = availableWidth > 0 ? Math.min(availableWidth / DESIGN_WIDTH, MAX_SCALE) : 0;

  // Solved once per width change (not per render) — computeJustifiedLayout
  // walks every photo, so this is worth memoizing even though it's cheap
  // per-call. Recomputes in plate mode too (availableWidth still updates
  // then, from the same ResizeObserver) so it's already correct the instant
  // you switch to collage view, never a stale/zero flash the way `scale`
  // above deliberately avoids for the poster.
  const collageLayout = useMemo(() => {
    const columnCount = collageColumnCount(availableWidth);
    const columnWidth = getColumnWidth(availableWidth, columnCount, COLLAGE_GAP);
    // Per-photo, not one fixed row for all of them — a caption's real
    // wrapped line count depends on both its own text AND this exact column
    // width, so a photo with a long caption (lib/etc.ts has several) gets a
    // taller reserved row than one with a short caption, instead of every
    // tile paying for the longest one up front.
    const { fontSizePx, fontFamily } = getCaptionFont();
    const captionHeights = COLLAGE_PHOTOS.map((photo) => estimateCaptionHeight(photo.caption, columnWidth, fontSizePx, fontFamily));
    return computeJustifiedLayout(
      COLLAGE_PHOTOS.map((photo) => photo.width / photo.height),
      availableWidth,
      columnCount,
      COLLAGE_GAP,
      captionHeights,
      // rowGap:0 — the caption band below each photo (see PhotoTile.tsx's
      // own .collageCaptionBand) already centers the caption and so
      // supplies its own symmetric breathing room; an extra vertical gap
      // here on top of that would only pad the space below the caption,
      // breaking the "equal distance above and below" the centering is
      // meant to give. COLLAGE_GAP above still applies horizontally,
      // between columns.
      0,
    );
  }, [availableWidth]);
  const collageBoxBySrc = useMemo(() => {
    const map = new Map<string, (typeof collageLayout.boxes)[number]>();
    COLLAGE_PHOTOS.forEach((photo, i) => map.set(photo.src, collageLayout.boxes[i]));
    return map;
  }, [collageLayout]);

  function markRevealed(slug: string) {
    setRevealedCats((prev) => (prev.has(slug) ? prev : new Set(prev).add(slug)));
  }

  return (
    <section className={styles.section}>
      <div className={`pageContainer ${styles.container}`}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
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
          {/* Plates live in their own layer, always sized/scaled exactly
              like .poster below regardless of isPlateMode — see
              .plateLayer's own comment (Playground.module.css) for why: a
              plate previously lived inside the very div whose size/transform
              swap instantly the moment you leave plate mode, so an exiting
              plate's containing block was yanked out from under it in the
              same frame its exit animation started, reading as an instant
              disappearance instead of a fade even though `exit` was
              genuinely still running. Decoupling this layer from that swap
              is what lets the opacity fade actually show. */}
          <div
            className={styles.plateLayer}
            style={{ width: DESIGN_WIDTH, height: VISIBLE_STAGE_HEIGHT, transform: `scale(${scale})` }}
          >
            {/* Plates only ever exist in plate mode — unlike the photos
                below, they don't morph into anything in collage view, they
                just fade away (AnimatePresence's own `exit`) as photos
                leave their cluster, and fade back in (see the `initial`/
                `animate` split below) on switching back. */}
            <AnimatePresence>
              {isPlateMode &&
                ETC_CATEGORIES.map((cat) => {
                  const revealed = revealedCats.has(cat.slug);
                  return (
                    <div
                      key={cat.slug}
                      className={styles.plateSlot}
                      style={{ left: `${cat.plateXPct}%`, top: toPx(cat.plateYPct) }}
                    >
                      {/* Each plate is a link into its own detail page (see
                          app/playground/[category]/page.tsx) — .plateLink's
                          own :hover rule (Playground.module.css) lightens
                          the whole plate as the affordance that it's
                          clickable, same group/group-hover trick jar-
                          portfolio's own version used (see
                          Playground.module.css's own comment for the earlier
                          hover treatments this replaced). */}
                      <Link
                        href={`/playground/${cat.slug}`}
                        aria-label={`View ${cat.label} photos`}
                        className={styles.plateLink}
                      >
                        <motion.div
                          // `initial` always starts hidden — what changes is
                          // which prop actually animates it to visible. Once
                          // a category has been revealed once, `animate`
                          // fires immediately on every future (re)mount
                          // (i.e. every time you switch back to plate view —
                          // AnimatePresence above fully unmounts these on
                          // exit, so this really is a fresh mount each
                          // time), rather than waiting on `whileInView`
                          // again, which only matters for the genuine first
                          // scroll-reveal below.
                          initial={{ opacity: 0 }}
                          animate={revealed ? { opacity: 1 } : undefined}
                          whileInView={!revealed ? { opacity: 1 } : undefined}
                          viewport={{ once: true, amount: VIEWPORT_AMOUNT }}
                          onViewportEnter={() => markRevealed(cat.slug)}
                          exit={{ opacity: 0 }}
                          transition={SLIDE_UP_TRANSITION}
                        >
                          <PlateCircle
                            label={cat.label}
                            src={cat.plateImage}
                            size={PLATE_SIZE}
                          />
                        </motion.div>
                      </Link>
                    </div>
                  );
                })}
            </AnimatePresence>
          </div>

          <div
            className={isPlateMode ? styles.poster : styles.collage}
            style={
              isPlateMode
                ? { width: DESIGN_WIDTH, height: VISIBLE_STAGE_HEIGHT, transform: `scale(${scale})` }
                : { height: collageLayout.totalHeight }
            }
          >
            {/* One persistent wrapper per category, ALWAYS mounted in both
                modes (never conditionally rendered like the plates above) —
                that's what lets it just get restyled between modes instead
                of unmounting/remounting, exactly like .poster/.collage
                themselves one level up. In plate mode it's an unstyled
                pass-through div (position:static, no box of its own — its
                children are absolutely positioned against .poster directly,
                same as if this wrapper weren't there at all); in collage
                mode it's display:contents (see .collageSection), which
                removes the wrapper's own box from layout so its PhotoTiles
                position themselves directly against .collage's own single
                shared justified-layout below (collageBoxBySrc, computed
                once across every category's photos together — see this
                component's own computeJustifiedLayout call above), instead
                of each category packing its own separate block. Since this
                wrapper's own identity never
                changes across modes, every PhotoTile inside it stays the
                same persistent element too — the FLIP animation between
                plate/collage positions keeps working exactly as it does for
                every other photo. */}
            {ETC_CATEGORIES.map((cat) => (
              <div key={cat.slug} className={isPlateMode ? undefined : styles.collageSection}>
                {cat.photos.map((photo) => (
                  <PhotoTile
                    key={photo.src}
                    photo={photo}
                    mode={viewMode}
                    visible={revealedCats.has(cat.slug)}
                    fallback={{ xPct: cat.plateXPct, yPct: cat.plateYPct }}
                    collageBox={collageBoxBySrc.get(photo.src)}
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

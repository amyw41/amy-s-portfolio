"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { EtcPhoto } from "@/lib/etc";
import { slotLeft, slotTop } from "./posterLayout";
import type { CollageBox } from "./justifiedLayout";
import styles from "./Playground.module.css";

// Invisible anchor box size for a photo with no real plate-view position
// (every nails photo — see EtcPhoto's own comment in lib/etc.ts on why).
// Only matters as a FLIP *origin point* for the plate->collage transition
// below; never actually visible (opacity stays 0 in plate mode whenever
// `photo.plate` is absent, see the opacity calc below), so its exact size
// doesn't matter beyond "a plausible photo-ish box," not 0 (a 0-size box is
// a degenerate FLIP source/target).
const FALLBACK_SIZE = 48;

/**
 * One photo, rendered as a SINGLE persistent element across both view
 * modes — not two separate elements (one per view) matched by a shared
 * `layoutId`. That's the more commonly-demoed Framer Motion pattern (see
 * this component's own git history for the version that tried it first),
 * but it turned out unreliable here: AnimatePresence swapping PlateView's
 * whole tree out for CollageView's (both containing plain layoutId-matched
 * elements) intermittently left photos permanently stuck mid-FLIP, frozen
 * at the wrong on-screen position — worth re-investigating some day, but
 * for now this component instead just stays mounted for the page's entire
 * lifetime and switches its own className/style/children based on `mode`.
 * Since it's the exact same DOM node the whole time (same component
 * instance, same React key), Framer's plain `layout` prop (no `layoutId`
 * needed at all) detects the resulting position/size change on its own and
 * animates a FLIP between them — the same mechanism, just without the
 * cross-tree matching step that was misbehaving.
 *
 * Because the root has to stay literally the same element type in both
 * modes for React to preserve it (a `motion.div` in one mode and a
 * `motion.figure` in the other would make React unmount+remount instead of
 * diffing in place), this always renders a plain `motion.div` for both the
 * root and inner image wrapper, with only className/style/children
 * swapped — not a semantic `<figure>/<figcaption>` pairing.
 */
export default function PhotoTile({
  photo,
  mode,
  visible,
  fallback,
  collageBox,
}: {
  photo: EtcPhoto;
  mode: "plate" | "collage";
  /** Plate mode only: has this photo's category been scrolled into view
   * yet? Drives this photo's own opacity fade directly — same trigger, same
   * transition, no per-photo delay of its own any more, so every photo
   * fades in at the exact same moment as its own plate rather than
   * cascading in afterward (see this component's own transition below).
   * Ignored in collage mode, which always shows everything. */
  visible: boolean;
  /** Plate-view anchor to use when `photo.plate` itself is absent (nails)
   * — its own category's plate center, so a photo with no real scatter
   * position still has somewhere sensible to (invisibly) sit in plate mode
   * and FLIP out from when switching to collage. */
  fallback: { xPct: number; yPct: number };
  /** Collage mode only: this photo's box (px, relative to .collage), from
   * index.tsx's own computeJustifiedLayout call — undefined for exactly one
   * render (the very first, before availableWidth has ever measured
   * anything), in which case the tile just sits collapsed at 0×0 until the
   * next render supplies a real box. */
  collageBox?: CollageBox;
}) {
  const isPlateMode = mode === "plate";
  const plate = photo.plate;
  const xPct = plate?.xPct ?? fallback.xPct;
  const yPct = plate?.yPct ?? fallback.yPct;
  const width = plate?.width ?? FALLBACK_SIZE;
  const height = plate?.height ?? FALLBACK_SIZE;
  const z = plate?.z ?? 0;
  const box = collageBox ?? { x: 0, y: 0, width: 0, height: 0 };

  return (
    <motion.div
      layout
      className={isPlateMode ? styles.photoSlot : styles.collageItem}
      style={
        isPlateMode
          ? { left: slotLeft(xPct, width), top: slotTop(yPct, height), width, height, zIndex: z }
          : { left: box.x, top: box.y, width: box.width, height: box.height }
      }
      // initial={false}: this element is never actually mounting fresh (see
      // the component's own comment above) — its very first real appearance
      // is handled by the opacity animate below (gated on `visible`), not a
      // mount transition.
      initial={false}
      animate={{ opacity: isPlateMode ? (plate && visible ? 1 : 0) : 1 }}
      // opacity split out from `layout` (rather than one shared transition)
      // so a mode switch's position/size FLIP never wants for a delay of
      // its own — unrelated to the plate-view opacity fade itself, which
      // now carries no delay either (both photo and plate fade in on this
      // exact same transition, starting the instant `visible` flips true).
      transition={{
        layout: { duration: 0.35, ease: "easeOut" },
        opacity: { duration: 0.35, ease: "easeOut" },
      }}
    >
      {/* Collage mode: the root motion.div above is already sized to
          `box.width` x `box.height` — index.tsx's own computeJustifiedLayout
          solved that box to be exactly this photo's own natural aspect
          ratio (width/height), never a shared/cropped shape. So this inner
          box just fills the root at 100%/100%; object-fit:cover on the
          image below is really a no-op in practice (the box and the image
          already share the same ratio) and is only there as a safety net
          against any rounding sliver. The caption lives INSIDE this box as
          a bottom-overlay (see .collageCaption) rather than flowing below
          it, since the root's height is now load-bearing layout math —
          adding a caption's own height below would throw off every row
          after it. */}
      <div className={isPlateMode ? styles.photoFrame : styles.collageImageBox}>
        <Image
          src={photo.src}
          alt=""
          fill
          sizes={isPlateMode ? `${Math.round(width)}px` : `${Math.round(box.width)}px`}
          className={isPlateMode ? styles.photoImage : styles.collageImage}
          draggable={false}
          unoptimized={process.env.NODE_ENV !== "production"}
        />
        {!isPlateMode && <p className={styles.collageCaption}>{photo.caption}</p>}
      </div>
    </motion.div>
  );
}

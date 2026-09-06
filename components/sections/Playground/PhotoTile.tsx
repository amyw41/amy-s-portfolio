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
  fallback,
  collageBox,
}: {
  photo: EtcPhoto;
  mode: "plate" | "collage";
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
  const box = collageBox ?? { x: 0, y: 0, width: 0, height: 0, imageHeight: 0 };

  return (
    <motion.div
      layout
      className={isPlateMode ? styles.photoSlot : styles.collageItem}
      style={
        isPlateMode
          ? { left: slotLeft(xPct, width), top: slotTop(yPct, height), width, height, zIndex: z }
          : { left: box.x, top: box.y, width: box.width, height: box.height }
      }
      initial={{ opacity: 0 }}
      animate={{ opacity: isPlateMode ? (plate ? 1 : 0) : 1 }}
      transition={{
        layout: { duration: 0.35, ease: "easeOut" },
        opacity: { duration: 0.35, ease: "easeOut" },
      }}
    >
      {/* Collage mode: the root motion.div above is sized to `box.width` x
          `box.height`, where `box.height` = the photo's own natural-ratio
          image height PLUS a fixed caption row that
          index.tsx's own computeJustifiedLayout call reserves for every
          tile (see justifiedLayout.ts's `captionHeight` param) — the
          packing math already accounts for the caption, so giving it that
          space here doesn't throw off any row after it. .collageItem
          (styles) is a flex column: the image box below is set to exactly
          `box.imageHeight` (its own true aspect-ratio height, not the
          fuller box height), and the caption takes up the rest. */}
      {isPlateMode ? (
        <div className={styles.photoFrame}>
          <Image
            src={photo.src}
            alt=""
            fill
            sizes={`${Math.round(width)}px`}
            className={styles.photoImage}
            draggable={false}
            priority
            unoptimized={process.env.NODE_ENV !== "production"}
          />
        </div>
      ) : (
        <>
          <div className={styles.collageImageBox} style={{ height: box.imageHeight }}>
            <Image
              src={photo.src}
              alt=""
              fill
              sizes={`${Math.round(box.width)}px`}
              className={styles.collageImage}
              draggable={false}
              unoptimized={process.env.NODE_ENV !== "production"}
              // Same fade-in-on-load as the plate-mode Image above, PLUS a
              // ref check `onLoad` alone can't cover: this exact src was
              // almost always just showing in plate mode's own <img> a
              // moment ago (every photo renders there first), so switching
              // to collage remounts a BRAND NEW <img> pointing at a src the
              // browser already has fully decoded/cached. In that case the
              // browser can resolve `complete` before this element's own
              // 'load' event ever fires (a real race — see the stackoverflow
              // link in next/image's own image-component.js, whose internal
              // img.complete guard is subject to the exact same race and
              // doesn't reliably win it either), so nothing would otherwise
              // ever flip this photo's opacity back on — it'd stay invisible
              // forever. Checking `complete` the moment the ref attaches
              // catches that case; onLoad below still covers the genuine
              // first-time (uncached) load.
              ref={(img) => {
                if (img?.complete) img.style.opacity = "1";
              }}
              onLoad={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
            />
          </div>
          {/* .collageCaptionBand fills whatever's left of the box below the
              image (flex:1) and vertically centers the caption inside it
              (align-items:center) — so the space above the caption (band
              top to caption top) and the space below it (caption bottom to
              the box's own bottom edge) come out equal by construction,
              regardless of whether the caption wraps to 1 or 2 lines. See
              index.tsx's own computeJustifiedLayout call, which now passes
              rowGap:0 so nothing pads that space back out asymmetrically
              after the box ends. */}
          <div className={styles.collageCaptionBand}>
            <p className={styles.collageCaption}>{photo.caption}</p>
          </div>
        </>
      )}
    </motion.div>
  );
}

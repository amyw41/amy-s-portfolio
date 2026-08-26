"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { EtcPhoto } from "@/lib/etc";
import { slotLeft, slotTop } from "./posterLayout";
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
  delay,
  fallback,
}: {
  photo: EtcPhoto;
  mode: "plate" | "collage";
  /** Plate mode only: has this photo's category been scrolled into view
   * yet? Ignored in collage mode, which always shows everything. */
  visible: boolean;
  /** Plate mode only: this photo's stagger delay within its category's
   * reveal cascade (see posterLayout.ts's photoRevealDelay). */
  delay: number;
  /** Plate-view anchor to use when `photo.plate` itself is absent (nails)
   * — its own category's plate center, so a photo with no real scatter
   * position still has somewhere sensible to (invisibly) sit in plate mode
   * and FLIP out from when switching to collage. */
  fallback: { xPct: number; yPct: number };
}) {
  const isPlateMode = mode === "plate";
  const plate = photo.plate;
  const xPct = plate?.xPct ?? fallback.xPct;
  const yPct = plate?.yPct ?? fallback.yPct;
  const width = plate?.width ?? FALLBACK_SIZE;
  const height = plate?.height ?? FALLBACK_SIZE;
  const z = plate?.z ?? 0;

  return (
    <motion.div
      layout
      className={isPlateMode ? styles.photoSlot : styles.collageItem}
      style={
        isPlateMode
          ? { left: slotLeft(xPct, width), top: slotTop(yPct, height), width, height, zIndex: z }
          : undefined
      }
      // initial={false}: this element is never actually mounting fresh (see
      // the component's own comment above) — its very first real appearance
      // is handled by the opacity animate below (gated on `visible`), not a
      // mount transition.
      initial={false}
      animate={{ opacity: isPlateMode ? (plate && visible ? 1 : 0) : 1 }}
      // Split so the stagger `delay` only ever holds up the opacity fade —
      // and only for a photo that actually has a real plate-cluster
      // position (drawing/dancing; the delay means nothing for nails, which
      // has no reveal cascade of its own to stay in step with). Framer
      // applies a flat `transition` object to EVERY animatable value on
      // this element, `layout`'s own FLIP included unless it's split out
      // like this — with one shared `delay`, every photo sat frozen at its
      // old (collage) position for that whole delay before the position
      // tween even started, reading as a stall in a "wrong" spot rather
      // than a smooth move. `layout` here has no delay of its own, so the
      // position/size tween now starts immediately regardless of whether
      // opacity has anything to fade.
      transition={{
        layout: { duration: 0.35, ease: "easeOut" },
        opacity: { duration: 0.35, ease: "easeOut", delay: isPlateMode && plate ? delay : 0 },
      }}
    >
      {/* Collage mode: width comes from CSS (.collageImageBox's own
          `width: 100%`, filling its category's column-width masonry
          container — see index.tsx's collageSection wrapper and
          Playground.module.css), height from this inline aspectRatio — the
          browser resolves the two straight into a definite box, no JS math
          needed, so every photo keeps its own natural proportions (a tall
          portrait reads taller, a wide landscape shorter) while every
          column still lines up at the same width, the way a real pinned-up
          photo collage reads. This lives on the INNER box (not the root
          motion.div above) because the root also has to fit the caption
          below it — sizing the root itself to the image's aspect ratio
          would leave no room for that text. */}
      <div
        className={isPlateMode ? styles.photoFrame : styles.collageImageBox}
        style={!isPlateMode ? { aspectRatio: `${photo.width} / ${photo.height}` } : undefined}
      >
        <Image
          src={photo.src}
          alt=""
          fill
          sizes={isPlateMode ? `${Math.round(width)}px` : "(min-width: 900px) 220px, 45vw"}
          className={isPlateMode ? styles.photoImage : styles.collageImage}
          draggable={false}
          unoptimized={process.env.NODE_ENV !== "production"}
        />
      </div>
      {!isPlateMode && <p className={styles.collageCaption}>{photo.caption}</p>}
    </motion.div>
  );
}

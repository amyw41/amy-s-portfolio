"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { CaseStudyLayout } from "@/components/case-studies/CaseStudyKit";
import CircleToggle from "@/components/ui/CircleToggle";
import { useElementWidth } from "@/components/sections/Playground/useElementWidth";
import {
  computeJustifiedLayout,
  estimateCaptionHeight,
  getCaptionFont,
  getColumnWidth,
} from "@/components/sections/Playground/justifiedLayout";
import { useFlipReorder } from "@/components/sections/Projects/useFlipReorder";
import { EXTRAS_CATEGORIES, EXTRAS_PHOTOS, type ExtrasCategory } from "@/lib/extras";
import { content } from "@/lib/content";

const copy = content.en.projects.extras;

// 2 columns per request ("2 in a row") — see lib/extras.ts's own comment on
// EXTRAS_PHOTOS' authoring order for why that order (not this column count)
// is what actually determines which photo lands in which column.
const GALLERY_COLUMNS = 2;
// Matches Playground's own COLLAGE_GAP (components/sections/Playground/
// index.tsx) — same masonry technique, same gap, so the two collages on
// this site read as one system.
const GALLERY_GAP = 8;

// Was a bottom-sheet modal (ExtrasCard.tsx opened ExtrasModal on click) —
// per request, promoted to its own page using the same case-study shell
// (CaseStudyKit.tsx) every other project already uses, so "extras" gets the
// same taskbar/title/Back button treatment as Spotify Guessr/CyberSea/
// SkinSprout instead of a one-off popup. ExtrasCard.tsx now just links here
// (`/projects/extras`) like any other project card.
//
// No CaseStudyHero here (that's the big video/meta-grid block the other 3
// case studies use) — per request this page is just title + back button +
// the photo collage itself, not a full written case study. The title/
// subtitle below are copied verbatim from CaseStudyHero's own styling so
// this still reads as the same typographic system, just without the extra
// hero media block underneath it.
//
// The category buttons (CaseStudyLayout's `sidebarExtra`, below) render
// where the numbered section links normally go in every other case study —
// this page has no written sections to link to, so that slot holds real
// category filters instead, reusing the homepage's own CircleToggle
// component (see lib/extras.ts's EXTRAS_CATEGORIES for the color mapping).
//
// Filtering behavior matches the homepage's own project filters EXACTLY
// (components/sections/Projects/index.tsx), not a plain array .filter():
// every photo stays mounted at all times; toggling a category
// stable-partitions the photos (matching ones first, in their original
// relative order — same "sort by matches, then original index" technique
// that file uses for its own `displayIds`), animates the reorder with the
// same useFlipReorder hook, and dims non-matching photos with the site's
// standard translucent-white overlay (--dim-white — see
// ProjectCard.module.css's own .dimOverlay/.dimActive for the source of
// that pattern, reproduced here with Tailwind since this page is Tailwind-
// based). The masonry layout below is recomputed against this same
// matches-first order each time, so the reorder and the packing always
// agree on where each photo actually sits.
export default function ExtrasCaseStudy() {
  const [activeCategories, setActiveCategories] = useState<Set<ExtrasCategory>>(() => new Set());
  const [galleryRef, galleryWidth] = useElementWidth<HTMLDivElement>();

  function toggleCategory(category: ExtrasCategory) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  // Stable partition, exactly like Projects/index.tsx's own `displayIds` —
  // matching photos keep their original relative order and come first;
  // non-matching ones follow, also in their original relative order. With
  // no categories active every photo "matches", which is what collapses
  // this straight back to EXTRAS_PHOTOS' own authoring order.
  const orderedPhotos = useMemo(() => {
    return EXTRAS_PHOTOS.map((photo, index) => ({
      photo,
      index,
      matches: activeCategories.size === 0 || activeCategories.has(photo.category),
    }))
      .sort((a, b) => Number(b.matches) - Number(a.matches) || a.index - b.index)
      .map((entry) => entry.photo);
  }, [activeCategories]);

  const dimmedSrcs = useMemo(() => {
    if (activeCategories.size === 0) return new Set<string>();
    return new Set(EXTRAS_PHOTOS.filter((photo) => !activeCategories.has(photo.category)).map((p) => p.src));
  }, [activeCategories]);

  // Solved against `orderedPhotos` (not EXTRAS_PHOTOS' own fixed order) so
  // toggling a category re-packs the masonry around whichever photos are
  // now "first" — same idea as Playground's own collageLayout, just
  // recomputed on every filter change instead of only on width change.
  const galleryLayout = useMemo(() => {
    const columnWidth = getColumnWidth(galleryWidth, GALLERY_COLUMNS, GALLERY_GAP);
    // Per-photo, not one fixed row for all of them — matches Playground's
    // own collageLayout (index.tsx): a caption's real wrapped line count
    // depends on both its own text and this exact column width.
    const { fontSizePx, fontFamily } = getCaptionFont();
    const captionHeights = orderedPhotos.map((photo) => estimateCaptionHeight(photo.caption, columnWidth, fontSizePx, fontFamily));
    return computeJustifiedLayout(
      orderedPhotos.map((photo) => photo.width / photo.height),
      galleryWidth,
      GALLERY_COLUMNS,
      GALLERY_GAP,
      captionHeights,
      // rowGap:0 — matches Playground's own call (index.tsx): the caption
      // band below each photo centers the caption itself, so this stays
      // symmetric above/below without an extra vertical gap stacked on
      // top. GALLERY_GAP above still applies horizontally, between
      // columns.
      0,
    );
  }, [orderedPhotos, galleryWidth]);
  const boxBySrc = useMemo(() => {
    const map = new Map<string, (typeof galleryLayout.boxes)[number]>();
    orderedPhotos.forEach((photo, i) => map.set(photo.src, galleryLayout.boxes[i]));
    return map;
  }, [orderedPhotos, galleryLayout]);

  // Photos never unmount/reorder in the DOM (every box below is absolutely
  // positioned via its own box.x/box.y, so DOM order doesn't drive visual
  // order) — only the *target* position each one animates to changes, via
  // this same registerFlipRef/orderedPhotos pairing Projects/index.tsx uses
  // for its own cards.
  const registerFlipRef = useFlipReorder(orderedPhotos.map((p) => p.src));

  return (
    <CaseStudyLayout
      sectionNav={[]}
      sidebarExtra={
        <div className="mb-5 flex flex-col gap-3">
          {EXTRAS_CATEGORIES.map((c) => (
            <CircleToggle
              key={c.id}
              label={c.label}
              color={c.color}
              active={activeCategories.has(c.id)}
              onToggle={() => toggleCategory(c.id)}
            />
          ))}
        </div>
      }
    >
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45, ease: "easeOut" }}>
        <h1 className="font-instrument text-[clamp(2.75rem,7.5vw,4.5rem)] font-light leading-none tracking-[-0.04em] text-black/90">
          {copy.title}
        </h1>
        <p className="mt-3 font-body text-[clamp(16px,1.56vw,20px)] font-light text-black/70">{copy.description}</p>
      </motion.div>

      {/* mt-8 — matches CaseStudyHero's own subtitle-to-hero-image gap
          (the other 3 case studies' closest equivalent to "subtitle to
          first real visual content"), not the numbered-Section first-of-
          type margin (64px) this used before: that value was tuned for a
          heading that follows a whole hero-video-plus-meta-grid block,
          which reads as way too much space directly under two lines of
          text with nothing else above it. */}
      <div ref={galleryRef} className="relative mt-8" style={{ height: galleryLayout.totalHeight }}>
        {EXTRAS_PHOTOS.map((photo) => {
          const box = boxBySrc.get(photo.src);
          if (!box) return null;
          const dimmed = dimmedSrcs.has(photo.src);
          return (
            <div
              key={photo.src}
              ref={registerFlipRef(photo.src)}
              // Flex column: the image wrapper below is sized to
              // box.imageHeight (the photo's own true aspect-ratio height),
              // and the caption takes the GALLERY_CAPTION_HEIGHT row left
              // over below it — computeJustifiedLayout already reserved
              // that space (see its own captionHeight param), so this
              // doesn't throw off any photo packed underneath.
              className="absolute flex flex-col"
              style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
            >
              <div
                // rounded-[2px], not the case-study convention's
                // rounded-[8px] — per request, matches Playground's own
                // masonry gallery exactly (Playground.module.css's
                // .collageImageBox), since this collage is built on that
                // same layout technique and should read as the same kind of
                // gallery, corners included.
                className="relative w-full shrink-0 overflow-hidden rounded-[2px]"
                style={{ height: box.imageHeight }}
              >
                <Image
                  src={photo.src}
                  alt={photo.caption}
                  fill
                  sizes={`${Math.round(box.width)}px`}
                  className="object-cover"
                  unoptimized={process.env.NODE_ENV !== "production"}
                />
                {/* Same construction as ProjectCard.module.css's own
                    .dimOverlay/.dimActive (ported to Tailwind since this
                    page is Tailwind-based) — a plain white layer over the
                    photo itself (not the caption below it), opacity 0 at
                    rest, var(--dim-white) once any category filter is
                    active and this photo doesn't match it. */}
                <div
                  className="pointer-events-none absolute inset-0 bg-white transition-opacity duration-[250ms] ease-out"
                  style={{ opacity: dimmed ? "var(--dim-white)" : 0 }}
                />
              </div>
              {/* flex-1 + items-start: fills the rest of the box below the
                  image and anchors the caption to the TOP of it (not
                  centered) — matches Playground's own .collageCaptionBand
                  technique (PhotoTile.tsx) exactly, including the rowGap:0
                  passed into computeJustifiedLayout above. Combined with the
                  caption's own pt-1.5 below, that's
                  GALLERY_CAPTION_PADDING_TOP (6px) above the text; whatever
                  space is left below it down to this div's own bottom edge
                  comes out to exactly GALLERY_CAPTION_PADDING_BOTTOM (10px)
                  by construction, since estimateCaptionHeight above already
                  baked both numbers into this box's total height — per
                  request, slightly closer to its own photo than to the next
                  one. */}
              <div className="flex flex-1 items-start">
                {/* Sits in its own row below the photo now, not overlaid on
                    top of it — per request: no gradient scrim, left-aligned,
                    always visible (matches Playground's own .collageCaption
                    convention). text-[length:var(--gallery-caption-fs)] —
                    reads the same shared token (lib/tokens.css) Playground's
                    own .collageCaption reads directly, so a size change
                    there applies to both galleries at once instead of
                    needing to be copied into two places (same technique
                    CaseStudyKit.tsx's own back button already uses for
                    --fs-small). No line-clamp any more — the box below is
                    now sized (via estimateCaptionHeight above) to fit
                    however many lines this exact caption wraps to, so
                    there's nothing to truncate; matches Playground's own
                    .collageCaption, including its explicit leading-[1.3]
                    (not Tailwind's default), since estimateCaptionHeight
                    has to predict this same line-height ahead of the real
                    DOM layout. pt-1.5 (6px) — see this div's own comment. */}
                <p className="w-full pt-1.5 text-left font-body text-[length:var(--gallery-caption-fs)] font-light leading-[1.3] text-black/70">
                  {photo.caption}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </CaseStudyLayout>
  );
}

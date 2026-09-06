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
import { EXTRAS_CATEGORIES, EXTRAS_PHOTOS, type ExtrasCategory } from "@/lib/extras";
import { content } from "@/lib/content";
import { FADE_IN_TRANSITION } from "@/lib/motion";

const copy = content.en.projects.extras;

const GALLERY_COLUMNS = 2;
const GALLERY_GAP = 8;

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

  const dimmedSrcs = useMemo(() => {
    if (activeCategories.size === 0) return new Set<string>();
    return new Set(EXTRAS_PHOTOS.filter((photo) => !activeCategories.has(photo.category)).map((p) => p.src));
  }, [activeCategories]);

  // Static masonry layout based purely on width — photos never shift or reorder
  // when toggling categories; only opacity changes.
  const galleryLayout = useMemo(() => {
    const columnWidth = getColumnWidth(galleryWidth, GALLERY_COLUMNS, GALLERY_GAP);
    const { fontSizePx, fontFamily } = getCaptionFont();
    const captionHeights = EXTRAS_PHOTOS.map((photo) =>
      estimateCaptionHeight(photo.caption, columnWidth, fontSizePx, fontFamily),
    );
    return computeJustifiedLayout(
      EXTRAS_PHOTOS.map((photo) => photo.width / photo.height),
      galleryWidth,
      GALLERY_COLUMNS,
      GALLERY_GAP,
      captionHeights,
      0,
    );
  }, [galleryWidth]);

  const boxBySrc = useMemo(() => {
    const map = new Map<string, (typeof galleryLayout.boxes)[number]>();
    EXTRAS_PHOTOS.forEach((photo, i) => map.set(photo.src, galleryLayout.boxes[i]));
    return map;
  }, [galleryLayout]);

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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={FADE_IN_TRANSITION}>
        <h1 className="font-instrument text-[clamp(2.75rem,7.5vw,4.5rem)] font-light leading-none tracking-[-0.04em] text-black/90">
          {copy.title}
        </h1>
        <p className="mt-3 font-body text-[clamp(16px,1.56vw,20px)] font-light text-black/70">{copy.description}</p>
      </motion.div>

      <div ref={galleryRef} className="relative mt-8" style={{ height: galleryLayout.totalHeight }}>
        {EXTRAS_PHOTOS.map((photo) => {
          const box = boxBySrc.get(photo.src);
          if (!box) return null;
          const dimmed = dimmedSrcs.has(photo.src);
          return (
            <div
              key={photo.src}
              className="absolute flex flex-col transition-opacity duration-300 ease-out"
              style={{
                left: box.x,
                top: box.y,
                width: box.width,
                height: box.height,
                opacity: dimmed ? 0.3 : 1,
              }}
            >
              <div
                className="relative w-full shrink-0 overflow-hidden rounded-[2px] border border-black/[0.12]"
                style={{ height: box.imageHeight }}
              >
                <Image
                  src={photo.src}
                  alt={photo.caption}
                  fill
                  sizes={`${Math.round(box.width)}px`}
                  className="object-cover opacity-0 transition-opacity duration-[400ms] ease-out motion-reduce:opacity-100 motion-reduce:transition-none"
                  unoptimized={process.env.NODE_ENV !== "production"}
                  onLoad={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
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

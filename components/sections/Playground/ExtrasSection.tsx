"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useElementWidth } from "./useElementWidth";
import { computeJustifiedLayout, estimateCaptionHeight, getCaptionFont, getColumnWidth } from "./justifiedLayout";
import { EXTRAS_PHOTOS } from "@/lib/extras";
import { content } from "@/lib/content";
import styles from "./Playground.module.css";

const copy = content.en.playground;

const GAP = 8;
function columnCount(containerWidth: number): number {
  if (containerWidth > 0 && containerWidth < 420) return 1;
  if (containerWidth > 0 && containerWidth < 700) return 2;
  return 3;
}

/**
 * "little design things": every extra (lib/extras.ts — posters, logos,
 * little sites) under the Play page's plates, laid out like its collage
 * view (the same justified columns, image + caption). Each has an anchor
 * (#extra-<id>) the home page's teaser cards link to; the section itself is
 * #extras, where the old /extras page redirects.
 */
export default function ExtrasSection() {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();

  const layout = useMemo(() => {
    const cols = columnCount(width);
    const colWidth = getColumnWidth(width, cols, GAP);
    const { fontSizePx, fontFamily } = getCaptionFont();
    return computeJustifiedLayout(
      EXTRAS_PHOTOS.map((p) => p.width / p.height),
      width,
      cols,
      GAP,
      EXTRAS_PHOTOS.map((p) => estimateCaptionHeight(p.caption, colWidth, fontSizePx, fontFamily)),
      0,
    );
  }, [width]);

  return (
    <section id="extras" className={styles.extrasSection} aria-labelledby="extras-heading">
      <h2 id="extras-heading" className={styles.extrasHeading}>
        {copy.extrasHeading}
      </h2>
      <div ref={wrapRef} className={styles.collage} style={{ height: layout.totalHeight }}>
        {width > 0 &&
          EXTRAS_PHOTOS.map((photo, i) => {
            const box = layout.boxes[i];
            return (
              <div
                key={photo.id}
                id={`extra-${photo.id}`}
                className={`${styles.collageItem} ${styles.extrasItem}`}
                style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
              >
                <div className={styles.collageImageBox} style={{ height: box.imageHeight }}>
                  {photo.isVideo ? (
                    <video
                      className={`${styles.collageImage} ${styles.extrasVideo}`}
                      src={photo.src}
                      muted
                      loop
                      playsInline
                      autoPlay
                      preload="metadata"
                      aria-hidden="true"
                    />
                  ) : (
                    <Image
                      src={photo.src}
                      alt=""
                      fill
                      sizes={`${Math.round(box.width)}px`}
                      className={`${styles.collageImage} ${styles.extrasImage}`}
                      draggable={false}
                    />
                  )}
                </div>
                <div className={styles.collageCaptionBand}>
                  <p className={styles.collageCaption}>{photo.caption}</p>
                </div>
              </div>
            );
          })}
      </div>
    </section>
  );
}

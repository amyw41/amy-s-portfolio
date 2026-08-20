"use client";

import { forwardRef } from "react";
import styles from "./JarItem.module.css";
import type { JarItemDef } from "./items.manifest";

interface JarItemProps {
  item: JarItemDef;
  /** The div's size — the item's alpha bbox at display scale. This is
   * the visible/collision footprint; the body is centred on it. */
  width: number;
  height: number;
  /** The full (padded) source image's size at the same display scale. */
  imgWidth: number;
  imgHeight: number;
  /** Positions the full image inside the div so the alpha bbox — not the
   * file's own centre — lines up with the div's bounds. */
  imgLeft: number;
  imgTop: number;
}

const JarItem = forwardRef<HTMLDivElement, JarItemProps>(function JarItem(
  { item, width, height, imgWidth, imgHeight, imgLeft, imgTop },
  ref,
) {
  return (
    <div
      ref={ref}
      className={styles.item}
      style={{
        width,
        height,
        // Proportional to the div's own rendered size (~6% of the shorter
        // edge) instead of a flat pixel value — a flat 12px didn't scale
        // with BASE_SIZE*scale the way every other size in this feature
        // does, so on a narrower viewport (smaller div, same 12px) the
        // project cards read as noticeably more rounded than intended.
        borderRadius: item.shape === "box" ? Math.min(width, height) * 0.06 : 0,
      }}
    >
      <img
        src={item.src}
        alt=""
        className={styles.image}
        draggable={false}
        style={{ width: imgWidth, height: imgHeight, left: imgLeft, top: imgTop }}
      />
    </div>
  );
});

export default JarItem;

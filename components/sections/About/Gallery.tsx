"use client";

import Image from "next/image";
import { WHATS_INSIDE_ITEMS, type WhatsInsideItem } from "@/lib/whatsInsideItems";
import styles from "./About.module.css";

// No own motion here — WhatsInside.tsx's own AnimatePresence already fades
// the whole view in/out on toggle. This card used to have its own
// initial/whileInView slide-up-into-place animation, but since that's
// scroll-triggered (not toggle-triggered) it replayed in full on every
// fresh mount, on top of the parent's fade — reading as "gallery moves up"
// while Carousel (no per-item animation of its own) had nothing, so
// switching between the two views looked inconsistent. Plain markup here
// keeps every toggle transition to the one, single fade.
function GalleryCard({ item }: { item: WhatsInsideItem }) {
  return (
    <div className={styles.galleryCard}>
      <div className={styles.galleryImageWrap}>
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="(min-width: 1024px) 205px, (min-width: 640px) 179px, 154px"
          draggable={false}
          unoptimized={process.env.NODE_ENV !== "production"}
          className={styles.galleryImage}
          // Was lazy (the next/image default) — same late pop-in-on-scroll
          // issue as the project cards had. Small, fixed-size grid, so
          // eager-loading all of it costs little.
          loading="eager"
        />
      </div>
      <p className={styles.galleryCaption}>{item.name}</p>
    </div>
  );
}

/**
 * Ported from jar-portfolio's components/WhatsInside/Gallery.tsx — a plain
 * responsive grid of the jar's own physical "favourite" items (1 col
 * mobile, up to 3 col desktop), each with its image and name. No
 * StarBadge easter egg (dropped, see Carousel.tsx's own comment).
 */
export default function Gallery() {
  return (
    <div className={styles.galleryGrid}>
      {WHATS_INSIDE_ITEMS.map((item) => (
        <GalleryCard key={item.id} item={item} />
      ))}
    </div>
  );
}

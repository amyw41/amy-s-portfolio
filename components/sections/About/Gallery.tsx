"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { WHATS_INSIDE_ITEMS, type WhatsInsideItem } from "@/lib/whatsInsideItems";
import StarBadge from "./StarBadge";
import styles from "./About.module.css";

function GalleryCard({
  item,
  column,
  lit,
  onToggleLit,
}: {
  item: WhatsInsideItem;
  column: number;
  lit: boolean;
  onToggleLit: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      tabIndex={0}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: column * 0.08 }}
      className={styles.galleryCard}
    >
      <motion.div
        animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.6 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className={styles.galleryStarSlot}
      >
        <StarBadge size={42} iconSize={21} lit={lit} onToggle={onToggleLit} />
      </motion.div>

      <motion.div
        animate={{ opacity: hovered ? 1 : 0.5, scale: hovered ? 1.15 : 1.12 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className={styles.galleryImageWrap}
      >
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="(min-width: 1024px) 205px, (min-width: 640px) 179px, 154px"
          draggable={false}
          unoptimized={process.env.NODE_ENV !== "production"}
          className={styles.galleryImage}
        />
      </motion.div>

      <motion.div
        initial={false}
        animate={{ opacity: hovered ? 1 : 0.5, y: hovered ? 0 : 8 }}
        transition={{ duration: 0.2 }}
        className={styles.galleryCaption}
      >
        <p>{item.description}</p>
      </motion.div>
    </motion.div>
  );
}

/**
 * Ported from amy-wangs-jar's components/WhatsInside/Gallery.tsx — the
 * jar's own physical "favourite" items, in a plain responsive grid (1 col
 * mobile, 2 col sm, 3 col lg). Same star-badge easter egg as Carousel, kept
 * in sync via the shared `litItems` lifted up in WhatsInside.tsx.
 */
export default function Gallery({
  litItems,
  onToggleLit,
}: {
  litItems: Set<string>;
  onToggleLit: (id: string) => void;
}) {
  return (
    <div className={styles.galleryGrid}>
      {WHATS_INSIDE_ITEMS.map((item, i) => (
        <GalleryCard key={item.id} item={item} column={i % 3} lit={litItems.has(item.id)} onToggleLit={() => onToggleLit(item.id)} />
      ))}
    </div>
  );
}

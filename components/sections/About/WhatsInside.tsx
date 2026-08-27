"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import CircleToggle from "@/components/ui/CircleToggle";
import Carousel from "./Carousel";
import Gallery from "./Gallery";
import { content } from "@/lib/content";
import styles from "./About.module.css";

const copy = content.en.about.whatsInside;

type ViewMode = "carousel" | "gallery";

/**
 * Third section on the About page, below Experience — a carousel/gallery of
 * the jar's own physical items (see Carousel.tsx/Gallery.tsx, ported from
 * amy-wangs-jar's own WhatsInside components). Toggle wiring is Playground's
 * own single-select CircleToggle pattern (two toggles, red for one mode,
 * blue for the other, exactly one active at a time), placed centered below
 * the heading rather than beside it, per request. Gallery is the default
 * view.
 *
 * `litItems` (which items' star badges are toggled "lit"/yellow) lives here,
 * above both views, so starring an item in one view still shows it starred
 * after switching to the other — same lift-state-up amy-wangs-jar's own
 * index.tsx already did.
 */
export default function WhatsInside() {
  const [viewMode, setViewMode] = useState<ViewMode>("gallery");
  const isGalleryMode = viewMode === "gallery";

  const [litItems, setLitItems] = useState<Set<string>>(new Set());
  const toggleLit = (id: string) =>
    setLitItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section className={styles.whatsInsideSection}>
      <div className="pageContainer">
        <motion.div
          className={styles.whatsInsideHeader}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <h2 className={styles.whatsInsideHeading}>{copy.heading}</h2>
          <div className={styles.whatsInsideToggles}>
            <CircleToggle
              label={copy.toggles.carousel}
              color="var(--c-red)"
              active={!isGalleryMode}
              onToggle={() => setViewMode("carousel")}
            />
            <CircleToggle
              label={copy.toggles.gallery}
              color="var(--c-blue)"
              active={isGalleryMode}
              onToggle={() => setViewMode("gallery")}
            />
          </div>
        </motion.div>

        {isGalleryMode ? (
          <Gallery litItems={litItems} onToggleLit={toggleLit} />
        ) : (
          <Carousel litItems={litItems} onToggleLit={toggleLit} />
        )}
      </div>
    </section>
  );
}

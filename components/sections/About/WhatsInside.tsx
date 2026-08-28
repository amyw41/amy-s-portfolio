"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CircleToggle from "@/components/ui/CircleToggle";
import Carousel from "./Carousel";
import Gallery from "./Gallery";
import { content } from "@/lib/content";
import styles from "./About.module.css";

const copy = content.en.about.whatsInside;

type ViewMode = "carousel" | "gallery";

/**
 * Third section on the About page, below Experience — a carousel/gallery
 * of the jar's own physical items (see Carousel.tsx/Gallery.tsx, ported
 * from jar-portfolio's own WhatsInside components). Toggle wiring copied
 * directly from Playground's own single-select CircleToggle pattern
 * (components/sections/Playground/index.tsx: local `viewMode` state, two
 * CircleToggles, red for one mode, blue for the other, exactly one active
 * at a time) rather than reinvented. Carousel is the default/main view
 * (per request), gallery is the secondary one.
 */
export default function WhatsInside() {
  const [viewMode, setViewMode] = useState<ViewMode>("carousel");
  const isGalleryMode = viewMode === "gallery";

  return (
    <section className={styles.whatsInsideSection}>
      <div className="pageContainer">
        <div className={styles.whatsInsideInner}>
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

          {/* Crossfade between views on toggle (was: an abrupt unmount/mount
           * swap — Gallery's own per-card whileInView slide-up replayed on
           * every mount, reading as "gallery moves up", while Carousel had
           * no entrance animation of its own at all, reading as "no
           * animation". AnimatePresence + a single keyed opacity fade here
           * makes both directions the same simple fade in/out, regardless
           * of what either view does internally.) */}
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {isGalleryMode ? <Gallery /> : <Carousel />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

"use client";

import StarLogo from "@/components/ui/StarLogo/StarLogo";
import { gaegu, geist } from "@/lib/fonts";
import { ROADMAP_STYLE } from "@/lib/roadmap";
import MapStage from "./MapStage";
import Postcard from "./Postcard";
import styles from "./Roadmap.module.css";

/**
 * The About page, "Amy's roadmap" (docs/rebrand/design-system.md "About
 * page"): one scene in the middle of the window, Amy's photo as a taped-on
 * stamp beside the map. Like a canvas: no footer. ROADMAP_STYLE picks plain
 * (like home: Geist, a sparse sketch, the star top left) or illustrated
 * (torn paper, handwriting, doodles, the star on the map).
 */
export default function Roadmap() {
  return (
    <div className={`${geist.variable} ${gaegu.variable} ${styles.page}`} data-style={ROADMAP_STYLE}>
      <div className={styles.frame}>
        {/* Plain: the star top left, where it sits on the home page. */}
        {ROADMAP_STYLE === "plain" && <StarLogo size={36} className={styles.cornerStar} label="Back to the home page" />}
        <main className={styles.scene}>
          <div className={styles.stampSpot}>
            <Postcard />
          </div>
          <MapStage />
        </main>
      </div>
    </div>
  );
}

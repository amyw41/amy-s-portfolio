"use client";

import Link from "next/link";
import { gaegu, geist } from "@/lib/fonts";
import MapStage from "./MapStage";
import Postcard from "./Postcard";
import styles from "./Roadmap.module.css";

/**
 * The About page, "Amy's roadmap" (docs/rebrand/design-system.md "About
 * page"), after Amy's sketch: one scene in the middle of the window, her
 * photo taped on like a print, overlapping the map's paper, with "★ home"
 * above it. Like a canvas: no footer.
 */
export default function Roadmap() {
  return (
    <div className={`${geist.variable} ${gaegu.variable} ${styles.page}`}>
      <div className={styles.frame}>
        <main className={styles.scene}>
          <div className={styles.stampSpot}>
            {/* The way home: Amy's star and "home", just above the photo. */}
            <Link href="/" className={styles.home} aria-label="Back to the home page">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logos/black-star.png" alt="" draggable={false} />
              <span>home</span>
            </Link>
            <Postcard />
          </div>
          <MapStage />
        </main>
      </div>
    </div>
  );
}

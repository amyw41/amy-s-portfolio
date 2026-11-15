"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./BackToTop.module.css";
import ScrollHint from "@/components/sections/Home/ScrollHint";
import { content } from "@/lib/content";
import { gaegu } from "@/lib/fonts";

const copy = content.en.footer;
/** Scrolled at least this far (px) counts as "not at the top". */
const AWAY_PX = 8;

/**
 * The case studies' "back to top": the footer's curly-arrow doodle, floating
 * in the window's bottom right corner from the moment the page leaves the
 * top (it pen-draws on as it appears, and fades out back at the top).
 * Drawn white with a difference blend, so it reads black on the white page
 * and white over the dark cover and the black footer. Clicking scrolls
 * smoothly to the top (instantly with reduced motion). When the footer
 * scrolls up to it, it docks in the footer's top right corner (the spot
 * FooterStrip marks with data-back-to-top-dock) and scrolls away with it.
 */
export default function BackToTop() {
  const [away, setAway] = useState(false);
  const placeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const place = placeRef.current;
    let frame = 0;
    const update = () => {
      frame = 0;
      setAway(window.scrollY > AWAY_PX);
      if (!place) return;
      // Docked: once the footer's spot has come up to where this floats,
      // it rides up with the footer instead of floating over it.
      const dock = document.querySelector<HTMLElement>("[data-back-to-top-dock]");
      place.style.transform = "";
      if (!dock) return;
      const natural = place.getBoundingClientRect().top;
      const lift = Math.min(0, dock.getBoundingClientRect().top - natural);
      place.style.transform = lift ? `translateY(${lift}px)` : "";
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <div ref={placeRef} className={`${gaegu.variable} ${styles.place}`}>
      <ScrollHint
        shown={away}
        up
        short
        onActivate={() => {
          const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
        }}
        label={copy.backToTop}
        ariaLabel={copy.backToTopLabel}
        className={styles.hint}
      />
    </div>
  );
}

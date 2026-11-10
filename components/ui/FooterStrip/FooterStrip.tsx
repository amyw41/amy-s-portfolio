"use client";

import type { Ref, WheelEvent } from "react";
import styles from "./FooterStrip.module.css";
import FooterLink from "./FooterLink";
import FooterCarousel from "./FooterCarousel";
import ScrollHint from "@/components/sections/Home/ScrollHint";
import FooterCredit from "./FooterCredit";
import { content } from "@/lib/content";
import { gaegu } from "@/lib/fonts";

const copy = content.en.footer;
const LINKS = [copy.links.linkedin, copy.links.twitter, copy.links.email];

/** The class for the page content above the footer (white, in front of it),
 * so scrolling to the end reveals the footer from behind it. The page sets
 * --footer-reach to its side padding. */
export const footerCover = styles.cover;

/**
 * The rebrand's footer: a black panel, half the window tall, revealed from
 * behind the page as it scrolls up off it. The links stacked top left, the
 * credit bottom left, "back to top" (the curly-arrow doodle) top right, and
 * a carousel of the jar's items in the middle. Ends the home page's work
 * view and every case study. `className` places it (margins, reach);
 * `onBackToTop` is what "back to top" does (default: scroll the window to
 * the top; home goes back to the jar).
 */
export default function FooterStrip({
  className = "",
  onBackToTop,
  onWheel,
  ref,
}: {
  /** The footer element (home measures it for the lift). */
  ref?: Ref<HTMLElement>;
  className?: string;
  onBackToTop?: () => void;
  /** A wheel over the footer (home passes the scroll on to the work). */
  onWheel?: (e: WheelEvent<HTMLElement>) => void;
}) {
  const backToTop =
    onBackToTop ??
    (() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    });
  return (
    <footer ref={ref} className={`${gaegu.variable} ${styles.strip} ${className}`} onWheel={onWheel}>
      <nav className={styles.links} aria-label={content.en.sidebar.social.label}>
        {LINKS.map((link, i) => (
          <FooterLink key={link.href} href={link.href} label={link.label} seed={40 + i} />
        ))}
      </nav>
      <div className={styles.backToTop}>
        <ScrollHint
          shown
          up
          short
          onActivate={backToTop}
          label={copy.backToTop}
          ariaLabel={copy.backToTopLabel}
          className={styles.backToTopHint}
        />
      </div>
      <FooterCarousel />
      <FooterCredit />
    </footer>
  );
}

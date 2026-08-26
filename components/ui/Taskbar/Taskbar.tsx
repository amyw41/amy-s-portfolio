"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import styles from "./Taskbar.module.css";
import { content } from "@/lib/content";
import { buildWobblyOvalPath, STROKE_COLOR, STROKE_WIDTH, VIEW_BOX } from "../../sections/Hero/wobblyOval";

const copy = content.en.taskbar;

// Same hand-sketched hover oval as the hero's nav buttons (see
// components/sections/Hero/index.tsx and wobblyOval.ts for the full
// explanation of the shape/overlap) — imported from there rather than
// duplicated, reused with its own seeds (10/11/12) so the taskbar's ovals
// are their own distinct variants, not copies of the hero's.
function ScribbleOval({ seed }: { seed: number }) {
  const path = useMemo(() => buildWobblyOvalPath(seed), [seed]);
  return (
    <svg className={styles.scribble} viewBox={VIEW_BOX} fill="none" preserveAspectRatio="none" aria-hidden="true">
      <path d={path} stroke={STROKE_COLOR} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
    </svg>
  );
}

// Rendered once, from the root layout, gated on "not home" rather than an
// allowlist — any future route gets this automatically with no per-page
// wiring. `usePathname` requires a Client Component (see next/navigation
// docs), which is why this lives in its own file instead of the (Server
// Component) root layout directly — the root layout still needs to stay a
// Server Component so it can keep exporting `metadata`.
//
// Sits in normal document flow at the very top of the page on desktop (see
// Taskbar.module.css's own comment) — no scroll-tied fade in/out there
// (an earlier version faded out on scroll and back in only once scrolled
// back to the true top, via a fixed-position pill + IntersectionObserver
// sentinel). Removed per request: on every route this renders on, it's
// already right at the top of the page, so hiding/showing it based on
// scroll position had no real page it was clearing space for on desktop —
// it just floated over whatever content happened to be underneath it, and
// on the case-study route in particular that meant covering the sidebar's
// own Back button. On mobile, though, per a later request, it goes back to
// something closer to jar-portfolio's original Taskbar.js pattern: sticky
// to the top, sliding out of view on scroll-down and back in on scroll-up
// (see the CSS's mobile-only media query for why this doesn't affect
// desktop). The scroll listener below is rAF-throttled and ignores tiny
// deltas (MIN_DELTA) the same way the original did, so trackpad jitter
// can't flicker the direction back and forth; it's cheap enough to just
// always run rather than gating it behind a matchMedia check, since the
// resulting `hidden` class is a no-op outside the mobile breakpoint.
export default function Taskbar() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const MIN_DELTA = 4;
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const delta = y - lastY;

      // Pinned visible near the very top so it never hides before the user
      // has actually scrolled meaningfully.
      if (y <= 24) {
        setHidden(false);
      } else if (delta > MIN_DELTA) {
        setHidden(true);
      } else if (delta < -MIN_DELTA) {
        setHidden(false);
      }
      lastY = y;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname === "/") return null;

  return (
    <motion.div
      className={`${styles.pill} ${hidden ? styles.pillHidden : ""}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <Link href="/" className={styles.logoLink} aria-label="Home">
        <Image
          src="/images/logos/black-star.png"
          alt=""
          aria-hidden="true"
          width={32}
          height={34}
          className={styles.logo}
          draggable={false}
        />
      </Link>
      <nav className={styles.nav}>
        <Link href="/#projects" className={styles.navLink}>
          <ScribbleOval seed={10} />
          {copy.work}
        </Link>
        <Link href="/about" className={styles.navLink}>
          <ScribbleOval seed={11} />
          {copy.about}
        </Link>
        <Link href="/playground" className={styles.navLink}>
          <ScribbleOval seed={12} />
          {copy.playground}
        </Link>
      </nav>
    </motion.div>
  );
}

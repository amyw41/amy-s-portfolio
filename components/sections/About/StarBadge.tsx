"use client";

import { motion, useAnimation } from "framer-motion";
import { Star } from "lucide-react";
import styles from "./About.module.css";

const WHITE = "#FFFFFF";
const YELLOW = "#f5df69";

/**
 * Ported from amy-wangs-jar's components/WhatsInside/StarBadge.tsx — a fun
 * easter egg, not functional UI. Hover expands the whole badge; click spins
 * the star icon in place and toggles it between white and yellow, staying
 * yellow until clicked again. The source's own circle background was
 * #2460A4 (jar-portfolio's accent blue) — per request, every leftover blue
 * from that old project is now a light gray instead (see .starBadgeCircle
 * in About.module.css), so this badge no longer reads as "borrowed from a
 * different project's colour scheme."
 *
 * `lit`/`onToggle` are owned by the parent (Carousel/Gallery via
 * WhatsInside.tsx), not this component's own state — Carousel only ever
 * renders a StarBadge for whichever item is currently centered, unmounting/
 * remounting a fresh instance as the centered item changes, so state stored
 * locally here would always reset to white when you cycled away from an
 * item and back. Lifting it up to a per-item-id record in the parent makes
 * it survive that.
 */
export default function StarBadge({
  lit,
  onToggle,
  size = 30,
  iconSize = 15,
}: {
  lit: boolean;
  onToggle: () => void;
  size?: number;
  iconSize?: number;
}) {
  const starControls = useAnimation();
  // Separate from starControls (which only ever animates the icon inside) —
  // this owns the button's own scale so "big while spinning" is guaranteed
  // regardless of hover state (e.g. on touch, where there's no hover at all
  // to fall back on) instead of depending on whileHover still being active
  // when the tap/click gesture ends.
  const buttonControls = useAnimation();
  const bounce = () => {
    onToggle();
    // Grows quickly, holds at the big size for most of the spin, then eases
    // back down right at the end — same 0.7s duration as the icon's own
    // spin below, so the two stay in sync.
    buttonControls.start({
      scale: [1, 1.15, 1.15, 1],
      transition: { duration: 0.7, times: [0, 0.15, 0.85, 1], ease: "easeInOut" },
    });
    starControls.start({
      // rotateY (spinning around a vertical axis), not a flat rotate — see
      // the source's own comment: this narrows the icon toward its center
      // as it turns edge-on before widening back out, reading more like a
      // skater's spin than a pinwheel.
      rotateY: [0, 720],
      transition: { duration: 0.7, ease: "easeInOut" },
    });
  };

  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        bounce();
      }}
      animate={buttonControls}
      whileHover={{ scale: 1.15 }}
      aria-label="It's a star! (does nothing, just for fun)"
      className={styles.starBadgeCircle}
      style={{ height: size, width: size }}
    >
      <motion.span
        animate={starControls}
        style={{
          transformPerspective: 200,
          color: lit ? YELLOW : WHITE,
          transition: "color 0.7s ease-in-out",
        }}
        className={styles.starBadgeIconWrap}
      >
        {/* fill/color both set to currentColor so the CSS `color` transition
            above (not framer motion) drives the white-to-yellow swap — keeps
            the color change independent of the rotateY spin above it. */}
        <Star size={iconSize} fill="currentColor" color="currentColor" />
      </motion.span>
    </motion.button>
  );
}

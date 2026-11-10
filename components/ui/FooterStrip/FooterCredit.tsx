"use client";

import { useRef, type CSSProperties, type PointerEvent } from "react";
import { useReducedMotion } from "framer-motion";
import styles from "./FooterStrip.module.css";
import { content } from "@/lib/content";
import { FOOTER_CREDIT_SHIFT_MS } from "@/lib/motion";

/**
 * "Designed + built by Amy (2026)", already filled with the foil gradient
 * (raspberry and light yellow, components/ui/Foil's colours). Hovering
 * shifts the gradient along with the mouse, so the colours slide through
 * the letters; on leave it eases back. Reduced motion: it stays put.
 */
export default function FooterCredit() {
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLSpanElement>(null);
  const shift = (e: PointerEvent<HTMLSpanElement> | null) => {
    const el = ref.current;
    if (!el || reduced) return;
    if (!e) {
      el.style.removeProperty("--credit-shift");
      return;
    }
    const box = el.getBoundingClientRect();
    const t = box.width ? (e.clientX - box.left) / box.width : 0.5;
    el.style.setProperty("--credit-shift", `${(t * 100).toFixed(1)}%`);
  };
  return (
    <span
      ref={ref}
      className={styles.credit}
      style={{ "--credit-shift-ms": `${FOOTER_CREDIT_SHIFT_MS}ms` } as CSSProperties}
      onPointerMove={shift}
      onPointerLeave={() => shift(null)}
    >
      {content.en.footer.credit}
    </span>
  );
}

"use client";

import styles from "./FooterStrip.module.css";
import { FoilGlow, useFoil } from "@/components/ui/Foil";

/** One of the footer strip's links, with the foil hover (components/ui/Foil):
 * dark on light gray, the gradient revealed on the letters under the mouse. */
export default function FooterLink({ href, label, seed }: { href: string; label: string; seed: number }) {
  const foil = useFoil(seed);
  return (
    <a
      className={styles.link}
      href={href}
      {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
      {...foil.handlers}
    >
      {label}
      <FoilGlow foil={foil} on="light" />
    </a>
  );
}

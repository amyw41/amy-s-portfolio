"use client";

import styles from "./FooterStrip.module.css";
import { FoilText, foilHostText, useFoil } from "@/components/ui/Foil";

/** One of the footer strip's links, with the foil hover (components/ui/Foil):
 * the gradient revealed on the letters under the mouse. */
export default function FooterLink({ href, label, seed }: { href: string; label: string; seed: number }) {
  const foil = useFoil(seed);
  return (
    <a
      className={`${styles.link} ${foilHostText}`}
      href={href}
      {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
      {...foil.handlers}
    >
      <FoilText foil={foil}>{label}</FoilText>
    </a>
  );
}

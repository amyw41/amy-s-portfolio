"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./Footer.module.css";
import FooterItem from "./FooterItem";
import { FOOTER_ITEMS } from "./items";
import { content } from "@/lib/content";

const copy = content.en.footer;

export default function Footer() {
  // Stacking order for the image pile, back to front. Clicking/grabbing an
  // item moves its id to the end (front) permanently, until another item
  // is clicked — z-index below is derived straight from position in this
  // array, so "front of stack" and "highest z-index" are the same thing.
  const [order, setOrder] = useState<string[]>(() => FOOTER_ITEMS.map((item) => item.id));

  function bringToFront(id: string) {
    setOrder((prev) => (prev[prev.length - 1] === id ? prev : [...prev.filter((x) => x !== id), id]));
  }

  return (
    <footer className={styles.footer}>
      <div className={`pageContainer ${styles.container}`}>
        <div className={styles.panel}>
          {/* z-index fixed well above the highest possible item z-index
           * (see .item below) so no dragged image can ever cover the text. */}
          <div className={styles.textBlock}>
            <div className={styles.links}>
              <a className={styles.link} href={copy.links.linkedin.href} target="_blank" rel="noopener noreferrer">
                {copy.links.linkedin.label}
              </a>
              <span className={styles.dot} aria-hidden="true">·</span>
              <a className={styles.link} href={copy.links.email.href} target="_blank" rel="noopener noreferrer">
                {copy.links.email.label}
              </a>
              <span className={styles.dot} aria-hidden="true">·</span>
              <a className={styles.link} href={copy.links.twitter.href} target="_blank" rel="noopener noreferrer">
                {copy.links.twitter.label}
              </a>
            </div>
            <div className={styles.heading}>
              <span>{copy.heading}</span>
              <Image
                src="/images/logos/white-star.png"
                alt=""
                aria-hidden="true"
                width={200}
                height={212}
                className={styles.star}
                draggable={false}
              />
            </div>
          </div>

          {/* Own positioned box (item left/top % — items.ts — resolve against
           * THIS, not .panel directly) so the responsive reflow below 900px
           * (Footer.module.css) can give the pile its own space below the
           * text block instead of the two sharing one absolutely-positioned
           * stack. Exactly overlays .panel above 900px (inset:0), so item
           * placement is pixel-identical to before this element existed. */}
          <div className={styles.itemPile}>
            {FOOTER_ITEMS.map((item) => (
              <FooterItem
                key={item.id}
                item={item}
                zIndex={order.indexOf(item.id) + 1}
                onActivate={() => bringToFront(item.id)}
              />
            ))}
          </div>
        </div>

        <p className={styles.credit}>{copy.credit}</p>
      </div>
    </footer>
  );
}

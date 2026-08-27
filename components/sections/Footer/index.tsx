"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import styles from "./Footer.module.css";
import FooterItem from "./FooterItem";
import { FOOTER_ITEMS } from "./items";
import { content } from "@/lib/content";

const copy = content.en.footer;

// Matches exactly a playground category detail route (e.g. /playground/
// drawing) — NOT the /playground overview grid itself, which scrolls at its
// own pace like every other page and wants the footer's normal padding.
const FLUSH_ROUTE = /^\/playground\/[^/]+$/;

interface FooterProps {
  /** Drops the footer's normal padding-top rhythm — for a page whose own
   * layout (the Playground category detail page) is deliberately designed
   * to land flush against this footer with zero gap. See Footer.module.css's
   * own .flush comment. Defaults to auto-detecting that one route (Footer is
   * rendered once, globally, from the root layout — a Server Component that
   * can't call usePathname itself, see Taskbar.tsx's own comment on the same
   * constraint — so this is the one place that CAN actually gate it per
   * route); pass explicitly only to override that default. */
  flush?: boolean;
}

export default function Footer({ flush: flushProp }: FooterProps = {}) {
  const pathname = usePathname();
  const flush = flushProp ?? FLUSH_ROUTE.test(pathname);
  // Stacking order for the image pile, back to front. Clicking/grabbing an
  // item moves its id to the end (front) permanently, until another item
  // is clicked — z-index below is derived straight from position in this
  // array, so "front of stack" and "highest z-index" are the same thing.
  const [order, setOrder] = useState<string[]>(() => FOOTER_ITEMS.map((item) => item.id));

  function bringToFront(id: string) {
    setOrder((prev) => (prev[prev.length - 1] === id ? prev : [...prev.filter((x) => x !== id), id]));
  }

  return (
    <footer className={`${styles.footer} ${flush ? styles.flush : ""}`}>
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

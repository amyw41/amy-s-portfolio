"use client";

import { useEffect, useId, useRef, type FocusEvent, type PointerEvent } from "react";
import Link from "next/link";
import styles from "./Sidebar.module.css";

export interface NavItem {
  label: string;
  href: string;
  /** Opens in a new tab (LinkedIn, X). mailto: links leave this off. */
  external?: boolean;
}

interface NavSectionProps {
  label: string;
  items: NavItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Also opens on mouse hover and keyboard focus, not just click. Only
   * Work uses this: three stacked hover menus fight each other as the
   * pointer moves down the sidebar (rebrand-brief.md 2.3). */
  openOnHover?: boolean;
}

/** Hover intent: a quick brush past the label shouldn't open it, and moving
 * the pointer down into the list (or briefly off it) shouldn't close it. */
const HOVER_OPEN_MS = 60;
const HOVER_CLOSE_MS = 150;

/**
 * One accordion menu in the home sidebar (Work / Other / Contact). Open
 * state lives in the parent so only one section is open at a time. No open/
 * close animation yet: the list just shows/hides (Phase 2 adds the motion).
 */
export default function NavSection({ label, items, open, onOpenChange, openOnHover = false }: NavSectionProps) {
  const listId = useId();
  const timerRef = useRef<number | null>(null);
  // True while a mouse is over the section, so a click that lands right
  // after hover already opened it doesn't immediately toggle it shut again.
  const hoveringRef = useRef(false);

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function schedule(next: boolean, ms: number) {
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      onOpenChange(next);
    }, ms);
  }

  useEffect(() => clearTimer, []);

  const hoverHandlers = openOnHover
    ? {
        onPointerEnter: (e: PointerEvent) => {
          if (e.pointerType !== "mouse") return;
          hoveringRef.current = true;
          if (open) clearTimer();
          else schedule(true, HOVER_OPEN_MS);
        },
        onPointerLeave: (e: PointerEvent) => {
          if (e.pointerType !== "mouse") return;
          hoveringRef.current = false;
          schedule(false, HOVER_CLOSE_MS);
        },
        onFocus: () => {
          clearTimer();
          if (!open) onOpenChange(true);
        },
        // Close once keyboard focus has left the whole section (not when it
        // just moves from the label to one of its own items).
        onBlur: (e: FocusEvent<HTMLDivElement>) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null) && !hoveringRef.current) {
            onOpenChange(false);
          }
        },
      }
    : {};

  function handleClick() {
    clearTimer();
    if (openOnHover && hoveringRef.current && open) return;
    onOpenChange(!open);
  }

  return (
    <div className={styles.section} {...hoverHandlers}>
      <button
        type="button"
        className={styles.sectionLabel}
        aria-expanded={open}
        aria-controls={listId}
        onClick={handleClick}
      >
        {label}
        <svg
          className={`${styles.icon} ${open ? styles.iconOpen : ""}`}
          viewBox="0 0 12 12"
          aria-hidden="true"
        >
          <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        </svg>
      </button>
      <ul id={listId} className={styles.subList} hidden={!open}>
        {items.map((item) => (
          <li key={item.href}>
            {item.external || item.href.startsWith("mailto:") ? (
              <a
                className={styles.subItem}
                href={item.href}
                {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {item.label}
              </a>
            ) : (
              <Link className={styles.subItem} href={item.href}>
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

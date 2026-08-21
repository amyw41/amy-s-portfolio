"use client";

import { useEffect, useId, useRef } from "react";
import styles from "./ExtrasModal.module.css";
import { content } from "@/lib/content";

const copy = content.en.projects.extras;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

interface ExtrasModalProps {
  onClose: () => void;
}

/**
 * Bottom sheet, not a centred dialog — "top corners rounded, bottom corners
 * square" only makes sense as a shape if it's flush against the viewport's
 * own bottom edge (see .sheet in the CSS module), so that's how this is
 * built: fixed to the bottom, narrower than the viewport with symmetric
 * side margins, sliding no further than that.
 *
 * Close on Escape, on a backdrop click, and via the close button; traps
 * Tab/Shift+Tab inside while open; locks body scroll for the same
 * duration. All three (backdrop, Escape, focus trap) are wired here rather
 * than left to individual buttons, since a modal that isn't fully
 * keyboard-trapped is effectively a background page a screen-reader user
 * can still wander into.
 */
export default function ExtrasModal({ onClose }: ExtrasModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // lock body scroll
    closeButtonRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const sheet = sheetRef.current;
      if (!sheet) return;
      const focusable = Array.from(sheet.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={sheetRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        // Stop a click inside the sheet from bubbling to the backdrop's
        // own onClose handler above.
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.sheetInner}>
          <div className={styles.header}>
            <h3 id={titleId} className={styles.title}>
              {copy.modalTitle}
            </h3>
            <button ref={closeButtonRef} type="button" className={styles.closeButton} onClick={onClose}>
              <span aria-hidden="true">×</span>
              <span className={styles.srOnly}>{copy.closeLabel}</span>
            </button>
          </div>

          {/* TODO: populate from each project's own `gallery` field once
           * case-study pages / gallery assets exist (see lib/projects.ts). */}
          <div className={styles.gallery}>
            <p className={styles.galleryPlaceholder}>{copy.galleryPlaceholder}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

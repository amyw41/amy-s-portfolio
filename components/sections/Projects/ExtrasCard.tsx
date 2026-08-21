"use client";

import { forwardRef, useState } from "react";
import cardStyles from "./ProjectCard.module.css";
import styles from "./ExtrasCard.module.css";
import ExtrasModal from "./ExtrasModal";
import { content } from "@/lib/content";

const copy = content.en.projects.extras;

interface ExtrasCardProps {
  /** Same meaning as ProjectCard's own `dimmed` — extras has no category,
   * so it never "matches" once any filter is on (see Projects/index.tsx),
   * meaning it's always among the dimmed/demoted cards whenever a filter
   * is active. */
  dimmed: boolean;
  /** Same meaning as ProjectCard's own — see its own doc comment. */
  revealed: boolean;
  revealDelayMs: number;
}

/**
 * Same card shape as ProjectCard (reuses its module's .card/.reveal/.media/
 * .text/.dimOverlay classes directly) but: no category dot, a placeholder
 * media block instead of a real cover (there's no case-study asset for this
 * one), and the whole thing is a button that opens ExtrasModal instead of
 * being a static display card.
 */
const ExtrasCard = forwardRef<HTMLButtonElement, ExtrasCardProps>(function ExtrasCard(
  { dimmed, revealed, revealDelayMs },
  ref,
) {
  const [open, setOpen] = useState(false);
  const dimClass = dimmed ? cardStyles.dimActive : "";
  const revealClass = revealed ? cardStyles.revealVisible : "";

  return (
    <>
      <button ref={ref} type="button" className={`${cardStyles.card} ${styles.trigger}`} onClick={() => setOpen(true)}>
        <div
          className={`${cardStyles.reveal} ${revealClass}`}
          style={{ transitionDelay: `${revealDelayMs}ms` }}
        >
          <div className={cardStyles.media}>
            <div className={styles.placeholder} aria-hidden="true">
              +
            </div>
            <div className={`${cardStyles.dimOverlay} ${dimClass}`} />
          </div>

          <div className={cardStyles.text}>
            <h3 className={cardStyles.title}>{copy.title}</h3>
            <p className={cardStyles.description}>{copy.description}</p>
            <div className={`${cardStyles.dimOverlay} ${dimClass}`} />
          </div>
        </div>
      </button>

      {open && <ExtrasModal onClose={() => setOpen(false)} />}
    </>
  );
});

export default ExtrasCard;

"use client";

import { forwardRef, type CSSProperties } from "react";
import Link from "next/link";
import cardStyles from "./ProjectCard.module.css";
import styles from "./ExtrasCard.module.css";
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
 * one). Was a button that opened a bottom-sheet modal (ExtrasModal) — per
 * request, "extras" is now its own case-study-style page
 * (ExtrasCaseStudy.tsx, same shell as Spotify/CyberSea/SkinSprout), so this
 * is now a plain Link like every other project card, not a button + local
 * open/close state.
 */
const ExtrasCard = forwardRef<HTMLAnchorElement, ExtrasCardProps>(function ExtrasCard(
  { dimmed, revealed, revealDelayMs },
  ref,
) {
  const dimClass = dimmed ? cardStyles.dimActive : "";
  const revealClass = revealed ? cardStyles.revealVisible : "";

  return (
    <Link ref={ref} href="/projects/extras" className={`${cardStyles.card} ${styles.trigger}`}>
      <div
        className={`${cardStyles.reveal} ${revealClass}`}
        style={{ transitionDelay: `${revealDelayMs}ms` } as CSSProperties}
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
    </Link>
  );
});

export default ExtrasCard;

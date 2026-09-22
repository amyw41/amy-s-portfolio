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
 * .text/.dimOverlay classes directly) but: no category dot. Was a button
 * that opened a bottom-sheet modal (ExtrasModal) — per request, "extras" is
 * now its own case-study-style page (ExtrasCaseStudy.tsx, same shell as
 * Spotify/CyberSea/SkinSprout), so this is now a plain Link like every
 * other project card, not a button + local open/close state.
 *
 * Media is a plain looping video (public/images/projects/extras/
 * thumbnail.mp4) — no poster fade-in like ProjectCard's AutoplayVideo since
 * there's no separate poster image for this one, just the same object-fit:
 * cover sizing (borrowed from cardStyles.poster) applied straight to the
 * <video> element.
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
          <video
            className={cardStyles.poster}
            src="/images/projects/extras/thumbnail.mp4"
            autoPlay
            muted
            loop
            playsInline
            // Explicit "auto" (the browser's own default is looser, "metadata"
            // in some browsers) so it starts buffering the actual video data
            // right away instead of waiting until it's scrolled near.
            preload="auto"
            aria-hidden="true"
          />
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

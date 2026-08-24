"use client";

import { forwardRef, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./ProjectCard.module.css";
import AutoplayVideo from "./AutoplayVideo";
import { PROJECT_CATEGORY_COLOR, type Project } from "@/lib/projects";

interface ProjectCardProps {
  project: Project;
  /** Driven entirely by the active filters upstream (Projects/index.tsx) —
   * never by anything local to this card. Dimming reuses the jar's own
   * white-overlay construction (a translucent white layer composited on
   * top at var(--dim-white), not a raw opacity drop on the card itself) so
   * the two dimmed states in this codebase stay visually identical. */
  dimmed: boolean;
  /** Scroll-reveal state from useScrollReveal (Projects/index.tsx) — see
   * .reveal/.revealVisible's own comment in ProjectCard.module.css for why
   * this lives on an inner wrapper rather than `ref`'s own element. */
  revealed: boolean;
  revealDelayMs: number;
}

const ProjectCard = forwardRef<HTMLAnchorElement, ProjectCardProps>(function ProjectCard(
  { project, dimmed, revealed, revealDelayMs },
  ref,
) {
  const dotColor = PROJECT_CATEGORY_COLOR[project.category];
  const dimClass = dimmed ? styles.dimActive : "";
  const revealClass = revealed ? styles.revealVisible : "";

  return (
    <Link ref={ref} href={`/projects/${project.slug}`} className={styles.card}>
      <div
        className={`${styles.reveal} ${revealClass}`}
        style={{ transitionDelay: `${revealDelayMs}ms` } as CSSProperties}
      >
        <div className={styles.media}>
          {project.video ? (
            <AutoplayVideo src={project.video} poster={project.cover} />
          ) : (
            <Image
              src={project.cover}
              alt=""
              fill
              sizes="(max-width: 900px) 100vw, 624px"
              className={styles.poster}
              draggable={false}
            />
          )}
          <div className={`${styles.dimOverlay} ${dimClass}`} />
        </div>

        <div className={styles.text}>
          <div className={styles.titleRow}>
            <span className={styles.dot} style={{ "--dot-color": dotColor } as CSSProperties} />
            <h3 className={styles.title}>{project.title}</h3>
          </div>
          <p className={styles.description}>{project.description}</p>
          <div className={`${styles.dimOverlay} ${dimClass}`} />
        </div>
      </div>
    </Link>
  );
});

export default ProjectCard;

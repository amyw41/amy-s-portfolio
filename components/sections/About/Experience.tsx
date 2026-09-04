"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { EXPERIENCE, type ExperienceEntry } from "@/lib/experience";
import styles from "./About.module.css";

const FADE_DURATION = 0.35;
const VIEWPORT_AMOUNT = 0.2;

/**
 * One row: logo + company name grouped as a single link, job title next to
 * it, date on the far right (stacked under company/title on narrow screens
 * instead — see .rowDateInline/.rowDate in About.module.css). Ported from
 * jar-portfolio's components/Experience.tsx's own ExperienceRow.
 *
 * The logo and company name (lib/experience.ts's own `url`, when present)
 * are ONE combined link/button, not two separate ones — hovering either
 * lightens both together toward white, same treatment as the site's other
 * big clickable tiles (ProjectCard's .card:hover, Playground's own
 * .plateLink:hover, ExtrasCard's .trigger:hover), per request. Job title
 * and date stay plain text outside it either way. Companies with no known
 * url (UW Cube) render the same logo+name pairing as plain, non-interactive
 * elements instead.
 */
function ExperienceRow({ entry }: { entry: ExperienceEntry }) {
  const logoAndName = (
    <>
      <div className={styles.logo}>
        <Image
          src={entry.logo}
          alt={`${entry.company} logo`}
          fill
          sizes="56px"
          unoptimized={process.env.NODE_ENV !== "production"}
          className={styles.logoImage}
        />
      </div>
      <span className={styles.companyName}>{entry.company}</span>
    </>
  );

  return (
    <div className={styles.row}>
      <div className={styles.rowMain}>
        {entry.url ? (
          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${entry.company} (opens in a new tab)`}
            className={`${styles.companyLinkGroup} ${styles.companyLink}`}
          >
            {logoAndName}
          </a>
        ) : (
          <div className={styles.companyLinkGroup}>{logoAndName}</div>
        )}
        <div className={styles.rowText}>
          <p className={styles.rowLine}>
            <span className={styles.jobTitle}>· {entry.title}</span>
          </p>
          <p className={styles.rowDateInline}>{entry.date}</p>
        </div>
      </div>
      <p className={styles.rowDate}>{entry.date}</p>
    </div>
  );
}

/**
 * Work/community history — ported from jar-portfolio's own
 * components/Experience.tsx. Its own scroll-reveal (not the bio's
 * fire-on-mount one — see Bio.tsx) since these are two visually separate
 * blocks stacked on the page, matching the source's own two-section split.
 */
export default function Experience() {
  return (
    <section className={styles.experienceSection}>
      <div className="pageContainer">
        <motion.div
          className={styles.experienceInner}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: FADE_DURATION, ease: "easeOut" }}
        >
          {EXPERIENCE.map((group) => (
            <div key={group.label} className={styles.group}>
              <h2 className={styles.heading}>{group.label}</h2>
              <div className={styles.rows}>
                {group.entries.map((entry) => (
                  <ExperienceRow key={entry.company} entry={entry} />
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

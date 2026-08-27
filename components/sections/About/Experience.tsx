"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { EXPERIENCE, type ExperienceEntry } from "@/lib/experience";
import styles from "./About.module.css";

const FADE_DURATION = 0.35;
const VIEWPORT_AMOUNT = 0.2;

// Bare hostname for display in the preview card (e.g. "rrccompanies.com")
// — friendlier than the full https://.../ url, and never throws even on a
// malformed value since new URL() failures just fall back to the raw
// string.
function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Hover/focus preview card for a company with a known site (entry.url) —
 * per request ("when u hover over a company button it opens up a preview
 * to the website"). Not a live screenshot of the destination — a full-page
 * capture of someone else's site baked into this repo as a static asset
 * would need re-capturing by hand every time either site's own design
 * changed, and reproduces their design wholesale rather than just linking
 * to it. This instead blows up the same logo already used in the row
 * (already licensed for use here) alongside the plain domain text, in a
 * small floating card — enough to preview "where this link goes" without
 * that. Pure CSS reveal (:hover/:focus-visible on the parent .companyLink,
 * see About.module.css) rather than JS state, matching the hover-driven
 * conventions already used elsewhere on this site (Playground's plate
 * hover, ExtrasCard's own trigger).
 */
function CompanyPreview({ entry }: { entry: ExperienceEntry }) {
  return (
    <div className={styles.companyPreview}>
      <div className={styles.companyPreviewLogo}>
        <Image
          src={entry.logo}
          alt=""
          fill
          sizes="72px"
          unoptimized={process.env.NODE_ENV !== "production"}
          className={styles.companyPreviewLogoImage}
        />
      </div>
      <div className={styles.companyPreviewText}>
        <p className={styles.companyPreviewName}>{entry.company}</p>
        <p className={styles.companyPreviewUrl}>{hostname(entry.url!)} ↗</p>
      </div>
    </div>
  );
}

/**
 * One row: logo left, company/title next to it, date on the far right
 * (stacked under company/title on narrow screens instead — see
 * .rowDateInline/.rowDate in About.module.css). Ported from
 * jar-portfolio's components/Experience.tsx's own ExperienceRow.
 *
 * Rows with a known `url` render as a real link (whole row, opens the
 * site in a new tab) with the hover preview above; rows without one (UW
 * Cube has no public site on file) render as a plain non-interactive row,
 * same markup either way beyond the wrapping tag itself.
 */
function ExperienceRow({ entry }: { entry: ExperienceEntry }) {
  const rowContent = (
    <>
      <div className={styles.rowMain}>
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
        <div className={styles.rowText}>
          <p className={styles.rowLine}>
            <span className={styles.companyName}>{entry.company}</span>{" "}
            <span className={styles.jobTitle}>· {entry.title}</span>
          </p>
          <p className={styles.rowDateInline}>{entry.date}</p>
        </div>
      </div>
      <p className={styles.rowDate}>{entry.date}</p>
      {entry.url && <CompanyPreview entry={entry} />}
    </>
  );

  if (!entry.url) {
    return <div className={styles.row}>{rowContent}</div>;
  }

  return (
    <a
      href={entry.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${entry.company} (opens in a new tab)`}
      className={`${styles.row} ${styles.companyLink}`}
    >
      {rowContent}
    </a>
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
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: VIEWPORT_AMOUNT }}
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

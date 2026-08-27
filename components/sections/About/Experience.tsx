"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { EXPERIENCE, type ExperienceEntry } from "@/lib/experience";
import styles from "./About.module.css";

const FADE_DURATION = 0.35;
const VIEWPORT_AMOUNT = 0.2;

/**
 * One row: logo left, company/title next to it, date on the far right
 * (stacked under company/title on narrow screens instead — see
 * .rowDateInline/.rowDate in About.module.css). Ported from
 * jar-portfolio's components/Experience.tsx's own ExperienceRow.
 */
function ExperienceRow({ entry }: { entry: ExperienceEntry }) {
  return (
    <div className={styles.row}>
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

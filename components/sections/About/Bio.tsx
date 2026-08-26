"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { content } from "@/lib/content";
import styles from "./About.module.css";

const copy = content.en.about;
const socialLinks = content.en.footer.links;

const FADE_DURATION = 0.35;

/**
 * Framed photo + bordered bio text — ported from jar-portfolio's
 * app/notes/page.tsx (that file's own comments confirm it's actually the
 * About page, despite the folder name) and components it inlines there.
 * Two differences from the source, per this repo's own conventions:
 * - No `min-height: AVAILABLE_HEIGHT` viewport-fit — that was the source's
 *   way of keeping the bio to exactly one screen (a fixed circular-arrow
 *   back button, no page scroll); this site has no such convention
 *   elsewhere (Playground's own detail page dropped the same thing for the
 *   same reason — see its own comment), so this is just an ordinary
 *   section that scrolls like every other one.
 * - The photo doesn't shrink dramatically on mobile the way the source's
 *   does (clamp(90px,16dvh,130px) up to 460px) — that shrink existed only
 *   to make the one-viewport-tall layout above fit; without that
 *   constraint the photo can just stay a normal, comfortably-sized column
 *   at every width (see .photo's own clamp in About.module.css).
 */
export default function Bio() {
  return (
    <section className={styles.bioSection}>
      <div className={`pageContainer ${styles.bioGrid}`}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: FADE_DURATION, ease: "easeOut" }}
          className={styles.photo}
        >
          <Image
            src="/images/etc/me-framed.webp"
            alt="Amy standing at a bus stop, framed"
            fill
            sizes="460px"
            unoptimized={process.env.NODE_ENV !== "production"}
            className={styles.photoImage}
            draggable={false}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: FADE_DURATION, ease: "easeOut", delay: 0.05 }}
          className={styles.textBox}
        >
          <Image
            src="/images/drawings/border.png"
            alt=""
            fill
            quality={95}
            unoptimized={process.env.NODE_ENV !== "production"}
            className={styles.borderImage}
          />

          <div className={styles.textContent}>
            <h1 className={styles.heading}>{copy.heading}</h1>

            <p className={styles.paragraph}>{copy.paragraphs.intro}</p>

            <p className={styles.paragraph}>
              {copy.paragraphs.perfectionist.before}
              <em>{copy.paragraphs.perfectionist.emphasis}</em>
              {copy.paragraphs.perfectionist.after}
            </p>

            <p className={styles.paragraph}>
              {copy.paragraphs.knownAs.intro}
              {copy.paragraphs.knownAs.bullets.map((bullet) => (
                <span key={bullet}>
                  <br />- {bullet}
                </span>
              ))}
            </p>

            <p className={styles.paragraph}>
              {copy.paragraphs.contact.before}
              {/* Hrefs reused from content.en.footer.links (this repo's one
                  shared source for these 3 URLs — see this component's own
                  top comment); the link TEXT here is fixed, verbatim source
                  wording ("Linkedin"/"X/Twitter"/"email"), not
                  footer.links' own label strings — those read "X / Twitter"
                  (spaced) and "Email" (capitalized), different copy meant
                  for the footer's own layout. */}
              <a
                href={socialLinks.linkedin.href}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                Linkedin
              </a>
              {copy.paragraphs.contact.betweenLinkedinAndX}
              <a
                href={socialLinks.twitter.href}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                X/Twitter
              </a>
              {copy.paragraphs.contact.betweenXAndEmail}
              <a href={socialLinks.email.href} className={styles.link}>
                email
              </a>
              {copy.paragraphs.contact.after}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

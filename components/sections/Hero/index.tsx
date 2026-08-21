"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import styles from "./Hero.module.css";
import CircleToggle from "@/components/ui/CircleToggle";
import JarStage from "./JarStage";
import { JAR_ITEMS } from "./items.manifest";
import { JAR_FADE_MS } from "./motion-timing";
import { content } from "@/lib/content";

const copy = content.en.hero;

function scrollToProjects() {
  const el = document.getElementById("projects");
  if (!el) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
}

export default function Hero() {
  const [projectsOn, setProjectsOn] = useState(false);
  const [favouritesOn, setFavouritesOn] = useState(false);

  return (
    <section className={styles.hero}>
      <div className={`pageContainer ${styles.container}`}>
        <div className={styles.topBar}>
          {/* Inert for now — locale switching gets wired up later. */}
          <div className={styles.langToggle}>
            <button type="button" className={styles.langButton}>
              {copy.lang.en}
            </button>
            <button type="button" className={styles.langButton}>
              {copy.lang.zh}
            </button>
          </div>

          <div className={styles.socialGroup}>
            <a
              className={styles.socialIcon}
              href={copy.social.linkedin.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/images/logos/linkedin.png" alt={copy.social.linkedin.label} draggable={false} />
            </a>
            <a
              className={styles.socialIcon}
              href={copy.social.gmail.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/images/logos/gmail.png" alt={copy.social.gmail.label} draggable={false} />
            </a>
            <a
              className={styles.socialIcon}
              href={copy.social.twitter.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/images/logos/twitter.png" alt={copy.social.twitter.label} draggable={false} />
            </a>
          </div>
        </div>

        <div className={styles.columns}>
          <div className={styles.left}>
            <div className={styles.identity}>
              <img src="/images/logos/black-star.png" alt="" className={styles.logo} draggable={false} />
              <h1 className={styles.title}>{copy.title}</h1>
              <p className={styles.tagline}>{copy.tagline}</p>
            </div>

            <nav className={styles.nav}>
              <button type="button" className={styles.navLink} onClick={scrollToProjects}>
                {copy.nav.work} →
              </button>
              <Link href="/about" className={styles.navLink}>
                {copy.nav.about} →
              </Link>
              <Link href="/playground" className={styles.navLink}>
                {copy.nav.playground} →
              </Link>
            </nav>
          </div>

          <div className={styles.right}>
            <div
              className={styles.jarWrapper}
              // Read by Hero.module.css's heroFadeIn animation (var(--jar-fade-ms))
              // and, via the same JAR_FADE_MS constant, by useJarPhysics.ts's own
              // "don't start falling until the fade is ~70% done" delay — see
              // motion-timing.ts.
              style={{ "--jar-fade-ms": `${JAR_FADE_MS}ms` } as CSSProperties}
            >
              <JarStage items={JAR_ITEMS} projectsOn={projectsOn} favouritesOn={favouritesOn} />
            </div>
            <div className={styles.toggles}>
              <CircleToggle
                label={copy.toggles.projects}
                color="var(--c-red)"
                active={projectsOn}
                onToggle={() => setProjectsOn((v) => !v)}
              />
              <CircleToggle
                label={copy.toggles.favourites}
                color="var(--c-blue)"
                active={favouritesOn}
                onToggle={() => setFavouritesOn((v) => !v)}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

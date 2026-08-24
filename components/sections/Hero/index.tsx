"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./Hero.module.css";
import CircleToggle from "@/components/ui/CircleToggle";
import JarStage from "./JarStage";
import { JAR_ITEMS } from "./items.manifest";
import { HERO_LOAD_IN_MS } from "./motion-timing";
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
    <section
      className={styles.hero}
      // Read by every hero element's shared heroLoadIn animation
      // (Hero.module.css, via var(--hero-load-ms)) — jar included. Set once
      // here (not per-element) since every animated child shares this exact
      // same duration.
      style={{ "--hero-load-ms": `${HERO_LOAD_IN_MS}ms` } as CSSProperties}
    >
      <div className={`pageContainer ${styles.container}`}>
        <div className={styles.topBar}>
          <div className={styles.socialGroup}>
            <a
              className={styles.socialIcon}
              href={copy.social.linkedin.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="/images/logos/linkedin.png"
                alt={copy.social.linkedin.label}
                width={176}
                height={176}
                draggable={false}
                priority
              />
            </a>
            <a
              className={styles.socialIcon}
              href={copy.social.gmail.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="/images/logos/gmail.png"
                alt={copy.social.gmail.label}
                width={172}
                height={172}
                draggable={false}
                priority
              />
            </a>
            <a
              className={styles.socialIcon}
              href={copy.social.twitter.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="/images/logos/twitter.png"
                alt={copy.social.twitter.label}
                width={155}
                height={155}
                draggable={false}
                priority
              />
            </a>
          </div>
        </div>

        <div className={styles.columns}>
          <div className={styles.left}>
            <div className={styles.identity}>
              <Image
                src="/images/logos/black-star.png"
                alt=""
                aria-hidden="true"
                width={231}
                height={249}
                className={styles.logo}
                draggable={false}
                priority
              />
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
            <div className={styles.jarWrapper}>
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

"use client";

import { useState } from "react";
import styles from "./Stage.module.css";
import CircleToggle from "@/components/ui/CircleToggle";
import JarStage from "@/components/sections/Hero/JarStage";
import { JAR_ITEMS } from "@/components/sections/Hero/items.manifest";
import { content } from "@/lib/content";

const copy = content.en.sidebar.views;
const toggleCopy = content.en.hero.toggles;

type View = "jar" | "gallery";

export default function Stage() {
  const [view, setView] = useState<View>("jar");
  const [projectsOn, setProjectsOn] = useState(false);
  const [favouritesOn, setFavouritesOn] = useState(false);

  return (
    <section className={styles.stage}>
      <div className={styles.viewToggle} role="group" aria-label={copy.label}>
        {(["jar", "gallery"] as const).map((v) => (
          <button
            key={v}
            type="button"
            className={`${styles.viewButton} ${view === v ? styles.viewActive : ""}`}
            aria-pressed={view === v}
            onClick={() => setView(v)}
          >
            {copy[v]}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        {/* JarStage unmounts in gallery view rather than hiding: its physics
         * sizes everything off the container's rendered width, which is 0
         * under display:none. Remounting also re-drops the items on the way
         * back, which is what the brief wants anyway (3.8). */}
        {view === "jar" ? (
          <div className={styles.jarWrapper}>
            <JarStage items={JAR_ITEMS} projectsOn={projectsOn} favouritesOn={favouritesOn} />
          </div>
        ) : (
          <p className={styles.galleryPlaceholder}>{content.en.sidebar.galleryPlaceholder}</p>
        )}
      </div>

      <div className={styles.toggles}>
        <CircleToggle
          label={toggleCopy.projects}
          color="var(--c-red)"
          active={projectsOn}
          onToggle={() => setProjectsOn((v) => !v)}
        />
        <CircleToggle
          label={toggleCopy.favourites}
          color="var(--c-blue)"
          active={favouritesOn}
          onToggle={() => setFavouritesOn((v) => !v)}
        />
      </div>
    </section>
  );
}

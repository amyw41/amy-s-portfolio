"use client";

import { useEffect, useState } from "react";
import styles from "./Home.module.css";
import Sidebar, { type HomeMode } from "./Sidebar";
import CircleToggle from "@/components/ui/CircleToggle";
import BuzzPath from "@/components/ui/BuzzPath";
import JarStage from "@/components/sections/Hero/JarStage";
import { JAR_ITEMS } from "@/components/sections/Hero/items.manifest";
import { content } from "@/lib/content";
import { geist } from "@/lib/fonts";
import { buildWobblyLinePath, LINE_STROKE_WIDTH } from "@/lib/wobbly";

const copy = content.en.sidebar;

// The squiggly divider (brief Part 2.1): a gently wobbling vertical line,
// buzzing. Drawn in a box DIVIDER_BOX_H tall (the line's height on the
// 1536×696 laptop layout) and stretched to the real height, so its wobble
// is laid out at true scale there. DIVIDER_AMPLITUDE is how far, in px, it
// strays either side of straight. LINE_STROKE_WIDTH matches the jar
// drawing's own ink (~0.5-0.75px on screen at that size).
const DIVIDER_BOX_W = 12;
const DIVIDER_BOX_H = 664;
const DIVIDER_AMPLITUDE = 1.4;
const DIVIDER_VARIANTS = [0, 1, 2].map((v) =>
  buildWobblyLinePath(7, [DIVIDER_BOX_W / 2, 0], [DIVIDER_BOX_W / 2, DIVIDER_BOX_H], DIVIDER_AMPLITUDE, v),
);

// Rebrand v2 home page (brief Part 2): one fixed screen — sidebar, divider,
// stage. Replaces Hero + Projects on "/" (both kept in components/sections/
// for now, just no longer rendered here).
export default function Home() {
  const [mode, setMode] = useState<HomeMode>("jar");
  const [projectsOn, setProjectsOn] = useState(false);
  const [itemsOn, setItemsOn] = useState(false);

  // The taskbar's "work" link on every other page still points at
  // /#projects (the old projects section) — land those visits in work mode.
  // Deferred a tick: reading the hash has to wait for mount (no URL during
  // SSR), and setting state straight from the effect body is what the
  // react-hooks lint rule flags. setTimeout, not rAF — rAF never fires in a
  // background tab.
  useEffect(() => {
    if (window.location.hash !== "#projects") return;
    const timer = window.setTimeout(() => setMode("work"));
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className={`${geist.variable} ${styles.frame}`}>
      <Sidebar mode={mode} onModeChange={setMode} />

      <div className={styles.divider} aria-hidden="true">
        <BuzzPath
          className={styles.dividerLine}
          variants={DIVIDER_VARIANTS}
          viewBox={`0 0 ${DIVIDER_BOX_W} ${DIVIDER_BOX_H}`}
          preserveAspectRatio="none"
          strokeWidth={LINE_STROKE_WIDTH}
        />
      </div>

      <section className={styles.stage}>
        {mode === "jar" ? (
          <>
            <div className={styles.jarWrapper}>
              {/* Unmounted (not hidden) in work mode: useJarPhysics sizes
               * everything off this box's measured width, and a hidden
               * (display:none) box measures 0 — remounting rebuilds the
               * world cleanly and the items fall in again, which is what
               * work → jar should look like anyway (brief Part 2.4). */}
              <JarStage items={JAR_ITEMS} projectsOn={projectsOn} favouritesOn={itemsOn} />
            </div>
            <div className={styles.toggles}>
              <CircleToggle
                label={copy.toggles.projects}
                color="var(--c-red)"
                active={projectsOn}
                onToggle={() => setProjectsOn((v) => !v)}
              />
              <CircleToggle
                label={copy.toggles.items}
                color="var(--c-blue)"
                active={itemsOn}
                onToggle={() => setItemsOn((v) => !v)}
              />
            </div>
          </>
        ) : (
          // Placeholder — the project grid and filters come in step 4.
          <div className={styles.work}>
            <h2 className={styles.workHeading}>{copy.workHeading}</h2>
          </div>
        )}
      </section>
    </main>
  );
}

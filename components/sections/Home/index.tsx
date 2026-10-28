"use client";

import { useEffect, useState } from "react";
import styles from "./Home.module.css";
import Sidebar, { type HomeMode } from "./Sidebar";
import CircleToggle from "@/components/ui/CircleToggle";
import JarStage from "@/components/sections/Hero/JarStage";
import { JAR_ITEMS } from "@/components/sections/Hero/items.manifest";
import { content } from "@/lib/content";
import { figtree } from "@/lib/fonts";

const copy = content.en.sidebar;

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
    <main className={`${figtree.variable} ${styles.frame}`}>
      <Sidebar mode={mode} onModeChange={setMode} />

      <div className={styles.divider} aria-hidden="true" />

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

"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import styles from "./Home.module.css";
import Sidebar, { type HomeMode } from "./Sidebar";
import WorkGrid from "./WorkGrid";
import BuzzPath from "@/components/ui/BuzzPath";
import JarView from "./JarView";
import { createJarSound, type JarSound } from "@/components/sections/Hero/jar-sound";
import { content } from "@/lib/content";
import { geist } from "@/lib/fonts";
import { buildWobblyLinePath, LINE_STROKE_WIDTH } from "@/lib/wobbly";
import { JAR_ANTICIPATE_S, JAR_DROP_OUT_S, slowMs } from "@/lib/motion";

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
  // The case study hovered/focused in the sidebar's Works list, isolated on
  // the stage: its jar item lifts and the rest dim (or, in work mode, its
  // grid tile).
  const [focusedCase, setFocusedCase] = useState<string | null>(null);
  // Whether the jar view is arriving from work mode (drops in) rather than
  // just being there on first load. Read by JarView once, when it mounts.
  const [jarEntering, setJarEntering] = useState(false);

  // The jar clink for jar → work. Created up front so its audio is decoded
  // by the time anyone clicks; the click itself is the user gesture that
  // lets it play.
  const soundRef = useRef<JarSound | null>(null);
  useEffect(() => {
    const sound = createJarSound();
    soundRef.current = sound;
    return () => sound.dispose();
  }, []);

  function changeMode(next: HomeMode) {
    if (next === mode) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (next === "work" && !reduced && soundRef.current) {
      const spanMs = slowMs((JAR_ANTICIPATE_S + JAR_DROP_OUT_S) * 1000);
      soundRef.current.start(spanMs / 1000);
      window.setTimeout(() => soundRef.current?.stop(), spanMs);
    }
    setJarEntering(next === "jar");
    setMode(next);
  }

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
      <Sidebar mode={mode} onModeChange={changeMode} onCaseFocus={setFocusedCase} />

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
        {/* Both views can be on stage at once while one leaves and the other
         * arrives: jar → work, the jar drops away as "what's inside?" drops
         * in; work → jar, the grid slides out and the jar waits for it
         * before dropping in (JarView). */}
        <AnimatePresence initial={false}>
          {mode === "jar" ? (
            <JarView key="jar" entering={jarEntering} isolatedId={focusedCase} />
          ) : (
            <WorkGrid key="work" focusedId={focusedCase} />
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}

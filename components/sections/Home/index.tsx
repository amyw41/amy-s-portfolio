"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import styles from "./Home.module.css";
import Sidebar, { type HomeMode } from "./Sidebar";
import WorkGrid from "./WorkGrid";
import ScrollCue from "./ScrollCue";
import { useScrollSwitch } from "./useScrollSwitch";
import BuzzPath from "@/components/ui/BuzzPath";
import JarView from "./JarView";
import { createJarSound, type JarSound } from "@/components/sections/Hero/jar-sound";
import { content } from "@/lib/content";
import { gaegu, geist } from "@/lib/fonts";
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
  // The case study hovered/focused in the sidebar's Works list, isolated on
  // the stage: its jar item lifts and the rest dim (or, in work mode, its
  // grid tile).
  const [focusedCase, setFocusedCase] = useState<string | null>(null);
  // Whether the jar view is arriving from work mode (drops in) rather than
  // just being there on first load. Read by JarView once, when it mounts.
  const [jarEntering, setJarEntering] = useState(false);

  // The glass clink, created up front so its audio is decoded before the
  // first item lands. It only ever plays when an item hits the jar's glass
  // (the physics reports those — see useJarPhysics's onImpact): as they fall
  // in, and as they bounce when the jar is lowered away. Reduced motion:
  // silent.
  const soundRef = useRef<JarSound | null>(null);
  useEffect(() => {
    const sound = createJarSound();
    soundRef.current = sound;
    return () => sound.dispose();
  }, []);
  const handleImpact = useCallback((strength: number) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    soundRef.current?.clink(strength);
  }, []);
  // The pile has settled: nothing more until the next fall or bounce.
  const handleImpactsEnd = useCallback(() => soundRef.current?.silence(), []);

  function changeMode(next: HomeMode) {
    if (next === mode) return;
    setJarEntering(next === "jar");
    setMode(next);
  }

  // Scrolling is the switch (no toggle): down for work, up for the jar.
  const frameRef = useRef<HTMLElement>(null);
  useScrollSwitch(frameRef, mode, changeMode);

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
    <main ref={frameRef} className={`${geist.variable} ${gaegu.variable} ${styles.frame}`}>
      <Sidebar onCaseFocus={setFocusedCase} />

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
        {/* The crayon toggle (ModeToggle.tsx) is kept in the repo but no
         * longer shown: scrolling switches. On mobile, where it doesn't,
         * these tap cues do. */}
        <ScrollCue mode={mode} onActivate={changeMode} />
        {/* mode="wait": one view at a time — the leaving one finishes its
         * exit before the next starts (jar → work: the jar drops away, then
         * "what's inside?" and the grid come in; work → jar: the grid slides
         * out, then the jar drops in). */}
        <AnimatePresence mode="wait" initial={false}>
          {mode === "jar" ? (
            <JarView
              key="jar"
              entering={jarEntering}
              isolatedId={focusedCase}
              onImpact={handleImpact}
              onImpactsEnd={handleImpactsEnd}
              onHintActivate={() => changeMode("work")}
            />
          ) : (
            <WorkGrid key="work" focusedId={focusedCase} onJumpToJar={() => changeMode("jar")} />
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}

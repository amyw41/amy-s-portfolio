"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence } from "framer-motion";
import styles from "./Home.module.css";
import Sidebar, { type HomeMode } from "./Sidebar";
import WorkGrid, { preloadWorkCovers } from "./WorkGrid";
import ScrollCue from "./ScrollCue";
import { useScrollSwitch } from "./useScrollSwitch";
import BuzzPath from "@/components/ui/BuzzPath";
import JarView from "./JarView";
import { createJarSound, type JarSound } from "@/components/sections/Hero/jar-sound";
import { content } from "@/lib/content";
import { gaegu, geist } from "@/lib/fonts";
import { useCaseZoom } from "@/components/ui/CaseZoom";
import {
  INTRO_DIVIDER_DRAW_S,
  INTRO_SIDEBAR_RISE_PX,
  INTRO_SIDEBAR_STAGGER_S,
  ZOOM_DROP_PX,
  ZOOM_RETURN_S,
  slowMs,
} from "@/lib/motion";
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

// The way back from a case study's timings, for the CSS (Home.module.css
// .zoomCollapsed/.zoomBack).
const ZOOM_VARS = {
  "--zoom-return-ms": `${ZOOM_RETURN_S * 1000}ms`,
  "--zoom-drop": `${ZOOM_DROP_PX}px`,
  // The intro's hand-over (Home.module.css .introHidden/.introReveal).
  "--intro-stagger-ms": `${INTRO_SIDEBAR_STAGGER_S * 1000}ms`,
  "--intro-rise": `${INTRO_SIDEBAR_RISE_PX}px`,
  "--intro-divider-ms": `${INTRO_DIVIDER_DRAW_S * 1000}ms`,
} as CSSProperties;

// Rebrand v2 home page (brief Part 2): one fixed screen — sidebar, divider,
// stage. Replaces Hero + Projects on "/" (both kept in components/sections/
// for now, just no longer rendered here).
export default function Home() {
  // Back from a case study by its logo: come back in the mode it was left
  // in, the rail widening back into the sidebar (zoomStage below).
  const zoom = useCaseZoom();
  const [mode, setMode] = useState<HomeMode>(() => (zoom?.returning ? zoom.lastMode : "jar"));
  useEffect(() => {
    zoom?.setLastMode(mode);
  }, [zoom, mode]);
  // The zoom into a case study (and back): "out" — the sidebar narrowed to
  // the case study's rail, everything else faded and dropped out (leaving,
  // or the first frame back); "back" — widening and fading back in.
  const [returnStage, setReturnStage] = useState<"collapsed" | "expanding" | "none">(() =>
    zoom?.returning ? "collapsed" : "none",
  );
  useEffect(() => {
    if (returnStage !== "collapsed") return;
    // Two frames so the collapsed state paints first, then widen.
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => setReturnStage("expanding"));
    });
    const done = window.setTimeout(() => {
      setReturnStage("none");
      zoom?.doneReturning();
    }, slowMs(ZOOM_RETURN_S * 1000) + 100);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(done);
    };
  }, [returnStage, zoom]);
  const zoomClass =
    returnStage === "collapsed" ? styles.zoomCollapsed : returnStage === "expanding" ? styles.zoomBack : "";
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

  // The work view's footer (desktop): scrolling past the end of the work
  // slides the whole page up by that much, uncovering the footer fixed
  // behind it across the whole window (WorkGrid reports how far).


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

  // The load-in, on every visit: the jar drops in from above and the items
  // fall into it (the same arrival as scrolling back up from the work), while
  // the sidebar loads top to bottom and the divider draws on downward. None
  // for reduced motion, a visit straight to the work (#projects) or a trip
  // back from a case study. The page starts hidden ("pending") until that's
  // decided (there's no window to decide it with on the server); "play"
  // paints it hidden once more so the transitions have a start, "reveal"
  // runs them, and "none" is the page at rest.
  const [intro, setIntro] = useState<"pending" | "play" | "reveal" | "none">(() =>
    zoom?.returning ? "none" : "pending",
  );
  useEffect(() => {
    if (intro !== "pending") return;
    // setTimeout, not rAF (rAF never fires in a background tab).
    const timer = window.setTimeout(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setIntro(reduced || window.location.hash === "#projects" ? "none" : "play");
    });
    return () => window.clearTimeout(timer);
  }, [intro]);
  // "play" → "reveal" the moment the jar starts to drop (JarView's
  // onLoadInStart, once it's got the fall ready), so everything comes in
  // at once. In work mode there's no jar to wait for.
  const startReveal = useCallback(() => setIntro((i) => (i === "play" ? "reveal" : i)), []);
  useEffect(() => {
    if (intro !== "play" || mode === "jar") return;
    const timer = window.setTimeout(startReveal, 30);
    return () => window.clearTimeout(timer);
  }, [intro, mode, startReveal]);
  useEffect(() => {
    if (intro !== "reveal") return;
    // Back to rest once the sidebar and the divider have finished.
    const sidebarMs = 350 + INTRO_SIDEBAR_STAGGER_S * 1000 * 2;
    const timer = window.setTimeout(() => setIntro("none"), slowMs(Math.max(sidebarMs, INTRO_DIVIDER_DRAW_S * 1000)) + 50);
    return () => window.clearTimeout(timer);
  }, [intro]);
  // Once the load-in is over and the page is idle, get the work's covers
  // ready, so scrolling down shows the cards straight away.
  useEffect(() => {
    if (intro !== "none") return;
    const run = () => void preloadWorkCovers();
    const idle = typeof window.requestIdleCallback === "function";
    const id: number = idle ? window.requestIdleCallback(run, { timeout: 2500 }) : window.setTimeout(run, 1200);
    return () => (idle ? window.cancelIdleCallback(id) : window.clearTimeout(id));
  }, [intro]);
  const introClass = intro === "reveal" ? styles.introReveal : intro === "none" ? "" : styles.introHidden;
  // The jar only mounts once the load-in is decided, so it can arrive.
  const jarReady = intro !== "pending";

  return (
    <main
      ref={frameRef}
      className={`${geist.variable} ${gaegu.variable} ${styles.frame} ${zoomClass} ${introClass}`}
      style={ZOOM_VARS}
    >
      {/* The case study's logo, appearing in the corner as the sidebar
       * narrows into its rail (the name retracting into it), and fading as
       * it widens back. */}
      <span className={styles.zoomLogo} aria-hidden="true">
        aw
      </span>
      <Sidebar onCaseFocus={setFocusedCase} />

      {/* Draws on downward at the load-in (Home.module.css .introReveal). */}
      <div className={styles.divider} aria-hidden="true" data-intro-divider>
        <BuzzPath
          className={styles.dividerLine}
          variants={DIVIDER_VARIANTS}
          viewBox={`0 0 ${DIVIDER_BOX_W} ${DIVIDER_BOX_H}`}
          preserveAspectRatio="none"
          strokeWidth={LINE_STROKE_WIDTH}
        />
      </div>

      <section className={styles.stage}>
        {/* Scrolling switches between the jar and the work; on mobile, where
         * it doesn't, these tap cues do. */}
        <ScrollCue mode={mode} onActivate={changeMode} />
        {/* mode="wait": one view at a time — the leaving one finishes its
         * exit before the next starts (jar → work: the jar drops away, then
         * "what's inside?" and the grid come in; work → jar: the grid slides
         * out, then the jar drops in). */}
        <AnimatePresence mode="wait" initial={false}>
          {mode === "jar" ? (
            jarReady && (
              <JarView
                key="jar"
                // The load-in is the same arrival as coming back from work.
                entering={jarEntering || intro === "play"}
                loadIn={intro === "play"}
                onLoadInStart={startReveal}
                isolatedId={focusedCase}
                onImpact={handleImpact}
                onImpactsEnd={handleImpactsEnd}
                onHintActivate={() => changeMode("work")}
              />
            )
          ) : (
            <WorkGrid
              key="work"
              focusedId={focusedCase}
              onJumpToJar={() => changeMode("jar")}
            />
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}

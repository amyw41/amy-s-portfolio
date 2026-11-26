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
  WORK_ENTER_DELAY_S,
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
  // Coming back to home in this visit, however (the back arrow, the
  // browser's back, the Home link), lands exactly where it was left: the same
  // mode, and in the work view the same scroll (2026-11-26). The first visit
  // starts on the jar (lastMode's default).
  const [mode, setMode] = useState<HomeMode>(() => zoom?.lastMode ?? "jar");
  useEffect(() => {
    zoom?.setLastMode(mode);
    if (mode === "jar") zoom?.setLastScroll(0);
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
  // jar → work: the work view mounts WORK_ENTER_DELAY_S after the switch,
  // while the jar is still dropping away (it passes behind the grid). Not
  // at once: mounting the grid is real work, and doing it the moment the
  // jar starts to leave held the jar's first move back. On first load, or
  // back from a case study, it's there straight away.
  const [workMounted, setWorkMounted] = useState(true);
  useEffect(() => {
    if (workMounted) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setWorkMounted(true), reduced ? 0 : slowMs(WORK_ENTER_DELAY_S * 1000));
    return () => window.clearTimeout(timer);
  }, [workMounted]);

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
    if (next === "work") setWorkMounted(false);
    setMode(next);
  }

  // Scrolling is the switch (no toggle): down for work, up for the jar.
  const frameRef = useRef<HTMLElement>(null);
  useScrollSwitch(frameRef, mode, changeMode);

  // The work view's scroll, remembered as it changes (the frame scrolls on
  // desktop, the window on phones), and put back once when home opens in
  // work mode: retried each frame until the cards are tall enough to hold
  // it (they arrive just after mount), for up to a second.
  const zoomRef = useRef(zoom);
  const modeRef = useRef(mode);
  useEffect(() => {
    zoomRef.current = zoom;
    modeRef.current = mode;
  });
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    let restoring = modeRef.current === "work" && (zoomRef.current?.lastScroll ?? 0) > 0;
    const save = () => {
      if (restoring || modeRef.current !== "work") return;
      zoomRef.current?.setLastScroll(Math.max(frame.scrollTop, window.scrollY));
    };
    frame.addEventListener("scroll", save, { passive: true });
    window.addEventListener("scroll", save, { passive: true });
    let raf = 0;
    if (restoring) {
      const target = zoomRef.current!.lastScroll;
      const until = performance.now() + 1000;
      const step = () => {
        frame.scrollTop = target;
        window.scrollTo(0, target);
        const at = Math.max(frame.scrollTop, window.scrollY);
        if (Math.abs(at - target) < 2 || performance.now() > until) {
          restoring = false;
          return;
        }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }
    return () => {
      cancelAnimationFrame(raf);
      frame.removeEventListener("scroll", save);
      window.removeEventListener("scroll", save);
    };
    // Once, on mount: the mode it opened in decides whether to restore.
  }, []);

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
  // ready, so scrolling down shows the cards straight away. The jar's
  // replay keeps the page busy, so an idle moment rarely comes: the short
  // timeout starts them within a fraction of a second either way (it used
  // to be 2.5s, so the videos only started ~5s after load and anyone who
  // scrolled sooner downloaded them during the switch, 2026-11-26).
  useEffect(() => {
    if (intro !== "none") return;
    const run = () => void preloadWorkCovers();
    const idle = typeof window.requestIdleCallback === "function";
    const id: number = idle ? window.requestIdleCallback(run, { timeout: 300 }) : window.setTimeout(run, 300);
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
        {/* jar → work ("sync"): the work comes in while the jar is still
         * dropping away, WORK_ENTER_DELAY_S after the switch (the jar holds
         * its size and passes behind the grid; JarView's exit). work → jar
         * ("wait"): the grid slides out first, then the jar drops in — the
         * jar measures itself as it arrives, so it can't share the stage
         * with the grid. Switching the mode doesn't remount anything (only
         * "popLayout" wraps the children). */}
        <AnimatePresence mode={mode === "work" ? "sync" : "wait"} initial={false}>
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
            workMounted && (
              <WorkGrid key="work" focusedId={focusedCase} onJumpToJar={() => changeMode("jar")} />
            )
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}

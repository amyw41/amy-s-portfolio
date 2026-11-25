"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import styles from "./MeshDemo.module.css";
import type { MeshScene, ViewMode } from "./meshScene";
import { MEDIA_FADE_BLUR_PX, MEDIA_FADE_MS } from "@/lib/motion";
import ModelSwitch from "./ModelSwitch";

// The scene fades in like the site's images (components/ui/MediaFade).
const FADE_VARS = {
  "--media-fade-ms": `${MEDIA_FADE_MS}ms`,
  "--media-fade-blur": `${MEDIA_FADE_BLUR_PX}px`,
} as CSSProperties;

const MODEL_URL = "/demos/cybersea/models/t-90.glb";

/**
 * The CyberSea case study's live demo, filling the header's preview
 * (HeroPreview.tsx), right there on the page: the 3D mesh viewer
 * from the project, cut down to one vehicle (the T-90 tank), drag to turn it
 * (right-drag or two fingers to pan), and two switches top right (Amy's
 * sketch, in the project's own style): exploded on / off, mode wire / solid. It opens straight
 * in as the blue wireframe mesh.
 *
 * Desktop only: phones keep the cover's video (a 3D view that takes drags
 * would trap the page's scroll on a touch screen, and it's heavy there).
 * three.js and the scene (meshScene.ts) are fetched once the page is idle,
 * so they never hold up its loading.
 */
export default function MeshDemo() {
  const reduced = useReducedMotion() ?? false;
  const [desktop, setDesktop] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ViewMode>("wireframe");
  const [split, setSplit] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<MeshScene | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Start the scene (and load the tank) once the page is idle; tear it all
  // down on leaving.
  useEffect(() => {
    const stage = stageRef.current;
    if (!desktop || !stage) return;
    let cancelled = false;
    const start = () => {
      import("./meshScene").then(({ createMeshScene }) => {
        if (cancelled) return;
        const scene = createMeshScene(stage, { reducedMotion: reduced, initialMode: "wireframe" });
        sceneRef.current = scene;
        scene
          .load(MODEL_URL)
          .catch(() => undefined)
          .finally(() => !cancelled && setLoading(false));
      });
    };
    const idle = typeof window.requestIdleCallback === "function";
    const id = idle ? window.requestIdleCallback(start, { timeout: 600 }) : window.setTimeout(start, 100);
    // The preview's video is under the demo: it needn't play.
    const video = stage.closest("[data-hero-media]")?.querySelector("video");
    video?.pause();
    return () => {
      cancelled = true;
      if (idle) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
    // The scene reads reduced motion once, when it starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktop]);

  useEffect(() => sceneRef.current?.setMode(mode), [mode]);
  useEffect(() => sceneRef.current?.setSplit(split), [split]);

  if (!desktop) return null;

  return (
    <div className={styles.demo} style={FADE_VARS}>
      <div
        ref={stageRef}
        className={`${styles.stage} ${loading ? "" : styles.stageShown}`}
        aria-label="3D model of a T-90 tank: drag to turn it"
        role="img"
      />
      {loading && <p className={styles.loading}>Loading model…</p>}

      {/* The controls (Amy's sketch, in the CyberSea project's own style):
          a small dark panel top right with two switches. */}
      <div className={styles.panel}>
        <p className={styles.label}>Exploded</p>
        <ModelSwitch label="Exploded view" on={split} onChange={setSplit} />
        <p className={styles.label}>Mode</p>
        <ModelSwitch
          label="Solid view"
          on={mode === "solid"}
          onText="Solid"
          offText="Wire"
          onChange={(solid) => setMode(solid ? "solid" : "wireframe")}
        />
      </div>

    </div>
  );
}

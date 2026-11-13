"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import styles from "./MeshDemo.module.css";
import type { MeshScene, ViewMode } from "./meshScene";
import { MEDIA_FADE_BLUR_PX, MEDIA_FADE_MS } from "@/lib/motion";

// The scene fades in like the site's images (components/ui/MediaFade).
const FADE_VARS = {
  "--media-fade-ms": `${MEDIA_FADE_MS}ms`,
  "--media-fade-blur": `${MEDIA_FADE_BLUR_PX}px`,
} as CSSProperties;

const MODEL_URL = "/demos/cybersea/models/t-90.glb";

/**
 * The CyberSea case study's live demo, filling its cover: the 3D mesh viewer
 * from the project, cut down to one vehicle (the T-90 tank), drag to turn it
 * (right-drag or two fingers to pan), Wireframe / Solid and Exploded view.
 * It opens straight in as the blue wireframe mesh. The panel is the
 * project's own inspector panel, trimmed.
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
    // The cover's video is under the demo: it needn't play.
    const video = stage.closest("section")?.querySelector("video");
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
      <div ref={stageRef} className={`${styles.stage} ${loading ? "" : styles.stageShown}`} aria-label="3D model of a T-90 tank: drag to turn it" role="img" />
      {loading && <p className={styles.loading}>Loading model…</p>}

      <div className={styles.panel}>
        <h2 className={styles.name}>T-90 Main Battle Tank</h2>
        <span className={styles.tag}>Ground vehicle</span>

        <p className={styles.label}>View mode</p>
        <div className={styles.segmented} role="radiogroup" aria-label="View mode">
          {(["wireframe", "solid"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={mode === v}
              className={styles.segment}
              onClick={() => setMode(v)}
            >
              {v === "wireframe" ? "Wireframe" : "Solid"}
            </button>
          ))}
        </div>

        <div className={styles.row}>
          <p className={styles.rowLabel}>Exploded view</p>
          <button
            type="button"
            aria-pressed={split}
            aria-label="Exploded view"
            className={styles.toggle}
            onClick={() => setSplit((s) => !s)}
          >
            {split ? "On" : "Off"}
          </button>
        </div>
        <p className={styles.note}>Separates disconnected geometry into distinct parts.</p>
      </div>

      <p className={styles.hint}>Drag to rotate · right-drag to pan</p>
      <p className={styles.credit}>
        <a
          href="https://sketchfab.com/3d-models/t-90-f21acfb4ef1b4e74b91c2348cbf6e2e2"
          target="_blank"
          rel="noopener noreferrer"
        >
          &ldquo;T-90&rdquo;
        </a>{" "}
        by mamont nikita, CC BY 4.0
      </p>
    </div>
  );
}

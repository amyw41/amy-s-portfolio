"use client";

import type { CSSProperties } from "react";
import { MESH_TOGGLE_MS } from "@/lib/motion";
import styles from "./MeshDemo.module.css";

/**
 * An on/off switch for CyberSea's 3D demo, in the CyberSea project's own
 * style: a small square-cornered track with a white/30% outline and a white
 * knob that slides across, the track filling blue (#3b82f6) when on, and
 * the state in 10px bold uppercase beside it.
 */
export default function ModelSwitch({
  label,
  on,
  onText = "On",
  offText = "Off",
  onChange,
}: {
  label: string;
  on: boolean;
  onText?: string;
  offText?: string;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={styles.switch}
      style={{ "--toggle-ms": `${MESH_TOGGLE_MS}ms` } as CSSProperties}
      onClick={() => onChange(!on)}
    >
      <span className={styles.switchTrack} aria-hidden="true">
        <span className={styles.switchKnob} />
      </span>
      <span className={styles.switchText}>{on ? onText : offText}</span>
    </button>
  );
}

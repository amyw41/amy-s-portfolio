"use client";

import type { CSSProperties } from "react";
import styles from "./CircleToggle.module.css";

interface CircleToggleProps {
  label: string;
  color: string;
  active: boolean;
  onToggle: () => void;
}

export default function CircleToggle({ label, color, active, onToggle }: CircleToggleProps) {
  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={onToggle}
      aria-pressed={active}
      style={{ "--toggle-color": color } as CSSProperties}
    >
      <span className={`${styles.circle} ${active ? styles.active : ""}`} />
      <span className={styles.label}>{label}</span>
    </button>
  );
}

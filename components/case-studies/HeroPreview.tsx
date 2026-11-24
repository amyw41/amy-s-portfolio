"use client";

import type { CSSProperties, ReactNode } from "react";
import styles from "./HeroPreview.module.css";

/**
 * The case-study header's preview: a wide rectangle across the writing's
 * width showing the project's media, with its live demo over it right there
 * on the page (CyberSea's 3D tank, with its panel: drag to turn it). No
 * click-to-open: everything is shown directly.
 *
 * Values: docs/rebrand/design-system.md "Case-study header".
 */
export default function HeroPreview({
  media,
  demo,
  className = "",
  squareProps,
}: {
  /** The still or video under everything (and all that phones show). */
  media: ReactNode;
  /** A live demo drawn over the media (it decides itself where it runs). */
  demo?: ReactNode;
  className?: string;
  /** Extra attributes on the box (the zoom-from-home target). */
  squareProps?: Record<string, unknown> & { style?: CSSProperties };
}) {
  return (
    <div {...squareProps} className={`${styles.square} ${className}`} style={squareProps?.style} data-hero-media="">
      {media}
      {demo}
    </div>
  );
}

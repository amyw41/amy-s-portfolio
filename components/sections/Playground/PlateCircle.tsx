import Image from "next/image";
import styles from "./PlateCircle.module.css";

/**
 * A hand-drawn plate illustration with the category name centered inside —
 * ported from jar-portfolio's components/Etc/PlateCircle.tsx (rewritten
 * from Tailwind to a CSS Module, matching this repo's own convention; every
 * other component here — Hero, Projects, Taskbar — is a CSS Module too, and
 * this site's Tailwind dependency is scoped to just the case-study route,
 * see app/projects/[slug]/case-study.css).
 *
 * Rendered both as a link (PlateView's overview grid, wrapped in a Link by
 * index.tsx) and standalone (CategoryDetail.tsx's own cropped hub, where
 * `label` is always ""), so unlike a plain presentational component this
 * DOES need hover styling for the linked case — see the label span's own
 * comment below for how that reaches in from the wrapping Link.
 */
export default function PlateCircle({
  label,
  src,
  size = 220,
}: {
  label: string;
  src: string;
  size?: number;
}) {
  return (
    <div className={styles.plate} style={{ width: size, height: size }}>
      <Image
        src={src}
        alt=""
        fill
        // No `sizes` — this renders at very different sizes across
        // breakpoints (the whole poster is scaled as a unit, see
        // PlateView.tsx), and matches jar.png's own accidental-but-correct
        // treatment on the homepage: omitting `sizes` makes next/image
        // assume full-viewport width, so it always fetches a source large
        // enough that this fine hand-drawn linework doesn't pixelate once
        // stretched back out at a real DPR.
        quality={95}
        // Turbopack's dev-mode image-optimization cache doesn't bust when a
        // file is replaced at the same path — same workaround already used
        // in CaseStudyKit.tsx's CaseStudyImage. Production still gets
        // normal next/image optimization.
        unoptimized={process.env.NODE_ENV !== "production"}
        // Rotated 180° — matches jar-portfolio's own PlateCircle (its own
        // comment: the plate art's pen strokes don't fully close near the
        // top, while the bottom is clean, so this moves the gap to the
        // bottom). jar-portfolio's detail page then crops that bottom edge
        // away; nothing here does, so double check the gap actually reads
        // fine unclipped once this is up.
        className={styles.image}
        draggable={false}
      />
      {/* plateCircleLabel: a second, CSS-Modules-unscoped class name —
          lets Playground.module.css's .plateLink:hover rule reach in and
          tint this from outside, since a plain CSS Modules class here
          couldn't be targeted by another file's stylesheet. Harmless when
          this isn't wrapped in a link (CategoryDetail.tsx's usage): nothing
          ever hovers a non-link ancestor to trigger it. */}
      <span className={`${styles.label} plateCircleLabel`} style={{ fontSize: (size / 480) * 42 }}>
        {label}
      </span>
    </div>
  );
}

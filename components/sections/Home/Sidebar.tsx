"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Mail } from "lucide-react";
import styles from "./Sidebar.module.css";
import { content } from "@/lib/content";
import { PROJECTS } from "@/lib/projects";
import { CHEVRON_OPEN_DEG, CHEVRON_TURN_S, OVAL_DRAW_S, slowTransition } from "@/lib/motion";
import {
  buildWobblyPillPath,
  PILL_STROKE_COLOR,
  PILL_STROKE_WIDTH,
  PILL_VIEW_BOX,
} from "@/components/sections/Hero/wobblyOval";

const copy = content.en.sidebar;
const links = content.en.footer.links;

export type HomeMode = "jar" | "work";

interface SidebarProps {
  mode: HomeMode;
  onModeChange: (mode: HomeMode) => void;
}

// X and LinkedIn marks — lucide-react no longer ships brand icons, so these
// two are inline. Both fill with currentColor so the row stays plain black.
function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">
      <path d="M5.34 3.5a1.92 1.92 0 1 1 0 3.84 1.92 1.92 0 0 1 0-3.84zM3.68 8.9h3.32v10.6H3.68zM9.08 8.9h3.18v1.45h.05c.44-.84 1.53-1.73 3.16-1.73 3.38 0 4 2.22 4 5.11v5.77h-3.32v-5.12c0-1.22-.02-2.79-1.7-2.79-1.7 0-1.96 1.33-1.96 2.7v5.21H9.08z" />
    </svg>
  );
}

// Plain black icon row (no border) — order matches the mockup: X, LinkedIn,
// mail. hrefs from footer.links.
const SOCIAL_LINKS = [
  { href: links.twitter.href, label: copy.social.twitter, icon: <XIcon /> },
  { href: links.linkedin.href, label: copy.social.linkedin, icon: <LinkedInIcon /> },
  { href: links.email.href, label: copy.social.email, icon: <Mail size={20} strokeWidth={1.75} aria-hidden="true" /> },
];

// Case studies listed under Works — every project in lib/projects.ts, then
// Extras last (it isn't a Project, see ExtrasCard.tsx, but has its own case
// study at /extras).
const WORK_LINKS = [
  ...PROJECTS.map((project) => ({ href: `/${project.slug}`, label: project.title })),
  { href: "/extras", label: copy.extras },
];

/** The hand-drawn oval around an opened heading/case study, pen-drawn on
 * (pathLength 0 → 1) when `drawn` turns true and un-drawn when it turns
 * false. Opacity rides along so a zero-length path's round cap doesn't leave
 * a dot behind. Instant under reduced motion. */
function DrawnOval({ seed, drawn }: { seed: number; drawn: boolean }) {
  const path = useMemo(() => buildWobblyPillPath(seed), [seed]);
  const reduced = useReducedMotion();
  return (
    <svg className={styles.oval} viewBox={PILL_VIEW_BOX} fill="none" preserveAspectRatio="none" aria-hidden="true">
      <motion.path
        d={path}
        stroke={PILL_STROKE_COLOR}
        strokeWidth={PILL_STROKE_WIDTH}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: drawn ? 1 : 0, opacity: drawn ? 1 : 0 }}
        transition={
          reduced
            ? { duration: 0 }
            : {
                pathLength: slowTransition({ duration: OVAL_DRAW_S, ease: "easeOut" as const }),
                opacity: slowTransition({ duration: 0.01, delay: drawn ? 0 : OVAL_DRAW_S }),
              }
        }
      />
    </svg>
  );
}

/** Dropdown chevron: points down when closed (or up for a case study, which
 * opens upward), turns CHEVRON_OPEN_DEG when open. */
function Chevron({ open, up = false }: { open: boolean; up?: boolean }) {
  const reduced = useReducedMotion();
  const rest = up ? 180 : 0;
  return (
    <motion.span
      className={styles.chevron}
      initial={false}
      animate={{ rotate: rest + (open ? CHEVRON_OPEN_DEG : 0) }}
      transition={reduced ? { duration: 0 } : slowTransition({ duration: CHEVRON_TURN_S, ease: "easeOut" as const })}
      aria-hidden="true"
    >
      <ChevronDown size={14} strokeWidth={1.75} />
    </motion.span>
  );
}

/** A heading with a dropdown (Experience, Works): the heading text and its
 * chevron are one button, circled while open. */
function DropdownGroup({ title, seed, children }: { title: string; seed: number; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const listId = useId();
  return (
    <div className={styles.group}>
      <button
        type="button"
        className={styles.headingButton}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <DrawnOval seed={seed} drawn={open} />
        {title}
        <Chevron open={open} />
      </button>
      {open && (
        <ul id={listId} className={styles.items}>
          {children}
        </ul>
      )}
    </div>
  );
}

export default function Sidebar({ mode, onModeChange }: SidebarProps) {
  // Which case study's chevron is "open". TODO(step 6): this is what will
  // raise the project's hover/click preview from the bottom of the stage
  // (brief Part 3.1); for now it only circles the row and turns the chevron.
  const [previewHref, setPreviewHref] = useState<string | null>(null);

  return (
    <aside className={styles.sidebar}>
      {/* Top section: name + intro, links, Experience — equal spacing. */}
      <div className={styles.top}>
        <div className={styles.identity}>
          <h1 className={styles.name}>{copy.name}</h1>
          <p className={styles.intro}>{copy.intro}</p>
        </div>

        <ul className={styles.socialRow} aria-label={copy.social.label}>
          {SOCIAL_LINKS.map((link) => (
            <li key={link.href}>
              <a
                className={styles.socialIcon}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
              >
                {link.icon}
              </a>
            </li>
          ))}
        </ul>

        <DropdownGroup title={copy.experience.heading} seed={20}>
          {copy.experience.items.map((item) => (
            <li key={item} className={styles.item}>
              {item}
            </li>
          ))}
        </DropdownGroup>
      </div>

      {/* Bottom section: Works (case studies), About, Play. */}
      <nav className={styles.bottom} aria-label="Main">
        <DropdownGroup title={copy.nav.works} seed={21}>
          {WORK_LINKS.map((link, i) => {
            const active = previewHref === link.href;
            return (
              <li key={link.href} className={styles.item}>
                <span className={styles.caseStudy}>
                  <DrawnOval seed={30 + i} drawn={active} />
                  <Link href={link.href} className={styles.itemLink}>
                    {link.label}
                  </Link>
                  <button
                    type="button"
                    className={styles.chevronButton}
                    aria-pressed={active}
                    aria-label={`${copy.preview} ${link.label}`}
                    onClick={() => setPreviewHref(active ? null : link.href)}
                  >
                    <Chevron open={active} up />
                  </button>
                </span>
              </li>
            );
          })}
        </DropdownGroup>
        <Link href="/about" className={styles.headingLink}>
          {copy.nav.about}
        </Link>
        <Link href="/playground" className={styles.headingLink}>
          {copy.nav.play}
        </Link>
      </nav>

      <div className={styles.modeToggle} role="group" aria-label={copy.modes.label}>
        {(["jar", "work"] as const).map((m) => (
          <button
            key={m}
            type="button"
            className={`${styles.modeButton} ${mode === m ? styles.modeButtonActive : ""}`}
            aria-pressed={mode === m}
            onClick={() => onModeChange(m)}
          >
            {copy.modes[m]}
          </button>
        ))}
      </div>
    </aside>
  );
}

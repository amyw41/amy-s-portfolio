"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import styles from "./Sidebar.module.css";
import { content } from "@/lib/content";
import { PROJECTS } from "@/lib/projects";

const copy = content.en.sidebar;
const links = content.en.footer.links;

export type HomeMode = "jar" | "work";

interface SidebarProps {
  mode: HomeMode;
  onModeChange: (mode: HomeMode) => void;
  /** The case study being hovered/focused in Works (its slug), or null. */
  onCaseFocus: (id: string | null) => void;
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

// Drawn edge to edge of its viewBox (the mark has no built-in padding), so
// it reads as the same size as X and the envelope next to it.
function LinkedInIcon() {
  return (
    <svg viewBox="3.5 3.4 16.5 16.2" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M5.34 3.5a1.92 1.92 0 1 1 0 3.84 1.92 1.92 0 0 1 0-3.84zM3.68 8.9h3.32v10.6H3.68zM9.08 8.9h3.18v1.45h.05c.44-.84 1.53-1.73 3.16-1.73 3.38 0 4 2.22 4 5.11v5.77h-3.32v-5.12c0-1.22-.02-2.79-1.7-2.79-1.7 0-1.96 1.33-1.96 2.7v5.21H9.08z" />
    </svg>
  );
}

// Plain black icon row (no border), at the very top of the sidebar — order
// matches the mockup: X, LinkedIn, mail. hrefs from footer.links.
const SOCIAL_LINKS = [
  { href: links.twitter.href, label: copy.social.twitter, icon: <XIcon /> },
  { href: links.linkedin.href, label: copy.social.linkedin, icon: <LinkedInIcon /> },
  { href: links.email.href, label: copy.social.email, icon: <Mail size={20} strokeWidth={1.75} aria-hidden="true" /> },
];

// Case studies listed under Works, names only — every project in
// lib/projects.ts, then Extras last (it isn't a Project, see ExtrasCard.tsx,
// but has its own case study at /extras). `id` is the project's slug — also
// its jar item's id and its work-mode tile's id.
const WORK_LINKS = [
  ...PROJECTS.map((project) => ({ id: project.slug, href: `/${project.slug}`, label: project.title })),
  { id: "extras", href: "/extras", label: copy.extras },
];

/** One of the menu's always-open groups: a medium-weight heading with its
 * items listed under it. */
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.group}>
      <h2 className={styles.heading}>{title}</h2>
      <ul className={styles.items}>{children}</ul>
    </div>
  );
}

export default function Sidebar({ mode, onModeChange, onCaseFocus }: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
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

      {/* The name and description as one paragraph — no separate title. */}
      <h1 className={styles.intro}>
        {copy.name} {copy.intro}
      </h1>

      <nav className={styles.nav} aria-label="Main">
        <Group title={copy.nav.works}>
          {WORK_LINKS.map((link) => (
            <li key={link.href}>
              {/* Hovering or keyboard-focusing a case study isolates it on
               * the stage (its jar item lifts, the rest dim — Home). */}
              <Link
                href={link.href}
                className={styles.itemLink}
                onPointerEnter={() => onCaseFocus(link.id)}
                onPointerLeave={() => onCaseFocus(null)}
                onFocus={(e) => {
                  if (e.currentTarget.matches(":focus-visible")) onCaseFocus(link.id);
                }}
                onBlur={() => onCaseFocus(null)}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </Group>

        <Group title={copy.nav.extra}>
          <li>
            <Link href="/about" className={styles.itemLink}>
              {copy.nav.about}
            </Link>
          </li>
          <li>
            <Link href="/playground" className={styles.itemLink}>
              {copy.nav.play}
            </Link>
          </li>
        </Group>

        <Group title={copy.experience.heading}>
          {copy.experience.items.map((item) => (
            <li key={item} className={styles.item}>
              {item}
            </li>
          ))}
        </Group>
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

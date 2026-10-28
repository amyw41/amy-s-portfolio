"use client";

import { useEffect, useId, useRef, useState, type FocusEvent, type PointerEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./Sidebar.module.css";
import { content } from "@/lib/content";
import { PROJECTS } from "@/lib/projects";
import { HOVER_CLOSE_DELAY_MS, WORK_HOVER_OPEN_MS } from "@/lib/motion";

const copy = content.en.sidebar;
const links = content.en.footer.links;

export type HomeMode = "jar" | "work";

interface SidebarProps {
  mode: HomeMode;
  onModeChange: (mode: HomeMode) => void;
}

// Icon-only social bar under the name. Same logo files as the old hero's
// top bar; hrefs from footer.links.
const SOCIAL_LINKS = [
  { href: links.linkedin.href, label: copy.social.linkedin, src: "/images/logos/linkedin.png", size: 176 },
  { href: links.twitter.href, label: copy.social.twitter, src: "/images/logos/twitter.png", size: 155 },
  { href: links.email.href, label: copy.social.email, src: "/images/logos/gmail.png", size: 172 },
];

// Case studies listed under "projects" — every project in lib/projects.ts, then
// Extras last (it isn't a Project, see ExtrasCard.tsx, but has its own case
// study at /extras).
const WORK_LINKS = [
  ...PROJECTS.map((project) => ({ href: `/${project.slug}`, label: project.title })),
  { href: "/extras", label: copy.extras },
];

/**
 * "projects" opens three ways, tracked separately so one closing can't cancel
 * another:
 * - hover (mouse only), with intent: opens WORK_HOVER_OPEN_MS after the
 *   pointer enters the whole projects area (button + list), closes
 *   HOVER_CLOSE_DELAY_MS after it leaves — so moving down into the list, or
 *   briefly brushing past, doesn't flicker it.
 * - click/tap, which pins it open until clicked again (or Escape). Touch has
 *   no hover, so this is how it opens there.
 * - keyboard focus anywhere inside the projects area.
 */
function useWorkDisclosure() {
  const [hoverOpen, setHoverOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  };
  useEffect(() => clearTimer, []);

  return {
    open: hoverOpen || pinned || focusOpen,
    areaProps: {
      onPointerEnter: (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        clearTimer();
        timerRef.current = window.setTimeout(() => setHoverOpen(true), WORK_HOVER_OPEN_MS);
      },
      onPointerLeave: (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        clearTimer();
        timerRef.current = window.setTimeout(() => setHoverOpen(false), HOVER_CLOSE_DELAY_MS);
      },
      // :focus-visible rather than every focus — a mouse click focuses the
      // button too, and that shouldn't count as "opened by keyboard" (it
      // would keep the list open after unpinning it with a second click).
      onFocus: (e: FocusEvent) => {
        if ((e.target as HTMLElement).matches(":focus-visible")) setFocusOpen(true);
      },
      onBlur: (e: FocusEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusOpen(false);
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key !== "Escape") return;
        setPinned(false);
        setHoverOpen(false);
        setFocusOpen(false);
      },
    },
    togglePinned: () => {
      // Clicking while it's only hover-open pins it (it's already showing,
      // closing it on that click would feel like the click undid itself).
      if (!pinned && hoverOpen) setPinned(true);
      else setPinned((v) => !v);
    },
  };
}

export default function Sidebar({ mode, onModeChange }: SidebarProps) {
  const work = useWorkDisclosure();
  const workListId = useId();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.identity}>
        <h1 className={styles.name}>{copy.name}</h1>
        <ul className={styles.socialBar} aria-label={copy.social.label}>
          {SOCIAL_LINKS.map((link) => (
            <li key={link.href}>
              <a
                className={styles.socialIcon}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
              >
                <Image src={link.src} alt="" width={link.size} height={link.size} draggable={false} />
              </a>
            </li>
          ))}
        </ul>
        <p className={styles.intro}>{copy.intro}</p>
        <p className={styles.intro}>{copy.currently}</p>
      </div>

      <nav className={styles.nav} aria-label="Main">
        <div className={styles.group}>
          <h2 className={styles.groupHeading}>{copy.nav.works}</h2>
          <div className={styles.groupItems}>
            <div className={styles.workArea} {...work.areaProps}>
              <button
                type="button"
                className={styles.navItem}
                aria-expanded={work.open}
                aria-controls={workListId}
                onClick={work.togglePinned}
              >
                {copy.nav.projects}
              </button>
              {work.open && (
                <ul id={workListId} className={styles.workList}>
                  {WORK_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className={styles.smallItem}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className={styles.group}>
          <h2 className={styles.groupHeading}>{copy.nav.other}</h2>
          <div className={styles.groupItems}>
            <Link href="/about" className={styles.navItem}>
              {copy.nav.about}
            </Link>
            <Link href="/playground" className={styles.navItem}>
              {copy.nav.play}
            </Link>
          </div>
        </div>
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

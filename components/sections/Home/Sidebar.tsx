"use client";

import { useEffect, useId, useMemo, useRef, useState, type FocusEvent, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { ChevronDown, Mail } from "lucide-react";
import styles from "./Sidebar.module.css";
import { content } from "@/lib/content";
import { PROJECTS } from "@/lib/projects";
import {
  CASE_ROW_GROW_S,
  CHEVRON_OPEN_DEG,
  CHEVRON_TURN_S,
  DROPDOWN_CLOSE_S,
  DROPDOWN_ITEM_DROP_PX,
  DROPDOWN_ITEM_STAGGER_S,
  DROPDOWN_OPEN_S,
  ERASE_CHAR_MS,
  OVAL_DRAW_S,
  slowMs,
  slowTransition,
  TYPE_CHAR_MS,
} from "@/lib/motion";
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

// Drawn edge to edge of its viewBox (the mark has no built-in padding), so
// it reads as the same size as X and the envelope next to it.
function LinkedInIcon() {
  return (
    <svg viewBox="3.5 3.4 16.5 16.2" width="18" height="18" fill="currentColor" aria-hidden="true">
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
  ...PROJECTS.map((project) => ({ href: `/${project.slug}`, label: project.title, description: project.description })),
  { href: "/extras", label: copy.extras, description: content.en.projects.extras.description },
];

/** Hover/keyboard-focus tracking for a heading — drives its DrawnOval.
 * :focus-visible only, so a mouse click (which also focuses the button)
 * doesn't leave the oval drawn after the pointer has left. */
function useHoverOval() {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  return {
    drawn: hovered || focused,
    props: {
      onPointerEnter: () => setHovered(true),
      onPointerLeave: () => setHovered(false),
      onFocus: (e: FocusEvent<HTMLElement>) => setFocused(e.currentTarget.matches(":focus-visible")),
      onBlur: () => setFocused(false),
    },
  };
}

/** The hand-drawn oval around a hovered heading, pen-drawn on (pathLength
 * 0 → 1) when `drawn` turns true and un-drawn when it turns false. Opacity
 * rides along so a zero-length path's round cap doesn't leave a dot behind.
 * Instant under reduced motion. */
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
        initial={false}
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

/** Dropdown chevron: points down when closed, turns CHEVRON_OPEN_DEG when
 * open. */
function Chevron({ open }: { open: boolean }) {
  const reduced = useReducedMotion();
  return (
    <motion.span
      className={styles.chevron}
      initial={false}
      animate={{ rotate: open ? CHEVRON_OPEN_DEG : 0 }}
      transition={reduced ? { duration: 0 } : slowTransition({ duration: CHEVRON_TURN_S, ease: "easeOut" as const })}
      aria-hidden="true"
    >
      <ChevronDown size={14} strokeWidth={1.75} />
    </motion.span>
  );
}

// Opening: the list grows while its items fade down into place one after
// another. Closing: everything goes at once, quicker. Durations are scaled
// by ?slow where the variants are built (dropdownVariants below).
function dropdownVariants(reduced: boolean): { list: Variants; item: Variants } {
  if (reduced) {
    return {
      list: { open: { height: "auto" }, closed: { height: 0 } },
      item: { open: { opacity: 1, y: 0 }, closed: { opacity: 0, y: 0 } },
    };
  }
  const open = slowTransition({ duration: DROPDOWN_OPEN_S, ease: "easeOut" as const });
  const close = slowTransition({ duration: DROPDOWN_CLOSE_S, ease: "easeIn" as const });
  return {
    list: {
      open: {
        height: "auto",
        transition: { ...open, staggerChildren: slowTransition({ duration: DROPDOWN_ITEM_STAGGER_S }).duration },
      },
      closed: { height: 0, transition: close },
    },
    item: {
      open: { opacity: 1, y: 0, transition: open },
      closed: { opacity: 0, y: -DROPDOWN_ITEM_DROP_PX, transition: close },
    },
  };
}

/** A heading with a dropdown (Experience, Works): the heading text and its
 * chevron are one button. Starts open. */
function DropdownGroup({ title, seed, items }: { title: string; seed: number; items: ReactNode[] }) {
  const [open, setOpen] = useState(true);
  const listId = useId();
  const oval = useHoverOval();
  const reduced = useReducedMotion() ?? false;
  const variants = useMemo(() => dropdownVariants(reduced), [reduced]);

  return (
    <div className={styles.group}>
      <button
        type="button"
        className={styles.heading}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        {...oval.props}
      >
        <DrawnOval seed={seed} drawn={oval.drawn} />
        {title}
        <Chevron open={open} />
      </button>
      {/* initial={false}: lists that start open don't animate in on load. */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            key="list"
            id={listId}
            className={styles.items}
            variants={variants.list}
            initial="closed"
            animate="open"
            exit="closed"
          >
            {items.map((item, i) => (
              <motion.li key={i} className={styles.item} variants={variants.item}>
                {item}
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/** A case study under Works. At rest it's just the name. Hovering (or
 * keyboard-focusing) the row types " - description" out after it, one
 * character every TYPE_CHAR_MS with a blinking caret, wrapping onto extra
 * lines; leaving erases it backwards, faster. Moving from one row to the
 * next erases the old one while the new one types. Under reduced motion the
 * description just appears and disappears.
 *
 * The row's height follows its content through a ResizeObserver and eases
 * to each new height (CASE_ROW_GROW_S), so a new line pushes the rows below
 * down gently instead of in one-line jumps. */
function CaseStudyRow({ href, label, description }: { href: string; label: string; description: string }) {
  const reduced = useReducedMotion();
  const full = ` - ${description}`;
  const [active, setActive] = useState(false);
  const [count, setCount] = useState(0);
  const [height, setHeight] = useState<number | null>(null);
  const contentRef = useRef<HTMLSpanElement>(null);

  // Steps `count` one character at a time toward the target (all of it
  // while active, none otherwise). setState only ever runs in the timer
  // callback, never in the effect body.
  useEffect(() => {
    const target = active ? full.length : 0;
    if (count === target) return;
    const delay = reduced ? 0 : slowMs(active ? TYPE_CHAR_MS : ERASE_CHAR_MS);
    const timer = window.setTimeout(() => {
      setCount((c) => (reduced ? target : c + Math.sign(target - c)));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [active, count, full.length, reduced]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const typing = active && count < full.length;

  return (
    <motion.div
      className={styles.caseRow}
      initial={false}
      animate={height === null ? undefined : { height }}
      transition={reduced ? { duration: 0 } : slowTransition({ duration: CASE_ROW_GROW_S, ease: "easeOut" as const })}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => setActive(false)}
    >
      <span ref={contentRef} className={styles.caseRowContent}>
        <Link
          href={href}
          className={styles.itemLink}
          // The typed text is decoration; screen readers get it whole.
          aria-label={`${label}${full}`}
          onFocus={(e) => {
            if (e.currentTarget.matches(":focus-visible")) setActive(true);
          }}
          onBlur={() => setActive(false)}
        >
          {label}
          <span className={styles.itemDescription} aria-hidden="true">
            {full.slice(0, count)}
          </span>
          {typing && <span className={styles.caret} aria-hidden="true" />}
        </Link>
      </span>
    </motion.div>
  );
}

/** About / Play: a top-level heading that's just a link. */
function HeadingLink({ href, label, seed }: { href: string; label: string; seed: number }) {
  const oval = useHoverOval();
  return (
    <Link href={href} className={styles.heading} {...oval.props}>
      <DrawnOval seed={seed} drawn={oval.drawn} />
      {label}
    </Link>
  );
}

export default function Sidebar({ mode, onModeChange }: SidebarProps) {
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

        <DropdownGroup title={copy.experience.heading} seed={20} items={[...copy.experience.items]} />
      </div>

      {/* Bottom section: Works (case studies), About, Play. */}
      <nav className={styles.bottom} aria-label="Main">
        <DropdownGroup
          title={copy.nav.works}
          seed={21}
          items={WORK_LINKS.map((link) => (
            <CaseStudyRow key={link.href} href={link.href} label={link.label} description={link.description} />
          ))}
        />
        <HeadingLink href="/about" label={copy.nav.about} seed={22} />
        <HeadingLink href="/playground" label={copy.nav.play} seed={23} />
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

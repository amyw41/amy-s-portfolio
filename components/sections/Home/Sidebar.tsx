"use client";

import { useId, useMemo, useState, type FocusEvent, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { ChevronDown, Mail } from "lucide-react";
import styles from "./Sidebar.module.css";
import { content } from "@/lib/content";
import { PROJECTS } from "@/lib/projects";
import {
  CHEVRON_OPEN_DEG,
  CHEVRON_TURN_S,
  DROPDOWN_CLOSE_S,
  DROPDOWN_ITEM_DROP_PX,
  DROPDOWN_ITEM_STAGGER_S,
  DROPDOWN_OPEN_S,
  OVAL_DRAW_S,
  slowTransition,
} from "@/lib/motion";
import { buildWobblyPillPath, LINE_STROKE_WIDTH, PILL_VIEW_BOX } from "@/lib/wobbly";
import BuzzPath from "@/components/ui/BuzzPath";

const copy = content.en.sidebar;
const links = content.en.footer.links;

export type HomeMode = "jar" | "work";

interface SidebarProps {
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

// Case studies listed under Works — every project in lib/projects.ts, then
// Extras last (it isn't a Project, see ExtrasCard.tsx, but has its own case
// study at /extras). `id` is the project's slug — also its jar item's id and
// its work-mode tile's id.
const WORK_LINKS = [
  ...PROJECTS.map((project) => ({
    id: project.slug,
    href: `/${project.slug}`,
    label: project.title,
    description: project.description,
  })),
  { id: "extras", href: "/extras", label: copy.extras, description: content.en.projects.extras.description },
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

/** The hand-drawn oval around a hovered heading: buzzes while it's
 * visible, pen-drawn on (pathLength 0 → 1) when `drawn` turns true and
 * un-drawn when it turns false. Instant under reduced motion (BuzzPath). */
function DrawnOval({ seed, drawn }: { seed: number; drawn: boolean }) {
  const variants = useMemo(() => [0, 1, 2].map((v) => buildWobblyPillPath(seed, 1, v)), [seed]);
  return (
    <BuzzPath
      className={styles.oval}
      variants={variants}
      viewBox={PILL_VIEW_BOX}
      preserveAspectRatio="none"
      strokeWidth={LINE_STROKE_WIDTH}
      drawn={drawn}
      drawDuration={OVAL_DRAW_S}
    />
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

/** A case study under Works: the name, then " - description" in full,
 * wrapping onto extra lines under the name. Hovering or keyboard-focusing
 * it isolates that project on the stage (onFocusChange → Home). */
function CaseStudyRow({
  href,
  label,
  description,
  onFocusChange,
}: {
  href: string;
  label: string;
  description: string;
  onFocusChange: (active: boolean) => void;
}) {
  return (
    <Link
      href={href}
      className={styles.itemLink}
      onPointerEnter={() => onFocusChange(true)}
      onPointerLeave={() => onFocusChange(false)}
      onFocus={(e) => {
        if (e.currentTarget.matches(":focus-visible")) onFocusChange(true);
      }}
      onBlur={() => onFocusChange(false)}
    >
      <span className={styles.itemName}>{label}</span>
      <span className={styles.itemDescription}> - {description}</span>
    </Link>
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

export default function Sidebar({ onCaseFocus }: SidebarProps) {
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

      {/* Name + intro, centred in the space between the icons and the menu
       * (equal gaps above and below — Sidebar.module.css .identity). */}
      <div className={styles.identity}>
        <h1 className={styles.name}>{copy.name}</h1>
        <p className={styles.intro}>{copy.intro}</p>
      </div>

      <nav className={styles.menu} aria-label="Main">
        <div className={styles.experience}>
          <DropdownGroup title={copy.experience.heading} seed={20} items={[...copy.experience.items]} />
        </div>
        <DropdownGroup
          title={copy.nav.works}
          seed={21}
          items={WORK_LINKS.map((link) => (
            <CaseStudyRow
              key={link.href}
              href={link.href}
              label={link.label}
              description={link.description}
              onFocusChange={(active) => onCaseFocus(active ? link.id : null)}
            />
          ))}
        />
        <HeadingLink href="/about" label={copy.nav.about} seed={22} />
        <HeadingLink href="/playground" label={copy.nav.play} seed={23} />
      </nav>
    </aside>
  );
}

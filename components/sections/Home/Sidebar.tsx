"use client";

import { memo, useId, useMemo, useState, type CSSProperties, type FocusEvent, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { ChevronDown, Mail } from "lucide-react";
import styles from "./Sidebar.module.css";
import { content } from "@/lib/content";
import { PROJECTS } from "@/lib/projects";
import {
  ARROW_HOVER_DEG,
  CHEVRON_OPEN_DEG,
  CHEVRON_TURN_S,
  DROPDOWN_CLOSE_S,
  DROPDOWN_ITEM_DROP_PX,
  DROPDOWN_ITEM_STAGGER_S,
  DROPDOWN_OPEN_S,
  OVAL_DRAW_S,
  slowTransition,
} from "@/lib/motion";
import { buildWobblyLinePath, buildWobblyPillPath, LINE_STROKE_WIDTH, PILL_VIEW_BOX } from "@/lib/wobbly";
import BuzzPath from "@/components/ui/BuzzPath";
import { useCaseZoom } from "@/components/ui/CaseZoom";
import { FoilGlow, FoilText, foilHostLight, foilHostText, useFoil } from "@/components/ui/Foil";

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
 * chevron are one button. Starts closed unless `defaultOpen`. */
function DropdownGroup({
  title,
  seed,
  items,
  defaultOpen = false,
}: {
  title: string;
  seed: number;
  items: ReactNode[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
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

// The ↗ after each case study's name: two hand-ruled strokes (shaft, then
// the head's corner) in an ARROW_SIZE box, low wobble like the jar's ink.
const ARROW_SIZE = 9;
const ARROW_STROKE = 1;
const ARROW_PATHS = [
  buildWobblyLinePath(120, [1, ARROW_SIZE - 1], [ARROW_SIZE - 1, 1], 0.2),
  buildWobblyLinePath(121, [2.5, 1], [ARROW_SIZE - 1, 1], 0.15) +
    " " +
    buildWobblyLinePath(122, [ARROW_SIZE - 1, 1], [ARROW_SIZE - 1, ARROW_SIZE - 2.5], 0.15),
];

// The hover turn's angle and speed, for the CSS (Sidebar.module.css).
const ARROW_VARS = {
  "--arrow-turn": `${ARROW_HOVER_DEG}deg`,
  "--arrow-turn-ms": `${CHEVRON_TURN_S * 1000}ms`,
} as CSSProperties;

function UpRightArrow() {
  return (
    <svg
      className={styles.itemArrow}
      style={ARROW_VARS}
      width={ARROW_SIZE}
      height={ARROW_SIZE}
      viewBox={`0 0 ${ARROW_SIZE} ${ARROW_SIZE}`}
      fill="none"
      aria-hidden="true"
    >
      {ARROW_PATHS.map((d, i) => (
        <path key={i} d={d} stroke="currentColor" strokeWidth={ARROW_STROKE} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

/** A case study under Works: the name, then a small hand-drawn ↗ that
 * turns to point straight right while the row is hovered (the project's
 * description is in the data but no longer shown here). Hovering
 * or keyboard-focusing it isolates that project on the stage
 * (onFocusChange → Home). */
function CaseStudyRow({
  href,
  label,
  seed,
  onFocusChange,
}: {
  href: string;
  label: string;
  seed: number;
  onFocusChange: (active: boolean) => void;
}) {
  const zoom = useCaseZoom();
  // The foil hover on the name (components/ui/Foil), as on the icons.
  const foil = useFoil(seed);
  return (
    <Link
      href={href}
      className={`${styles.itemLink} ${styles.caseLink}`}
      // Zooms into the case study (components/ui/CaseZoom) from its jar
      // item, or its work-view card; Extras (no item, no card) navigates.
      onClick={(e) => {
        if (!zoom || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        const project = PROJECTS.find((p) => `/${p.slug}` === href);
        if (!project) return;
        const from =
          document.querySelector<HTMLElement>(`[data-jar-item="${project.slug}"]`) ??
          document.querySelector<HTMLElement>(`[data-work-card="${project.slug}"] [class*="cover"]`);
        if (from && zoom.start({ href, slug: project.slug, from, src: project.cover })) e.preventDefault();
      }}
      onPointerEnter={(e) => {
        onFocusChange(true);
        foil.handlers.onPointerEnter(e);
      }}
      onPointerMove={foil.handlers.onPointerMove}
      onPointerLeave={(e) => {
        onFocusChange(false);
        foil.handlers.onPointerLeave(e);
      }}
      onFocus={(e) => {
        if (e.currentTarget.matches(":focus-visible")) onFocusChange(true);
      }}
      onBlur={() => onFocusChange(false)}
    >
      <span className={`${styles.itemName} ${foilHostText}`}>
        {label}
        <FoilText foil={foil}>{label}</FoilText>
      </span>
      <UpRightArrow />
    </Link>
  );
}

/** A line under Experience: the role, then the company name as a link to
 * its site (new tab), with the foil hover (components/ui/Foil) on it. */
function ExperienceRow({ role, company, href, seed }: { role: string; company: string; href: string; seed: number }) {
  const foil = useFoil(seed);
  return (
    <>
      {role} @{" "}
      <a
        className={`${styles.companyLink} ${foilHostText}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        {...foil.handlers}
      >
        {company}
        <FoilText foil={foil}>{company}</FoilText>
      </a>
    </>
  );
}

/** A page under Extra (About Me, Play), with the foil hover on its name
 * (components/ui/Foil) instead of a grey fade. */
function ExtraLink({ href, label, seed }: { href: string; label: string; seed: number }) {
  const foil = useFoil(seed);
  return (
    <Link href={href} className={`${styles.itemLink} ${styles.foilLink}`} {...foil.handlers}>
      <span className={foilHostText}>
        {label}
        <FoilText foil={foil}>{label}</FoilText>
      </span>
    </Link>
  );
}

// Where the intro breaks onto its next line on desktop, so it reads as
// Amy laid it out: "…builds as the user." / "She adds charm to intuitive" /
// "experiences and loves to overthink interactions!" (the sidebar is sized
// so the longest line fits). On mobile the breaks are hidden and it wraps
// naturally. A phrase that's no longer in the copy just gets no break.
const INTRO_BREAKS_AFTER: string[] = [];

function introLines(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let rest = text;
  INTRO_BREAKS_AFTER.forEach((phrase, i) => {
    const at = rest.indexOf(phrase);
    if (at === -1) return;
    const end = at + phrase.length;
    // The space stays: dropped at the start of a line on desktop, and
    // between the words on mobile, where the break is hidden.
    parts.push(rest.slice(0, end), <br key={i} className={styles.introBreak} />);
    rest = rest.slice(end);
  });
  parts.push(rest);
  return parts;
}

/** One icon in the top row, with the foil hover (useFoil). */
function SocialIcon({ href, label, icon, seed }: { href: string; label: string; icon: ReactNode; seed: number }) {
  const foil = useFoil(seed);
  return (
    <li>
      <a
        className={`${styles.socialIcon} ${foilHostLight}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        {...foil.handlers}
      >
        {icon}
        <FoilGlow foil={foil} />
      </a>
    </li>
  );
}

// Memoised: Home re-renders on every mode switch, and re-rendering every
// motion component in here at that moment was a visible hitch. Its only
// prop is a stable state setter.
export default memo(function Sidebar({ onCaseFocus }: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <ul className={styles.socialRow} aria-label={copy.social.label}>
        {SOCIAL_LINKS.map((link, i) => (
          <SocialIcon key={link.href} {...link} seed={30 + i} />
        ))}
      </ul>

      {/* The name and description as one paragraph — no separate title. */}
      <h1 className={styles.intro}>{introLines(`${copy.name} ${copy.intro}`)}</h1>

      <nav className={styles.menu} aria-label="Main">
        {/* Experience and Works start open; Extra opens on click. */}
        <DropdownGroup
          title={copy.experience.heading}
          seed={20}
          items={copy.experience.items.map((item, i) => (
            <ExperienceRow key={item.company} {...item} seed={50 + i} />
          ))}
          defaultOpen
        />
        <DropdownGroup
          title={copy.nav.works}
          seed={21}
          items={WORK_LINKS.map((link) => (
            <CaseStudyRow
              key={link.href}
              href={link.href}
              label={link.label}
              seed={60 + WORK_LINKS.indexOf(link)}
              onFocusChange={(active) => onCaseFocus(active ? link.id : null)}
            />
          ))}
          defaultOpen
        />
        <DropdownGroup
          title={copy.nav.extra}
          seed={22}
          items={[
            <ExtraLink key="about" href="/about" label={copy.nav.about} seed={70} />,
            <ExtraLink key="play" href="/playground" label={copy.nav.play} seed={71} />,
          ]}
        />
      </nav>
    </aside>
  );
});

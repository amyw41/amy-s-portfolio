"use client";

import { useMemo, useState } from "react";
import styles from "./Projects.module.css";
import CircleToggle from "@/components/ui/CircleToggle";
import ProjectCard from "./ProjectCard";
import ExtrasCard from "./ExtrasCard";
import { useFlipReorder } from "./useFlipReorder";
import { useScrollReveal } from "./useScrollReveal";
import { PROJECTS, PROJECT_CATEGORY_COLOR, type ProjectCategory } from "@/lib/projects";
import { content } from "@/lib/content";

const copy = content.en.projects;

const CATEGORY_ORDER: ProjectCategory[] = ["work", "personal", "hackathon"];
/** Extras has no `category` (see lib/projects.ts's Project type — it isn't
 * even a Project), so it needs an id of its own for FLIP/dimming to key
 * off, outside the slug namespace. */
const EXTRAS_ID = "extras";
/** Same idea, for the scroll-reveal — the heading + filter toggles reveal
 * together as one group, keyed outside the card id namespace. */
const HEADER_ID = "header";

export default function Projects() {
  const [activeCategories, setActiveCategories] = useState<Set<ProjectCategory>>(() => new Set());

  function toggleCategory(category: ProjectCategory) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  // Default order is exactly PROJECTS's own authoring order (lib/projects.ts)
  // plus extras last. Filtering never reshuffles that array directly —
  // instead it stable-*partitions* it by "matches the active filters",
  // which is what guarantees turning every toggle back off (activeCategories
  // empty -> everything "matches") always collapses back to precisely this
  // sequence, with no separate "restore default order" logic needed.
  const displayIds = useMemo(() => {
    const candidates: { id: string; matches: boolean }[] = [
      ...PROJECTS.map((p) => ({
        id: p.slug,
        matches: activeCategories.size === 0 || activeCategories.has(p.category),
      })),
      // Extras never has a category to match — once any filter is active
      // it's always among the demoted/dimmed cards.
      { id: EXTRAS_ID, matches: activeCategories.size === 0 },
    ];
    return candidates
      .map((c, index) => ({ ...c, index })) // Array#sort is spec-stable, but
      .sort((a, b) => Number(b.matches) - Number(a.matches) || a.index - b.index) // this makes that explicit rather than assumed.
      .map((c) => c.id);
  }, [activeCategories]);

  const registerFlipRef = useFlipReorder(displayIds);
  const { registerRef: registerRevealRef, getRevealState } = useScrollReveal();
  const headerReveal = getRevealState(HEADER_ID);

  // Merges FLIP's own ref (position-in-list transform, imperative) with the
  // reveal's (rise-on-first-entry, imperative registration only — the
  // transform itself is applied declaratively via a class, see .reveal in
  // ProjectCard.module.css) onto the same outer DOM node. They never write
  // to the same inline style property, so sharing one node between them is
  // safe — see ProjectCard.module.css's .card/.reveal comment for why.
  function registerCardRef(id: string) {
    return (el: HTMLElement | null) => {
      registerFlipRef(id)(el);
      registerRevealRef(id)(el);
    };
  }

  const dimmedIds = useMemo(() => {
    const dimmed = new Set<string>();
    if (activeCategories.size > 0) {
      for (const p of PROJECTS) {
        if (!activeCategories.has(p.category)) dimmed.add(p.slug);
      }
      dimmed.add(EXTRAS_ID);
    }
    return dimmed;
  }, [activeCategories]);

  const projectsBySlug = useMemo(() => new Map(PROJECTS.map((p) => [p.slug, p])), []);

  return (
    <section id="projects" className={styles.projects}>
      <div className={`pageContainer ${styles.container}`}>
        <div
          ref={registerRevealRef(HEADER_ID)}
          className={`${styles.header} ${headerReveal.revealed ? styles.headerRevealed : ""}`}
          style={{ transitionDelay: `${headerReveal.delayMs}ms` }}
        >
          <h2 className={styles.heading}>{copy.heading}</h2>
          <div className={styles.filters}>
            {CATEGORY_ORDER.map((category) => (
              <CircleToggle
                key={category}
                label={copy.filters[category]}
                color={PROJECT_CATEGORY_COLOR[category]}
                active={activeCategories.has(category)}
                onToggle={() => toggleCategory(category)}
              />
            ))}
          </div>
        </div>

        <div className={styles.list}>
          {displayIds.map((id) => {
            const reveal = getRevealState(id);
            return id === EXTRAS_ID ? (
              <ExtrasCard
                key={id}
                ref={registerCardRef(id)}
                dimmed={dimmedIds.has(id)}
                revealed={reveal.revealed}
                revealDelayMs={reveal.delayMs}
              />
            ) : (
              <ProjectCard
                key={id}
                ref={registerCardRef(id)}
                project={projectsBySlug.get(id)!}
                dimmed={dimmedIds.has(id)}
                revealed={reveal.revealed}
                revealDelayMs={reveal.delayMs}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

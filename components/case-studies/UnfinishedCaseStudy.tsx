"use client";

import { PROJECTS } from "@/lib/projects";
import { UNFINISHED_FACTS } from "@/lib/caseStudyPreview";
import { ConstructionSign } from "@/components/ui/UnderConstruction";
import { CaseStudyHero, CaseStudyLayout } from "./CaseStudyKit";

/**
 * An unfinished case study (lib/underConstruction.ts; Amy's mock,
 * 2026-11-26): the case-study frame with its header in the writing (the
 * caption as the title, the home card's cover in a 3:2 box, the facts under
 * it), then the under-construction sign. A client component so
 * CaseStudyLayout can find the hero among its children.
 */
export default function UnfinishedCaseStudy({ slug }: { slug: string }) {
  const project = PROJECTS.find((p) => p.slug === slug);
  if (!project) return null;
  return (
    <CaseStudyLayout sectionNav={[]}>
      <CaseStudyHero
        title={project.title}
        subtitle={project.description}
        heroSrc={project.cover}
        heroAlt={`${project.title} cover`}
        highlightColor={project.tint}
        meta={UNFINISHED_FACTS[slug] ?? []}
        heroStyle="inline"
      />
      <ConstructionSign />
    </CaseStudyLayout>
  );
}

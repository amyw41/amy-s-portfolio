import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import { PROJECTS } from "@/lib/projects";
import SkinSproutCaseStudy from "@/components/case-studies/SkinSproutCaseStudy";
import CyberSeaCaseStudy from "@/components/case-studies/CyberSeaCaseStudy";
import SpotifyCaseStudy from "@/components/case-studies/SpotifyCaseStudy";
import ExtrasCaseStudy from "@/components/case-studies/ExtrasCaseStudy";

// Keyed by this site's own project slug (lib/projects.ts) — "spotify", not
// jar-portfolio's "spotify-guessr", so this map alone is the single source
// of truth for which projects have a written case study. Every current
// project has one; a future project added to PROJECTS without an entry
// here just 404s (see notFound() below) rather than falling back to a
// generic placeholder shell — there's no such shell on this site, and
// building one wasn't asked for.
//
// "extras" is the one entry here with no matching PROJECTS slug — it has no
// category (see ExtrasCard.tsx's own comment) so it was never a `Project`
// to begin with. generateStaticParams below adds its own path for it
// separately, since the PROJECTS-driven line can't pick it up.
const CASE_STUDIES: Record<string, ComponentType> = {
  skinsprout: SkinSproutCaseStudy,
  cybersea: CyberSeaCaseStudy,
  spotify: SpotifyCaseStudy,
  extras: ExtrasCaseStudy,
};

// Prerenders one static page per project that actually has a case study —
// no point generating a route for a project slug that would just 404.
export function generateStaticParams() {
  const projectSlugs = PROJECTS.filter((project) => project.slug in CASE_STUDIES).map((project) => ({
    slug: project.slug,
  }));
  return [...projectSlugs, { slug: "extras" }];
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const CaseStudy = CASE_STUDIES[slug];
  if (!CaseStudy) notFound();

  return <CaseStudy />;
}

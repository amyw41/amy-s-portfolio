import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import { PROJECTS } from "@/lib/projects";
import SkinSproutCaseStudy from "@/components/case-studies/SkinSproutCaseStudy";
import CyberSeaCaseStudy from "@/components/case-studies/CyberSeaCaseStudy";
import SpotifyCaseStudy from "@/components/case-studies/SpotifyCaseStudy";
// Same global Footer the homepage ends on (app/page.tsx) — per request, case
// studies now end on it too instead of just stopping after the last
// section. It's a plain CSS-Modules component (not Tailwind), so it renders
// fine outside case-study.css's .tw-scope — nothing case-study-specific
// about it, same footer either way.
import Footer from "@/components/sections/Footer";

// Keyed by this site's own project slug (lib/projects.ts) — "spotify", not
// jar-portfolio's "spotify-guessr", so this map alone is the single source
// of truth for which projects have a written case study. Every current
// project has one; a future project added to PROJECTS without an entry
// here just 404s (see notFound() below) rather than falling back to a
// generic placeholder shell — there's no such shell on this site, and
// building one wasn't asked for.
const CASE_STUDIES: Record<string, ComponentType> = {
  skinsprout: SkinSproutCaseStudy,
  cybersea: CyberSeaCaseStudy,
  spotify: SpotifyCaseStudy,
};

// Prerenders one static page per project that actually has a case study —
// no point generating a route for a project slug that would just 404.
export function generateStaticParams() {
  return PROJECTS.filter((project) => project.slug in CASE_STUDIES).map((project) => ({ slug: project.slug }));
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const CaseStudy = CASE_STUDIES[slug];
  if (!CaseStudy) notFound();

  return (
    <>
      <CaseStudy />
      <Footer />
    </>
  );
}

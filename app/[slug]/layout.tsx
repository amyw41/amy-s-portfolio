import "./case-study.css";
import { geist } from "@/lib/fonts";

// case-study.css (Tailwind entry, scoped to this route) is imported here so
// it only ever loads for these project pages, not the rest of the site
// (moved from app/projects/[slug]/ to app/[slug]/ per request, so "this
// route" is now every top-level slug rather than everything under
// /projects/*). No font loading of its own anymore — case-study.css's
// `--font-body` / `--font-instrument` theme values (read by CaseStudyKit's
// `font-body`/`font-instrument` Tailwind classes) now point straight at the
// site's own `--font-roboto` variable (set once, on <html>, by the root
// layout), so every case-study page renders in Roboto like the rest of the
// site instead of the two extra fonts (Instrument Serif, Public Sans) this
// was ported from jar-portfolio with.
//
// The rebrand's case-study frame (CaseStudyKit.tsx's CaseStudyLayout) is set
// in Geist like the home page: its variable goes on this wrapper, and
// case-study.css points the kit's font-body/font-instrument classes at it.
export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return <div className={geist.variable}>{children}</div>;
}

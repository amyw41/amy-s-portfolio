"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { ReactElement, ReactNode } from "react";
import { Children, cloneElement, isValidElement, useEffect, useState } from "react";
import { useAutoPlayInView } from "@/lib/useAutoPlayInView";
import { FADE_IN_TRANSITION } from "@/lib/motion";
import { buildWobblyLinePath, LINE_STROKE_WIDTH } from "@/lib/wobbly";
import BuzzPath from "@/components/ui/BuzzPath";
import FooterStrip from "@/components/ui/FooterStrip";
import { useCaseZoom, ZOOM_TARGET_ATTR } from "@/components/ui/CaseZoom";
import { usePathname } from "next/navigation";
import layoutStyles from "./CaseStudyLayout.module.css";

// Shared building blocks behind every written case study on the site
// (SkinSprout, Spotify Guessr, CyberSea) — extracted so the three don't
// carry independent copies of the same layout system, text styles, and
// sidebar scroll-spy nav. Each case study still owns all of its actual
// content (copy, images, meta/insight data) and its own SECTION_NAV; only
// the presentational shell and primitives live here.
//
// Ported from an older portfolio (jar-portfolio) largely as-is — the
// Tailwind-based layout/animation work was already built and tuned there,
// and hand-converting it to this site's own CSS-Modules system would be a
// high-risk rewrite of animation-heavy, already-correct code for no visual
// benefit. See app/[slug]/case-study.css for how Tailwind is
// scoped to just this route so it can't affect the rest of the site.

// Text system every case study page uses:
//   header    — section number/title (e.g. "01 / Initial Planning"): black, medium, 28px
//   subheader — the sub-label (e.g. "The Problem"): black/60, regular, 24px
//   content   — body copy: black/70, light, 18px
//   frame     — text sitting inside a colorful/placeholder box: black/60, light, 24px
//   groupHeader — mid-section group labels above a cluster of Rows, one
//     notch bolder than subheader so it reads as a grouping label, not just
//     another row in the list
export const TEXT = {
  header: "font-body text-[clamp(22px,2.4vw,28px)] font-medium text-black text-left",
  subheader: "font-body text-[clamp(19px,2vw,24px)] font-normal text-black/60 text-left",
  // Was black/60 — darkened a notch per request ("make the body text a bit
  // darker"); still lighter than the black subheader/header above it.
  content: "font-body text-[clamp(16px,1.45vw,18px)] font-light leading-relaxed text-black/70 text-left",
  frame: "font-body text-[clamp(18px,1.75vw,22px)] font-light text-black/60 text-left",
  groupHeader: "font-body text-[clamp(20px,2.1vw,24px)] font-medium text-black/80 text-left",
};

// Fallback tint behind a placeholder/neutral image box when a case study
// doesn't pass its own — each case study's actual highlight color (Spotify's
// lavender EFEDF5, CyberSea's pale blue e5eef7, SkinSprout's pink faf1f6)
// is supplied per-call via the `highlightColor` prop below rather than this
// shared module hardcoding one project's color as everyone's default.
const DEFAULT_HIGHLIGHT = "#EFEDF5";

// `ratio` is only meaningful for boxes that stand in for a real
// image/screenshot — omit it and the box sizes itself off its own text with
// tight py-[14px] padding instead of a fixed aspect-ratio height.
// `bg` (on by default) is the neutral backdrop for screenshots/diagrams shot
// on white; turn it off for media that already carries its own background
// (e.g. a phone mockup PNG with a transparent/device-framed backdrop baked
// in) so this box doesn't add a second one behind it.
// `video` needs autoplay/muted/loop instead of next/image, but still shares
// this same box (aspect-ratio, rounded corners, optional bg) rather than
// duplicating the wrapper just for one case.
export function CaseStudyImage({
  src,
  alt,
  ratio,
  bg = true,
  video = false,
  highlightColor = DEFAULT_HIGHLIGHT,
  className = "",
  sizes = "(min-width: 768px) 900px, 100vw",
}: {
  src: string;
  alt: string;
  ratio: string;
  bg?: boolean;
  video?: boolean;
  highlightColor?: string;
  className?: string;
  sizes?: string;
}) {
  const videoRef = useAutoPlayInView<HTMLVideoElement>();

  return (
    <div
      style={{ aspectRatio: ratio, backgroundColor: bg ? highlightColor : undefined }}
      // Border removed per request — every case-study image (screenshots,
      // phone mockups, videos alike) went through this one component, so
      // dropping it here removes it everywhere at once.
      className={`relative w-full overflow-hidden rounded-[4px] ${className}`}
    >
      {video ? (
        // No `autoPlay` — see useAutoPlayInView, starts fresh from the
        // beginning once actually scrolled into view instead of on mount.
        <video
          ref={videoRef}
          src={src}
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          // Turbopack's dev-mode image-optimization cache doesn't bust when
          // a file is replaced at the same path (it keeps serving the
          // first-ever encode indefinitely) — case-study images get swapped
          // often during design iteration, so skip the optimizer in dev to
          // always show the current file. Production still gets normal
          // next/image optimization.
          unoptimized={process.env.NODE_ENV !== "production"}
          className="object-cover"
        />
      )}
    </div>
  );
}

export function PlaceholderBox({
  ratio,
  label = "Image placeholder",
  highlightColor = DEFAULT_HIGHLIGHT,
  className = "",
}: {
  ratio?: string;
  label?: string;
  highlightColor?: string;
  className?: string;
}) {
  return (
    <div
      style={{ ...(ratio ? { aspectRatio: ratio } : undefined), backgroundColor: highlightColor }}
      className={`flex w-full items-center justify-center rounded-[8px] px-6 text-center ${TEXT.frame} ${ratio ? "" : "py-[14px]"} ${className}`}
    >
      {label}
    </div>
  );
}

// Rounded, tinted callout box for a single centered line (or two) of text —
// a problem statement, a challenge, a WIP notice. Was independently
// hand-copied at 8 sites across the 3 written case studies (CyberSea x2,
// SkinSprout x3, Spotify x3) with an identical className string, which had
// already drifted once (an earlier rounded-[8px]/px-5 py-6 version had to be
// hand-corrected back to rounded-[5px]/px-5 py-5 at every single site — see
// this repo's own git history) before landing here as one shared component.
// `bg` isn't defaulted the way CaseStudyImage/PlaceholderBox default
// `highlightColor` — every one of the 8 original sites picked its own tint
// (SkinSprout's own HIGHLIGHT constant, or a one-off hex), so callers keep
// choosing it explicitly rather than silently inheriting some new "default"
// tint that never actually appeared in the original 8.
export function HighlightBox({
  children,
  bg,
  className = "",
}: {
  children: ReactNode;
  bg: string;
  className?: string;
}) {
  return (
    <div className={`rounded-[5px] px-5 py-5 ${className}`} style={{ backgroundColor: bg }}>
      <p className="font-body text-[22px] font-light leading-relaxed text-black/60 text-center">{children}</p>
    </div>
  );
}

// Outbound "Check it out on GitHub!" / "Check out the Figma prototype!"
// button — identical className copy-pasted at 3 sites (CyberSea, SkinSprout,
// Spotify), each just varying href/label/highlightColor.
export function CaseStudyCta({
  href,
  highlightColor = DEFAULT_HIGHLIGHT,
  children,
}: {
  href: string;
  highlightColor?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ backgroundColor: highlightColor }}
      className={`block w-full rounded-[8px] px-6 py-[14px] !text-center transition-transform duration-200 hover:scale-[1.01] ${TEXT.frame}`}
    >
      {children}
    </a>
  );
}

// Small 3-column stat callout ("12-15% of global shipping...", "5/5
// completed the flow...") — was defined locally inside SkinSproutCaseStudy
// (for its own 2 uses) while CyberSea independently hand-copied the exact
// same markup for its own "Why does this matter?" block instead of
// importing SkinSprout's version, so a future tweak to one would silently
// never reach the other. `bg` isn't defaulted for the same reason as
// HighlightBox above — every original call site picked its own tint.
export function StatRow({
  stats,
  bg,
}: {
  stats: { stat: string; caption: string }[];
  bg: string;
}) {
  return (
    <div
      className="grid grid-cols-1 gap-6 rounded-[10px] p-6 text-center sm:grid-cols-3 sm:p-8"
      style={{ backgroundColor: bg }}
    >
      {stats.map((s) => (
        <div key={s.stat}>
          <p className="font-body text-[32px] font-medium text-black/90">{s.stat}</p>
          {/* Not TEXT.content directly — it bakes in text-left, which as a
              rule on this same element overrides the parent's text-center
              regardless of class order in the string. */}
          <p className="mt-1 font-body text-[18px] font-light leading-relaxed text-black/60 text-center">
            {s.caption}
          </p>
        </div>
      ))}
    </div>
  );
}

// One row of a case study's 2-col rhythm. `eyebrow` only appears on the
// first row of a numbered section, stacked above `heading`.
//
// Real CSS grid (not flexbox) on purpose: `media` is a grid item spanning
// both columns (md:col-span-2), so grid's own auto-placement puts it in a
// *new grid row* that starts below whichever of the label/content columns
// is taller — not just "24px after the paragraph regardless of what's
// happening in the other column". With flexbox, each column stacked
// independently off its own content, so a full-width image could land right
// under a short label with almost no visual gap, purely by coincidence of
// the two columns' heights nearly matching.
// `after` is for the rare case where more text follows the media — it also
// becomes its own grid row, again positioned correctly regardless of
// media's actual rendered height.
export function Row({
  eyebrow,
  heading,
  headingClassName,
  children,
  media,
  after,
  tight,
}: {
  eyebrow?: string;
  heading: string;
  // Overrides the default TEXT.subheader styling on `heading` — for a
  // heading that should read as the bolder TEXT.header/groupHeader tier
  // instead (e.g. Spotify's "Wireframing").
  headingClassName?: string;
  children?: ReactNode;
  media?: ReactNode;
  after?: ReactNode;
  // Forces the tighter heading-to-children gap even when children is
  // present — for a heading whose very first line reads as one
  // header/subheader pair with it, not two separate ideas.
  tight?: boolean;
}) {
  // Per-block margins instead of one shared grid `gap-y` — needed so
  // tightening one relationship (heading-to-media) can't also tighten a
  // different one (media-to-after) that happens to sit in the very next
  // grid row. A single `gap-y` can't tell those two gaps apart; explicit
  // margins on each block can.
  //
  // `mediaGap`: a heading with no `children` has nothing standing between
  // it and `media` — the media *is* what the heading is labeling, not a
  // separate idea introduced by a paragraph in between. That's a tight
  // header/caption relationship by default, so it gets the smaller gap
  // automatically rather than needing every such Row to opt in
  // individually — but only when children is genuinely absent; if children
  // *is* present, media is following real paragraph text (not the heading
  // directly) and keeps the normal gap.
  //
  // `after` deliberately always keeps the normal 36px gap regardless of
  // `mediaGap`/`tight` — it's real trailing content, not a caption, so
  // squeezing it against `media` the same way would read as cramped rather
  // than related.
  const childrenGap = tight ? "mt-2 md:mt-0" : "mt-[36px] md:mt-0";
  const mediaGap = children ? "mt-[36px]" : "mt-2";
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-[17.5rem_1fr] md:gap-x-6">
        <div className="md:col-start-1">
          {eyebrow && <p className={`${TEXT.header} mb-2`}>{eyebrow}</p>}
          <p className={headingClassName ?? TEXT.subheader}>{heading}</p>
        </div>
        {children && (
          <div className={`min-w-0 md:col-start-2 ${childrenGap} ${TEXT.content}`}>{children}</div>
        )}
        {media && <div className={`md:col-span-2 ${mediaGap}`}>{media}</div>}
        {/* Full width (md:col-span-2, matching `media`) — `after` follows a
            full-width image with no heading of its own beside it, so
            confining it to just the narrow content column (like `children`)
            left it looking squeezed relative to the image directly above
            it. */}
        {after && <div className={`min-w-0 md:col-span-2 mt-[36px] ${TEXT.content}`}>{after}</div>}
      </div>
    </div>
  );
}

// One numbered section (01 Initial Planning, 02 Research, ...) — owns the
// spacing system. Anchored to the page's own 18px body text (TEXT.content):
// 8x18=144px between sections, 4x18=72px between Rows/subsections (Row's
// own gap-y-[36px] handles the 2x tier, between text/media within a
// subsection). One definition here means every case study's section
// spacing can't quietly drift out of sync the way copy-pasting this
// className onto each <section> tag by hand eventually did.
export function Section({ id, children }: { id: string; children: ReactNode }) {
  return (
    <section id={id} className="first-of-type:mt-[30px] md:first-of-type:mt-[64px] mt-[120px] scroll-mt-24 space-y-[72px]">
      {children}
    </section>
  );
}

export function BulletList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="font-body text-[18px] font-light text-black/80 text-left">{title}</p>
      <ul className={`mt-2 space-y-1 ${TEXT.content}`}>
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden="true">–</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type SectionNavItem = { id: string; label: string };

// Which section is currently scrolled into view — "active" means whichever
// Section's own element is the one actually in view right now (these are
// same-page #anchor links, not routes, so there's no pathname to match
// against). rootMargin biases the observer toward a line near the top of
// the viewport (not the full viewport height) so the active link swaps
// roughly when a section's heading reaches the top, not whenever any sliver
// of it is visible.
function useActiveSection(ids: string[]) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const idKey = ids.join(",");

  useEffect(() => {
    const idList = idKey ? idKey.split(",") : [];
    const elements = idList.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [idKey]);

  return activeId;
}

// The rail's numbered contents: one number per section (1, 2, 3…), the
// one in view (useActiveSection) black, each jumping to its section. Plain
// hash links would push a history entry per click, so Back would step
// through them instead of leaving the page: preventDefault + replaceState
// updates the hash without that.
function RailContents({ sectionNav }: { sectionNav: SectionNavItem[] }) {
  const activeId = useActiveSection(sectionNav.map((s) => s.id));
  if (sectionNav.length === 0) return null;
  return (
    <nav aria-label="Sections">
      <ol className={layoutStyles.contents}>
        {sectionNav.map((s, idx) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              title={s.label}
              aria-label={s.label}
              aria-current={activeId === s.id ? "location" : undefined}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" });
                history.replaceState(null, "", `#${s.id}`);
              }}
              className={`${layoutStyles.contentsLink} ${activeId === s.id ? layoutStyles.contentsActive : ""}`}
            >
              {idx + 1}.
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
// Every case study's hero box locks to 3/2 to match the homepage's project
// thumbnail ratio. object-cover (inside CaseStudyImage) crops each source
// video/image to this shape instead of showing it at its own native proportions.
// Not exported — only CaseStudyHero below (in this same file) ever applies it.
const HERO_RATIO = "3/2";

// The hero block — title, subtitle, hero image, and the timeline/team/role/
// skills meta box, rendered (and animated) as one unit: it fades in on
// mount in step with TableOfContents's own fade-in (see TOC_DELAY there),
// so opening a case study reads as everything arriving together rather than
// one piece settling before the next. Takes the hero media's own
// src/alt/video/highlightColor directly (not a pre-built <CaseStudyImage/>
// node) so this component is the one place HERO_RATIO gets applied — a
// case study can't accidentally diverge from it the way it could if each
// page built its own hero image element by hand.
export function CaseStudyHero({
  title,
  titleClassName,
  subtitle,
  heroSrc,
  heroAlt,
  heroVideo = false,
  highlightColor,
  meta,
  tldr,
  layoutPart,
}: {
  title: string;
  // Overrides the default title size below — for SkinSprout, whose own
  // "SkinSprout" title read a bit large next to the rest of its page, per
  // request. Per-call, not a shared shrink: CyberSea/Spotify keep the
  // original shared clamp() untouched.
  titleClassName?: string;
  subtitle: string;
  heroSrc: string;
  heroAlt: string;
  heroVideo?: boolean;
  highlightColor?: string;
  meta: { label: string; values: string[] }[];
  // Short summary shown as its own full-width, standout block right below
  // the meta grid — a skim-friendly "here's the whole thing in one breath"
  // for anyone who won't read all the way down through 01–06. Optional so a
  // page can still opt out, though every current case study passes one.
  tldr?: string;
  /** Set by CaseStudyLayout: "body" renders only the subtitle, meta and
   * TL;DR — the layout draws the title (top) and the hero media (the
   * sticky thumbnail) itself. */
  layoutPart?: "body";
}) {
  const body = layoutPart === "body";
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={FADE_IN_TRANSITION}
    >
      {/* Title and hero media: drawn here only when this hero stands on its
          own; inside CaseStudyLayout the layout draws them (title on top,
          media as the sticky thumbnail). font-light (300) matches the
          homepage's own h1 weight. */}
      {!body && (
        <h1
          className={`font-instrument ${titleClassName ?? "text-[clamp(2.75rem,7.5vw,4.5rem)]"} font-light leading-none tracking-[-0.04em] text-black/90`}
        >
          {title}
        </h1>
      )}
      <p className={`${body ? "" : "mt-3 "}font-body text-[clamp(16px,1.56vw,20px)] font-light text-black/70`}>{subtitle}</p>

      {!body && (
        <div className="mt-8">
          <CaseStudyImage
            src={heroSrc}
            alt={heroAlt}
            ratio={HERO_RATIO}
            video={heroVideo}
            highlightColor={highlightColor}
            sizes="(min-width: 768px) 946px, 100vw"
          />
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 items-start justify-items-center gap-6 rounded-[10px] border border-gray-200 p-6 text-center sm:grid-cols-4">
        {/* Extra bottom padding on every column but the first — added
            per-column instead of bumping the box's own shared p-6, which
            would pad every column (including ones with a single short
            value) and grow the box/border taller than necessary just to
            give the already-tallest columns more breathing room. */}
        {meta.map((m, i) => (
          <div key={m.label} className={`text-center ${i !== 0 ? "pb-3" : ""}`}>
            {/* Matches TEXT.subheader's own size (clamp(19px,2vw,24px), above) per
                request — was clamp(15px,1.5vw,19px). */}
            <p className="font-instrument text-[clamp(19px,2vw,24px)] font-medium tracking-[-0.035em] text-black/80">{m.label}</p>
            {m.values.map((v) => (
              <p key={v} className="mt-1 font-body text-[clamp(14px,1.3vw,17px)] font-light text-black/70">
                {v}
              </p>
            ))}
          </div>
        ))}
      </div>

      {/* TL;DR — deliberately its own block below the meta grid, not folded
          into it: meta is scannable facts (timeline, team, role), this is a
          plain-English summary, so they read as two different kinds of
          "skim this first" content rather than competing for the same box.
          No box/border/fill (per request, that read too heavy) — stands out
          through the bold "TL;DR" label alone; the summary text itself is
          plain TEXT.content, matching every other paragraph on the page
          rather than its own separate size/color (per request). */}
      {tldr && (
        <div className="mt-6 text-left">
          <p className={`${TEXT.header} mb-2`}>TL;DR</p>
          <p className={TEXT.content}>{tldr}</p>
        </div>
      )}
    </motion.div>
  );
}

// The case-study page frame (brief Part 3.3): a thin rail on the left (the
// "aw" logo back home, then numbered contents), the same hand-drawn divider
// as the home page, then the content — the title on top, the hero media as
// a thumbnail that stays put on the left while the sections scroll on the
// right — and the footer strip at the end. Styles: CaseStudyLayout.module.css.
//
// Each case study still renders <CaseStudyHero> first and its sections after
// it, unchanged: this finds the hero among its children and lays its pieces
// out (title, thumbnail, then the rest of it at the top of the right column).
//
// The divider: home's buzzing line (Home/index.tsx), drawn in a box the
// laptop layout's height and stretched to the real one.
const DIVIDER_BOX_W = 12;
const DIVIDER_BOX_H = 664;
const DIVIDER_VARIANTS = [0, 1, 2].map((v) =>
  buildWobblyLinePath(7, [DIVIDER_BOX_W / 2, 0], [DIVIDER_BOX_W / 2, DIVIDER_BOX_H], 1.4, v),
);

type HeroProps = Parameters<typeof CaseStudyHero>[0];

export function CaseStudyLayout({
  sectionNav,
  sidebarExtra,
  children,
}: {
  sectionNav: SectionNavItem[];
  // Shown at the top of the right column (the Extras page's category
  // filters). Optional.
  sidebarExtra?: ReactNode;
  children: ReactNode;
}) {
  const all = Children.toArray(children);
  const heroIndex = all.findIndex((child) => isValidElement(child) && child.type === CaseStudyHero);
  const hero = heroIndex >= 0 ? (all[heroIndex] as ReactElement<HeroProps>) : null;
  const rest = all.filter((_, i) => i !== heroIndex);
  // Arriving by the zoom from the home page: the thumbnail stays hidden
  // while the zoom's copy grows into its spot, then takes over.
  const zoom = useCaseZoom();
  const slug = usePathname().replace(/^\//, "");
  const thumbHidden = !!zoom && zoom.phase !== "idle" && zoom.slug === slug;

  return (
    <div className={`tw-scope ${layoutStyles.frame}`}>
      <aside className={layoutStyles.rail}>
        {/* Placeholder until the real logo exists (brief Part 7). */}
        <Link href="/" className={layoutStyles.logo} aria-label="Amy Wang, home" onClick={() => zoom?.goHome()}>
          aw
        </Link>
        <RailContents sectionNav={sectionNav} />
      </aside>

      <div className={layoutStyles.divider} aria-hidden="true">
        <BuzzPath
          className={layoutStyles.dividerLine}
          variants={DIVIDER_VARIANTS}
          viewBox={`0 0 ${DIVIDER_BOX_W} ${DIVIDER_BOX_H}`}
          preserveAspectRatio="none"
          strokeWidth={LINE_STROKE_WIDTH}
        />
      </div>

      <main className={layoutStyles.content}>
        {hero && (
          <motion.h1
            className={layoutStyles.title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={FADE_IN_TRANSITION}
          >
            {hero.props.title}
          </motion.h1>
        )}
        <div className={layoutStyles.body}>
          {hero && (
            <div
              className={layoutStyles.thumb}
              {...{ [ZOOM_TARGET_ATTR]: slug }}
              style={thumbHidden ? { visibility: "hidden" } : undefined}
            >
              <CaseStudyImage
                src={hero.props.heroSrc}
                alt={hero.props.heroAlt}
                ratio={HERO_RATIO}
                video={hero.props.heroVideo}
                highlightColor={hero.props.highlightColor}
                sizes="(min-width: 768px) 560px, 100vw"
              />
            </div>
          )}
          <div className={`${layoutStyles.sections} text-left`}>
            {sidebarExtra}
            {hero && cloneElement(hero, { layoutPart: "body" })}
            {rest}
          </div>
        </div>
        <FooterStrip className={layoutStyles.footerPlace} />
      </main>
    </div>
  );
}

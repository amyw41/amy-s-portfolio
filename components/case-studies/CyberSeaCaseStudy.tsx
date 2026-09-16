"use client";

import {
  CaseStudyCta,
  CaseStudyHero,
  CaseStudyImage,
  CaseStudyLayout,
  HighlightBox,
  Row,
  Section,
  StatRow,
  TEXT,
  type SectionNavItem,
} from "@/components/case-studies/CaseStudyKit";
import TextHighlight from "@/components/case-studies/TextHighlight";

// CyberSea case study — same shell/primitives as Spotify Guessr (see
// CaseStudyKit.tsx), ported from Amy's old Framer portfolio
// (https://amywang.framer.website, "CyberSea" project) per her request:
// "copy the exact style of the spotify guessr case study and replace the
// images and text and update the highlight color to match this."
//
// A few pieces of copy below were transcribed from a compressed screenshot
// of the old page and were genuinely hard to read at full confidence —
// every one of those spots is marked with a `// CHECK:` comment so they're
// easy to find and fix.

const HIGHLIGHT = "#e7ecf3";

const SECTION_NAV: SectionNavItem[] = [
  { id: "initial-planning", label: "01 Initial Planning" },
  { id: "research", label: "02 Research" },
  { id: "the-solution", label: "03 The Solution" },
  { id: "implementation", label: "04 Implementation" },
  { id: "final-project", label: "05 Final Project" },
  { id: "learnings", label: "06 Learnings" },
];

// CHECK: TEAM/ROLE/SKILLS values are a best-effort read of a very small
// meta box in the source screenshot — worth a second look to confirm.
// TIMELINE is the most confident one since it matches the "1st Overall
// @uOttahacks" project blurb already used on the homepage
// (lib/projects.ts), and was a single line in the source, not two.
const META = [
  { label: "TIMELINE", values: ["January 2026 · 36 hrs"] },
  { label: "TEAM", values: ["4 members"] },
  { label: "ROLE", values: ["Product Designer", "Visual Designer"] },
  { label: "SKILLS", values: ["Product Design", "Product Strategy", "Prototyping"] },
];

// Persona cards for the Research section — same "one card per person" idea
// as Spotify's 4 Key Insights cards, just with a name/role header instead
// of a number.
const PERSONAS = [
  {
    name: "Percy",
    // CHECK: role line was small/blurry in the source screenshot.
    role: "Maritime route planner",
    needs: [
      "Easy-to-use platform to make quick decisions",
      "Accurate data that's ready whenever it's needed",
    ],
    // CHECK: pain point wording is a best-effort read.
    painPoints: "Existing tools aren't accurate or accessible enough to trust for real planning work.",
  },
  {
    name: "Johnny",
    // CHECK: role line was small/blurry in the source screenshot.
    role: "A bit curious about the Arctic",
    needs: ["A simple interface that feels as familiar as apps he already uses"],
    // CHECK: pain point wording is a best-effort read.
    painPoints: "Simplicity over technical accuracy — no interest in complexity for its own sake.",
  },
];

// The 3 route-planning views shown side by side in 01/Initial Planning —
// captions transcribed from the reference screenshot of Amy's old page.
// CHECK: caption↔image pairing is inferred from what's actually pictured
// in each (route1 = a nautical chart of shipping routes, route2 = a
// colored world heatmap, route3 = navigation-software UI), not confirmed
// against the original source directly.
const ROUTE_VIEWS = [
  { src: "/images/projects/cybersea/route1.avif", alt: "Arctic shipping route view 1", caption: "Current Trade Routes" },
  { src: "/images/projects/cybersea/route2.avif", alt: "Arctic shipping route view 2", caption: "Weather Conditions" },
  { src: "/images/projects/cybersea/route3.avif", alt: "Arctic shipping route view 3", caption: "Route Planning Application" },
];

// The web app's 3 core features, each backed by one of the real demo
// clips in public/images/projects/cybersea/.
const FEATURES = [
  {
    label: "Visual - Live Map",
    // CHECK: caption is a best-effort read of a very small line of text.
    caption: "See live route conditions across the Arctic on one interactive map.",
    src: "/images/projects/cybersea/live%20map.mp4",
  },
  {
    label: "Mental - Dashboard",
    caption: "Get route data at a glance on a clean, focused dashboard.",
    src: "/images/projects/cybersea/dashboard.mp4",
  },
  {
    label: "Physical - Interactive 3D Models",
    caption: "Explore real 3D models to understand terrain and routes hands-on.",
    src: "/images/projects/cybersea/3d%20mesh.mp4",
  },
];

export default function CyberSeaCaseStudy() {
  return (
    <CaseStudyLayout sectionNav={SECTION_NAV}>
      <CaseStudyHero
        title="CyberSea"
        subtitle="Plan and understand Arctic routes with live data and interactive 3D maps."
        heroSrc="/images/projects/cybersea/cybersea.mp4"
        heroAlt="CyberSea app preview"
        heroVideo
        highlightColor={HIGHLIGHT}
        meta={META}
      />

      {/* 01 / Initial Planning */}
      <Section id="initial-planning">
        <Row
          // CHECK: "The Thales Challenge" — read with reasonable confidence
          // by cross-referencing the Result callout in 05/Final Project
          // ("2nd for the Thales Challenge"), which suggests this section's
          // heading names the hackathon's Thales-sponsored prompt.
          eyebrow="01 / Initial Planning"
          heading="The Thales Challenge"
          media={
            <div className="space-y-[36px]">
              {/* Larger + centered, closer to TEXT.subheader than the
                  usual small caption size, and all 3 images share one
                  ratio (object-cover crops each to fit) instead of each
                  keeping its own native height — route2 in particular was
                  much shorter than the other two, so the row looked
                  uneven. */}
              <p className="text-center font-body text-[24px] font-normal text-black/60">
                3+ different views are needed to plan ONE route!
              </p>
              <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-3">
                {ROUTE_VIEWS.map((r) => (
                  <div key={r.src}>
                    <CaseStudyImage src={r.src} alt={r.alt} ratio="512/320" highlightColor={HIGHLIGHT} />
                    <p className="mt-2 text-center font-body text-sm font-light text-black/50">{r.caption}</p>
                  </div>
                ))}
              </div>
            </div>
          }
        >
          <p>
            The Arctic is unpredictable. Conditions constantly change, and routes shift
            without warning. For maritime operators, this is a problem, and for the
            average person, even beginning to understand the Arctic feels impossible.
          </p>
          <p className="mt-[36px]">
            This led us to ask:{" "}
            <TextHighlight color={HIGHLIGHT}>
              &ldquo;Why is understanding the Arctic still so complicated that even
              professionals report it as overwhelming?&rdquo;
            </TextHighlight>
          </p>
        </Row>

        <Row
          heading="Why does this matter?"
          media={
            // CHECK: the three captions below are a best-effort read of very
            // small text — the stat numbers themselves (12-15%, 80%, 4x)
            // were legible with confidence.
            <StatRow
              bg={HIGHLIGHT}
              stats={[
                { stat: "12-15%", caption: "of global shipping passes through Arctic waters" },
                { stat: "80%", caption: "of Arctic data requires expert interpretation" },
                { stat: "4x", caption: "more challenging to plan Arctic routes globally" },
              ]}
            />
          }
        >
          <p>
            <TextHighlight color={HIGHLIGHT}>
              Understanding the Arctic isn&apos;t just an industry concern — it has
              real-world impacts.
            </TextHighlight>
          </p>
        </Row>
      </Section>

      {/* 02 / Research */}
      <Section id="research">
        {/* Personas render in `children` (the normal narrow content column),
            not `media` (which spans full width below the label) — that
            keeps them from stretching edge-to-edge and lets them sit
            beside the "02 / Research" / "Personas" label instead of
            underneath it. */}
        <Row eyebrow="02 / Research" heading="Personas">
          <div className="space-y-4">
            {PERSONAS.map((p) => (
              <div key={p.name} className="rounded-[10px] bg-[#f7f7f7] p-6">
                <div className="flex items-center gap-3">
                  {/* Placeholder for a real persona photo — solid circle,
                      same idea as PlaceholderBox elsewhere on the page. */}
                  <div className="h-12 w-12 flex-shrink-0 rounded-full bg-black" aria-hidden="true" />
                  <p className="font-body text-[28px] font-medium text-black text-left">{p.name}</p>
                </div>
                <p className={`mt-2 ${TEXT.content}`}>{p.role}</p>

                {/* "Needs"/"Pain Points" labels are the only text in this
                    card that ISN'T plain body copy — 2pt above
                    TEXT.content's 18px (was 16px, actually smaller than
                    the body text around it, which read as inconsistent
                    rather than as a label standing out). */}
                <p className="mt-4 font-body text-[20px] font-medium text-black/80 text-left">Needs</p>
                <ul className={`mt-1 space-y-1 ${TEXT.content}`}>
                  {p.needs.map((n, i) => (
                    <li key={n} className="flex gap-2">
                      <span aria-hidden="true">{i + 1}.</span>
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>

                <p className="mt-4 font-body text-[20px] font-medium text-black/80 text-left">Pain Points</p>
                <p className={TEXT.content}>{p.painPoints}</p>
              </div>
            ))}
          </div>
        </Row>

        <Row
          heading="Problem Statement:"
          media={
            <HighlightBox bg={HIGHLIGHT}>
              How might we close the gap between Arctic expertise and public
              understanding?
            </HighlightBox>
          }
        />
      </Section>

      {/* 03 / The Solution */}
      <Section id="the-solution">
        <Row
          eyebrow="03 / The Solution"
          heading="3 main features"
          media={
            <div className="space-y-[56px]">
              {/* Side by side, not stacked — text (label + caption, on top
                  of each other) on the left, video on the right. Same
                  16rem label-column width as Row's own layout, for visual
                  consistency with the rest of the page. items-end (not
                  items-center) bottom-aligns the text against the video. */}
              {FEATURES.map((f) => (
                <div key={f.label} className="grid grid-cols-1 gap-6 sm:grid-cols-[16rem_1fr] sm:items-end">
                  <div>
                    <p className={TEXT.groupHeader}>{f.label}</p>
                    <p className={`mt-1 ${TEXT.content}`}>{f.caption}</p>
                  </div>
                  <CaseStudyImage src={f.src} alt={f.label} ratio="16/9" video highlightColor={HIGHLIGHT} />
                </div>
              ))}
            </div>
          }
        >
          <p>
            We designed a web app that simplifies the complexities of the Arctic through{" "}
            <TextHighlight color={HIGHLIGHT}>3 main features:</TextHighlight>
          </p>
        </Row>
      </Section>

      {/* 04 / Implementation */}
      <Section id="implementation">
        <Row
          eyebrow="04 / Implementation"
          heading="Challenge"
          media={
            <HighlightBox bg={HIGHLIGHT}>How can we balance heavy branding with accessibility?</HighlightBox>
          }
        />

        <Row
          heading="Moodboard"
          media={
            <CaseStudyImage
              src="/images/projects/cybersea/inspo.webp"
              alt="CyberSea moodboard collage of visual references"
              ratio="1024/650"
              highlightColor={HIGHLIGHT}
            />
          }
        >
          {/* CHECK: paraphrased from a partially-legible paragraph. */}
          <p>
            Creating a moodboard early on helped us actually see the visual direction
            before committing to it, rather than guessing at what &ldquo;heavy branding&rdquo;
            should look like.
          </p>
        </Row>

        <Row
          heading="Initial Sketches"
          media={
            <CaseStudyImage
              src="/images/projects/cybersea/sketch.webp"
              alt="Initial sketches: globe concept and ship concept"
              ratio="1024/753"
              highlightColor={HIGHLIGHT}
            />
          }
        />

        <Row
          heading="Select Iterations"
          media={
            // Only one iteration asset exists — the original page showed
            // several iteration screenshots each paired with a "Problem"
            // (pink) / "Solution" (green) caption; those captions were too
            // small to transcribe reliably, so CHECK this section once more
            // iteration images are available.
            // Full width per Amy's request, rather than capped/centered —
            // note the real asset is a tall portrait capture (1503x2048),
            // so at full column width this renders quite tall.
            <CaseStudyImage
              src="/images/projects/cybersea/design1.webp"
              alt="An early design iteration of the CyberSea interface"
              ratio="1503/2048"
              highlightColor={HIGHLIGHT}
            />
          }
        />
      </Section>

      {/* 05 / Final Project */}
      <Section id="final-project">
        <Row
          eyebrow="05 / Final Project"
          heading="CyberSea"
          media={
            <CaseStudyImage
              src="/images/projects/cybersea/fullvid.mp4"
              alt="CyberSea final product walkthrough"
              ratio="1280/772"
              video
              highlightColor={HIGHLIGHT}
            />
          }
          after={
            // CHECK: swap in the real repo URL — placeholder for now.
            <CaseStudyCta href="https://github.com/" highlightColor={HIGHLIGHT}>
              Check it out on GitHub!
            </CaseStudyCta>
          }
        />

        {/* Plain body text beside the heading (Row's `children`, same as
            every text-only Row on the page) — no box/background, per Amy's
            correction; it had been rendered as a colored `media` block. */}
        <Row heading="Result">
          <p>We&apos;re extremely proud of winning:</p>
          <ul className="mt-2 space-y-1">
            <li className="flex gap-2">
              <span aria-hidden="true">–</span>
              <span>1st overall</span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true">–</span>
              <span>2nd for the Thales Challenge</span>
            </li>
          </ul>
        </Row>
      </Section>

      {/* 06 / Learnings */}
      <Section id="learnings">
        {/* "06 / Learnings" sits above the Row instead of stacked inside its
            own label column (Row's usual `eyebrow` prop) — that way the body
            text lines up with "Working on a team of non-designers" (the
            subheader) rather than with the eyebrow above it. mb-2, not the
            old -mt-0.5 (a line-height-overlap hack) — same real gap Row's
            own eyebrow now uses, so this reads identically to it and to
            SpotifyCaseStudy.tsx's own standalone group headers (see
            "Spotify's Design System"). */}
        <p className={`${TEXT.header} mb-2`}>06 / Learnings</p>
        <Row heading="Working on a team of non-designers">
          <p>
            Design is often reduced to just &ldquo;making things look aesthetic,&rdquo;
            something I especially noticed while working with a team of non-designers. I
            often found myself in a position where teammates wanted to add a feature or
            element that would just make the interface feel cluttered.
          </p>
          <p className="mt-[36px]">
            This was my first time having to explain how decisions like
            hierarchy, spacing, and restraint weren&apos;t just visual choices,
            but improvements to the experience. And it taught me that a big part
            of design is not just creating solutions, but{" "}
            <TextHighlight color={HIGHLIGHT}>communicating effectively to others</TextHighlight>. (And
            I was able to spread design propaganda about our importance! :)
          </p>
        </Row>

        <Row heading="The Hackathon Mindset">
          <p>
            Unlike traditional projects, hackathons prioritize unique concepts
            and rapid execution over something polished. The short timeframe
            forced us to work efficiently, make quick decisions, and
            continuously re-evaluate our direction.
          </p>
          <p className="mt-[36px]">
            Through this experience, I learned the importance of iterating
            frequently and refining ideas as development progressed. And to let
            go of my perfectionist mindset. Sometimes, the end result was more
            important than how you got there.
          </p>
          <p className="mt-[36px]">
            Though if I could go back, I would definitely want to focus more on
            the UX rather than the UI!
          </p>
        </Row>
      </Section>
    </CaseStudyLayout>
  );
}

"use client";

import type { ReactNode } from "react";
import {
  CaseStudyCta,
  CaseStudyHero,
  CaseStudyImage,
  CaseStudyLayout,
  HighlightBox,
  PlaceholderBox,
  Row,
  Section,
  StatRow,
  TEXT,
  type SectionNavItem,
} from "@/components/case-studies/CaseStudyKit";
import TextHighlight from "@/components/case-studies/TextHighlight";

// SkinSprout case study — same shell/primitives as Spotify Guessr and
// CyberSea (see CaseStudyKit.tsx), copy transcribed verbatim from Amy's own
// pasted text (not a screenshot read this time — she flagged the source
// page as still a WIP, and a couple of spots below still show it, see the
// `// CHECK:` comments).
//
// Highlight color: #faf1f6, per Amy — used both as the background box color
// (WIP banner, StatRow, Problem Statement) and as the TextHighlight color
// below (TextHighlight has its own hardcoded default otherwise, unrelated
// to this constant).
const HIGHLIGHT = "#faf1f6";

const SECTION_NAV: SectionNavItem[] = [
  { id: "initial-planning", label: "01 Initial Planning" },
  { id: "research", label: "02 Research" },
  { id: "design-process", label: "03 Design Process" },
  { id: "final-project", label: "04 Final Project" },
  { id: "learnings", label: "05 Learnings" },
];

const META = [
  { label: "TIMELINE", values: ["May 2026"] },
  { label: "TEAM", values: ["1 designer (me!)"] },
  { label: "ROLE", values: ["Product design", "Visual design"] },
  { label: "SKILLS", values: ["Product design", "Branding"] },
];

// Accent color for the "Pain Points:"/"Needs:" labels on each persona card
// — a muted plum/mauve in the reference screenshot, not black like the rest
// of the card text. CHECK: eyeballed from the screenshot, not
// pixel-sampled — nudge the hex if it's slightly off from the original.
const PERSONA_ACCENT = "#9c3f72";

// Persona cards for the Research section — real copy from Amy's reference
// screenshot (photo + name, an intro bullet list, then Pain Points and
// Needs). Same card shell as CyberSea's PERSONAS, but with a leading
// bullet list before Pain Points/Needs instead of a single "role" line.
const PERSONAS: {
  name: string;
  top: ReactNode[];
  painPoints: string[];
  needs: string[];
}[] = [
    {
      name: "Abby",
      top: [
        <>
          Skincare <strong className="font-medium">intermediate</strong> (understands to an extent)
        </>,
        "Loves trying new skincare",
      ],
      painPoints: [
        "Forgets what products she's tried before and whether it worked or not",
        "Spends too much $ on skincare",
        "Difficulty finding new products that work",
        "Can't afford a dermatologist",
      ],
      needs: ["A way to track her skincare history", "Customized skincare recommendations"],
    },
    {
      name: "Grace",
      top: [
        <>
          Skincare <strong className="font-medium">beginner</strong> (knows nothing about skincare)
        </>,
      ],
      painPoints: [
        "Wants to get into skincare but there's too much to learn!",
        "Overwhelmed by the amount of products",
        "Uses products that don't work",
      ],
      needs: [
        "A simple app that provides skincare info",
        "A way to track her skincare progress",
        "Customized skincare recommendations",
      ],
    },
  ];

// Real competitive analysis copy from Amy — Skin Bliss, ACloset, and
// Incidecoder, the three apps compared in the competitive-analysis.png
// screenshot collage above (see the Competitive Analysis Row below). Laid
// out as one row per evaluation criteria (not one card per app) so it
// renders as an actual comparison table via ComparisonTable, in the same
// criteria-by-app style as Amy's reference table for Spotify Guessr's own
// competitive analysis (ca_result.avif).
const COMPARISON_ROWS: { criteria: string; skinBliss: string; acloset: string; incidecoder: string }[] = [
  {
    criteria: "Information hierarchy",
    skinBliss: "Weak; competing signals, hard to scan",
    acloset: "Strong; clean and easy to read",
    incidecoder: "Strong; but dense with raw data",
  },
  {
    criteria: "Effort to reach value",
    skinBliss: "Low effort; but the payoff isn't credible",
    acloset: "High effort; long intake before any payoff",
    incidecoder: "Low effort; but the payoff isn't personal",
  },
  {
    criteria: "Personalization",
    skinBliss: "Claims personalization; doesn't show why",
    acloset: "Personalizes via upfront form",
    incidecoder: "None; same content for every user",
  },
  {
    criteria: "Trust / transparency",
    skinBliss: "Low; no reasoning behind match scores",
    acloset: "Not applicable; not a rec engine",
    incidecoder: "High on ingredients; low on relevance",
  },
];

// `body` is a ReactNode (not a plain string) so the 3 insights Amy flagged
// as highlighted can wrap their closing clause in <TextHighlight> — the
// 4th insight wasn't marked as highlighted in her reference, so it stays
// plain body text.
const INSIGHTS: { title: string; body: ReactNode }[] = [
  {
    title: "Too many voices with no way to weigh them.",
    body: (
      <>
        Influencers, brands, and buzzwords all compete for trust, leaving users{" "}
        <TextHighlight color={HIGHLIGHT}>unable to tell good advice from marketing.</TextHighlight>
      </>
    ),
  },
  {
    title: "Generic advice doesn't work for everyone.",
    body: (
      <>
        Broad categories like “oily” or “sensitive” hide the fact that{" "}
        <TextHighlight color={HIGHLIGHT}>
          two people can react completely differently to the same product.
        </TextHighlight>
      </>
    ),
  },
  {
    title: "Ingredients are unreadable, so cause and effect stays hidden.",
    body: (
      <>
        Users can&apos;t connect a reaction to its cause when{" "}
        <TextHighlight color={HIGHLIGHT}>
          they don&apos;t understand what&apos;s in the product to begin with.
        </TextHighlight>
      </>
    ),
  },
  {
    title: "Without a record, past products vanish, so nothing gets learned.",
    body: "People can't recall what they've tried before, and tracking tools don't have enough payoff to motivate real use.",
  },
];

// Criteria-by-app comparison table for the Competitive Analysis row — same
// visual language as Amy's reference table for Spotify Guessr's own
// competitive analysis (ca_result.avif): no vertical grid lines, just a
// heavier rule under the header row and a hairline rule under every data
// row, generous vertical padding, left-aligned throughout. Every cell — the
// column headers, the row labels, and the values — shares the same 16px
// font-body size (2pt down from TEXT.content's 18px, per Amy — sized/built
// locally rather than reusing TEXT.content directly since that constant is
// shared site-wide and shouldn't shrink everywhere else it's used), with
// only weight/color doing the hierarchy (header: medium black, row label:
// medium black/80, value: light black/60). Header rule lightened from
// black/70 to black/30 — less harsh than the original near-solid line.
function ComparisonTable({ rows }: { rows: typeof COMPARISON_ROWS }) {
  const headingCell = "py-4 font-body text-[16px] font-medium text-black";
  const valueCell = "py-5 pr-6 align-top font-body text-[16px] font-light leading-relaxed text-black/60 text-left";
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr className="border-b border-black/30">
            <th className={`${headingCell} pr-6`}>Criteria</th>
            <th className={`${headingCell} pr-6`}>Skin Bliss</th>
            <th className={`${headingCell} pr-6`}>ACloset</th>
            <th className={headingCell}>Incidecoder</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.criteria} className="border-b border-black/10">
              <td className="w-[180px] py-5 pr-6 align-top font-body text-[16px] font-medium text-black/80">
                {r.criteria}
              </td>
              <td className={valueCell}>{r.skinBliss}</td>
              <td className={valueCell}>{r.acloset}</td>
              <td className={`${valueCell} pr-0`}>{r.incidecoder}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SkinSproutCaseStudy() {
  return (
    <CaseStudyLayout sectionNav={SECTION_NAV}>
      <CaseStudyHero
        title="SkinSprout"
        // A bit smaller than the shared default clamp() — per request, this
        // page's own title read too large. CyberSea/Spotify are untouched.
        titleClassName="text-[clamp(2.5rem,6.75vw,4rem)]"
        subtitle="Track your skincare history to get personalized product recommendations."
        heroSrc="/images/projects/skinsprout/skinsprout.mp4"
        heroAlt="SkinSprout app preview"
        heroVideo
        highlightColor={HIGHLIGHT}
        meta={META}
      />

      {/* Amy's source page still carries this literal banner — keeping it
          verbatim per "accurately put this onto my website," but it's an
          easy one-line delete in this file once the page is actually done.
          py-8 (was py-[14px]) and the same text treatment as the Problem
          Statement/Navigation problem boxes below (was a one-off
          text-[16px] font-medium) — per request, so all 3 highlight boxes
          on this page read as one consistent component instead of 3
          hand-tuned ones. Spelled out the same way those two do (not
          `${TEXT.frame} text-center`) since TEXT.frame's own text-left
          and an appended text-center would both be real utility classes
          competing for the same property — safer to just match their
          exact className than rely on Tailwind's generated stylesheet
          order to pick the right one. */}
      <HighlightBox bg={HIGHLIGHT} className="mt-8">
        THIS PAGE IS CURRENTLY A WIP!
      </HighlightBox>

      {/* 01 / Initial Planning */}
      <Section id="initial-planning">
        <Row
          eyebrow="01 / Initial Planning"
          heading="The Problem"
          media={
            <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
              <CaseStudyImage
                src="/images/projects/skinsprout/current1.webp"
                alt="A skincare recommendations app recommending a product"
                ratio="1024/598"
                bg={false}
              />
              <CaseStudyImage
                src="/images/projects/skinsprout/current2.avif"
                alt="A dense skincare ingredient list"
                ratio="1024/527"
                bg={false}
              />
            </div>
          }
          after={
            <>
              <p>
                {/* CHECK: highlight placement is a best-effort read of the
                    reference screenshot (too low-res to confirm exact word
                    boundaries) — the position/length of the highlighted
                    block matched this closing clause most closely. */}
                Even users who do know skincare have a hard time.{" "}
                <TextHighlight color={HIGHLIGHT}>
                  Ingredient lists are dense and never optimized for a consumer.
                </TextHighlight>
              </p>
              <p className="mt-[36px]">
                {/* CHECK: same best-effort caveat as above. */}
                Users are stuck choosing between two bad options:{" "}
                <TextHighlight color={HIGHLIGHT}>
                  trust marketing they know is unreliable, or self-educate through a
                  system that was never built to be understood.
                </TextHighlight>
              </p>
              <div className="mt-[36px]">
                <StatRow
                  bg={HIGHLIGHT}
                  stats={[
                    { stat: "13/20", caption: "people discover products on social media." },
                    { stat: "10/13", caption: "find the products ineffective." },
                    { stat: "9/10", caption: "struggle to figure out why." },
                  ]}
                />
              </div>
            </>
          }
        >
          <p>Finding skincare that actually works for your skin shouldn&apos;t be this difficult.</p>
          <p className="mt-[36px]">
            But the industry is built to sell, not to inform. Influencers promote
            anything that would give them a brand deal, and marketing is hinged on
            exaggerations.
          </p>
          <p className="mt-[36px]">
            <TextHighlight color={HIGHLIGHT}>
              The result: Users end up buying based on who has the biggest following, not
              what they actually need.
            </TextHighlight>
          </p>
        </Row>

        <Row
          heading="The Solution"
          media={
            <div className="space-y-[56px]">
              {[
                {
                  caption: 'A tracking system where you can log your skincare in your "shelf".',
                  src: "/images/projects/skinsprout/sol1.avif",
                  alt: "SkinSprout's My Shelf screen, showing tracked skincare products",
                },
                {
                  caption: "Product info, based on your own opinions and other general facts.",
                  src: "/images/projects/skinsprout/sol2.avif",
                  alt: "A tracked product's detail screen with rating, cost, and personal notes",
                },
                {
                  caption:
                    "A comparison page listing out which product is recommended — and the reasoning based on your skincare history.",
                  src: "/images/projects/skinsprout/sol3.avif",
                  alt: "A product comparison screen showing a recommended vs. not recommended product",
                },
              ].map((f, i) => {
                // Alternating sides, aligned to the BODY TEXT column, not
                // the full media block. Row lays out as
                // `grid-cols-[16rem_1fr] gap-x-12` (heading col + body col)
                // and `media` spans both columns (md:col-span-2) — so its
                // left edge sits under the heading, not under the body
                // text, and its right edge equals the body column's right
                // edge (both stretch to the grid's right border).
                //
                // Also: every class here uses the SAME `md:` breakpoint as
                // Row's own grid (`md:grid-cols-[16rem_1fr]`) — mixing `sm:`
                // (640px) for the row/width switch with `md:` (768px) for
                // the ml-[19rem] offset would leave a broken zone between
                // 640-768px where the row layout kicks in without its
                // offset.
                const isLeftItem = i === 1;
                return (
                  <div
                    key={f.src}
                    className={
                      isLeftItem
                        ? // The "left" item: phone flush to the body
                        // column's LEFT edge (ml-[19rem] = 16rem heading
                        // col + 3rem gap), text flush to its RIGHT edge —
                        // spanning the box to the body column's own width
                        // (no fixed width here, just the left offset) so
                        // justify-between's gap is scoped to that column,
                        // and the text lands aligned with the phone in
                        // the item directly above it (both flush to the
                        // same right edge).
                        "flex flex-col items-center gap-8 md:ml-[19rem] md:flex-row md:flex-row-reverse md:justify-between"
                        : // The "right" items: shrink to fit their own
                        // content (phone+text+gap) and hug the body
                        // column's right edge.
                        "flex flex-col items-center gap-8 md:w-fit md:flex-row md:ml-auto"
                    }
                  >
                    <div className="w-full md:w-[320px]">
                      <p className={TEXT.content}>{f.caption}</p>
                    </div>
                    <div className="w-full md:w-[220px] flex-shrink-0">
                      <CaseStudyImage src={f.src} alt={f.alt} ratio="906/1824" bg={false} />
                    </div>
                  </div>
                );
              })}
            </div>
          }
        >
          <p>
            A mobile app that allows users to track products, and recommends future
            products based on their skincare history.
          </p>
        </Row>
      </Section>

      {/* 02 / Research */}
      <Section id="research">
        <Row
          eyebrow="02 / Research"
          heading="Affinity Mapping"
          media={
            <div className="space-y-[36px]">
              <CaseStudyImage
                src="/images/projects/skinsprout/am.avif"
                alt="Affinity map grouping survey responses into 4 key insight clusters"
                ratio="1024/803"
                bg={false}
              />
              {/* "This revealed 4 key insights:" sits here, between the map
                  image and the insight cards, instead of in `children` above
                  — it reads as the lead-in to the cards it sits right on top
                  of, not as a continuation of the intro paragraph. */}
              <p className={TEXT.content}>This revealed 4 key insights:</p>
              <div className="space-y-4">
                {INSIGHTS.map((insight, i) => (
                  <div key={insight.title} className="flex gap-4 rounded-[10px] bg-[#f7f7f7] p-6">
                    <span className="font-body text-lg font-medium text-black">{i + 1}</span>
                    <div>
                      <p className="font-body text-[18px] font-light text-black text-left">{insight.title}</p>
                      <p className={`mt-1 ${TEXT.content}`}>{insight.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }
        >
          <p>
            {/* CHECK: cross-referenced against Spotify's own Affinity Mapping
                paragraph, which uses this exact phrase — high-confidence
                match, not a guess from the low-res screenshot alone. */}
            Through analysis of{" "}
            <TextHighlight color={HIGHLIGHT}>20 user survey responses (aged 17-24)</TextHighlight>, I
            mapped out the responses to better understand the problem.
          </p>
        </Row>

        {/* Personas render in `children` (the normal narrow content column),
            not `media` — keeps them from stretching edge-to-edge. No
            eyebrow here (unlike CyberSea's own Personas row) since
            "Affinity Mapping" above already carries "02 / Research" as the
            first row in this section. */}
        <Row heading="Personas">
          <div className="space-y-4">
            {PERSONAS.map((p) => (
              <div key={p.name} className="rounded-[10px] bg-[#f7f7f7] p-6">
                <div className="flex items-center gap-3">
                  {/* Placeholder for a real persona photo — solid circle,
                      same idea as PlaceholderBox elsewhere on the page.
                      Swap for a real headshot if/when you have one. */}
                  <div className="h-12 w-12 flex-shrink-0 rounded-full bg-black" aria-hidden="true" />
                  <p className="font-body text-[28px] font-medium text-black text-left">{p.name}</p>
                </div>

                <ul className={`mt-4 space-y-1 ${TEXT.content}`}>
                  {p.top.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden="true">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                {/* "Pain Points:"/"Needs:" are the only labels here that
                    aren't plain body copy — 2pt above TEXT.content's 18px
                    (was 16px, smaller than the surrounding body text,
                    which read as inconsistent rather than as a label). */}
                <p className="mt-4 font-body text-[20px] font-semibold text-left" style={{ color: PERSONA_ACCENT }}>
                  Pain Points:
                </p>
                <ul className={`mt-1 space-y-1 ${TEXT.content}`}>
                  {p.painPoints.map((n, i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden="true">•</span>
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>

                {/* "Pain Points:"/"Needs:" are the only labels here that
                    aren't plain body copy — 2pt above TEXT.content's 18px
                    (was 16px, smaller than the surrounding body text,
                    which read as inconsistent rather than as a label). */}
                <p className="mt-4 font-body text-[20px] font-semibold text-left" style={{ color: PERSONA_ACCENT }}>
                  Needs:
                </p>
                <ul className={`mt-1 space-y-1 ${TEXT.content}`}>
                  {p.needs.map((n, i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden="true">•</span>
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Row>

        {/* Intro line sits in `children` (beside the "Competitive Analysis"
            heading, the normal Row layout every other row on this page
            uses). The screenshot follows via `media`, and the criteria-by-
            app comparison table goes last via `after`, full-width under the
            image — a real table instead of a plain callout box, styled like
            Amy's Spotify Guessr competitive-analysis table (see
            ComparisonTable above). */}
        <Row
          heading="Competitive Analysis"
          media={
            <CaseStudyImage
              src="/images/projects/skinsprout/competitive-analysis.png"
              alt="Competitive analysis screenshots comparing Skin Bliss, ACloset, and Incidecoder"
              ratio="1542/623"
              bg={false}
            />
          }
          after={<ComparisonTable rows={COMPARISON_ROWS} />}
        >
          <p>
            Finally, I needed to understand what the market currently looks like, so I
            conducted some quick competitive analysis!
          </p>
        </Row>

        <Row heading="The Gap">
          <p>
            None of the three apps offer a recommendation users could actually trust
            with a process that doesn&apos;t feel like work. Skin Bliss is personalized
            but doesn&apos;t justify any reasoning, so the match score doesn&apos;t earn
            belief. ACloset is easy to use once you&apos;re in, but requires more effort
            than most users are willing to give before seeing any payoff. Incidecoder is
            transparent and informative, but generic. It explains what an ingredient
            does, not what it does for this person&apos;s skin.
          </p>
        </Row>

        <Row heading="What This Meant For My Design">
          <p>This shaped three priorities going into my own app:</p>
          <ol className="mt-4 space-y-4">
            <li className="flex gap-3">
              <span aria-hidden="true">1.</span>
              <span>
                Recommendations needed to be trustworthy. They needed to show their
                reasoning, not just a score, so users could see <em>why</em> a product
                was or wasn&apos;t a fit.
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true">2.</span>
              <span>
                Building a user&apos;s profile needed to happen gradually, through a
                user&apos;s skincare history, so the app gets smarter over time instead
                of asking for everything up front.
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true">3.</span>
              <span>
                Ingredient-level detail needed to stay tied back to the
                individual&apos;s skin, not presented as generic reference information.
              </span>
            </li>
          </ol>
        </Row>

        <Row
          heading="Problem Statement:"
          media={
            <HighlightBox bg={HIGHLIGHT}>
              How can we make skincare easier to purchase based on each user&apos;s
              personalized skincare history?
            </HighlightBox>
          }
        />
      </Section>

      {/* 03 / Design Process */}
      <Section id="design-process">
        {/* "03 / Design Process" sits above the Row instead of inside its
            own eyebrow column, so the body text lines up with "Moodboard"
            (the subheader) rather than with the eyebrow above it. mb-2, not
            the old -mt-0.5 (a line-height-overlap hack) — same real gap
            Row's own eyebrow now uses, so this reads identically to it and
            to CyberSea's "06 / Learnings" restructure. */}
        <p className={`${TEXT.header} mb-2`}>03 / Design Process</p>
        <Row
          heading="Moodboard"
          media={
            <CaseStudyImage
              src="/images/projects/skinsprout/moodboard.avif"
              alt="Moodboard of skincare apps and modern, simplistic UI references"
              ratio="1024/648"
              bg={false}
            />
          }
        >
          <p>
            In order to fully understand the vision, I created a mood board. The main
            inspiration was made of skincare apps and other apps with modern,
            simplistic UI.
          </p>
        </Row>

        <Row
          heading="User Flow Chart"
          media={
            <CaseStudyImage
              src="/images/projects/skinsprout/map.avif"
              alt="User flow chart for adding a new item to the shelf"
              ratio="1024/300"
              bg={false}
            />
          }
        >
          <p>
            I didn&apos;t feel the need to make a chart for every interaction as I
            already had a pretty good idea of what the app should look like. However, I
            did make one for some areas where I felt unsure, such as{" "}
            <TextHighlight color={HIGHLIGHT}>how adding new items to the shelf would look.</TextHighlight>
          </p>
        </Row>

        {/* CHECK: "Branding" had no body copy in what you sent — just the
            heading, matching the group-label rows in Spotify's own page
            ("Spotify's Design System", "Branding"). Add real copy once
            it's ready.
            Was a hand-rolled <div><p>heading</p><div className="-mt-0.5">
            image</div></div> — that -mt-0.5 was borrowed from the eyebrow-
            to-heading idiom elsewhere in this file (a near-zero
            compensation for line-height, not a real gap), so this title
            sat almost flush against the image below it: a visibly tighter
            gap than "Design Choices"/"Problem Statement" have to THEIR own
            media below (both plain Rows, whose own mediaGap gives a real
            mt-2 when there's no body copy — see Row's own comment in
            CaseStudyKit.tsx). Switched to an actual Row (same heading/
            headingClassName/media shape "Wireframing" below already uses)
            so this gets that same mt-2 gap for free, and can't quietly
            drift out of sync with it again the way a second hand-tuned
            magic number could. */}
        <Row
          heading="Branding"
          headingClassName={TEXT.header}
          media={
            <CaseStudyImage
              src="/images/projects/skinsprout/branding.avif"
              alt="SkinSprout brand mark, color palette, typography, and buttons"
              ratio="1024/590"
              bg={false}
            />
          }
        />

        <Row
          heading="Wireframing"
          headingClassName={TEXT.header}
          media={
            <CaseStudyImage
              src="/images/projects/skinsprout/wireframe.avif"
              alt="Low-fidelity wireframes of the SkinSprout screens and flow"
              ratio="1516/2048"
              bg={false}
            />
          }
        >
          <p>
            I mapped out the screens + flow using low-fidelity wireframes, ensuring
            navigation was smooth.
          </p>
        </Row>

        <Row
          heading="Testing"
          media={
            <StatRow
              bg={HIGHLIGHT}
              stats={[
                { stat: "5/5", caption: "Completed the flow without any help." },
                { stat: "4/5", caption: "found the information easy to read." },
                { stat: "3/5", caption: "Had trouble editing products inside the shelf." },
              ]}
            />
          }
        >
          <p>
            The low-fi was my first iteration to ensure everything made sense. I tested
            the flow with{" "}
            <TextHighlight color={HIGHLIGHT}>5 users who all know different amounts of skincare.</TextHighlight>
          </p>
        </Row>

        <Row
          heading="Design Choices"
          media={
            <div className="space-y-[36px]">
              {/* Was bg-[#fbeded] — a hardcoded hex that didn't actually
                  match HIGHLIGHT (#faf1f6, this page's own accent color,
                  used by the WIP/Problem Statement boxes) — close enough to
                  read as "basically the same pink" but not pixel-identical. */}
              <HighlightBox bg={HIGHLIGHT}>
                Navigation problem: Users needed a way to move between stat cards
                without breaking the visual rhythm of the layout.
              </HighlightBox>
              <p className={TEXT.content}>
                Currently, the cards are aligned vertically. Do users swipe, tap, or
                should they click somewhere else on the screen?
              </p>
              {/* CHECK: no real comparison-mockup image yet. */}
              <PlaceholderBox
                ratio="16/9"
                label="Navigation options compared: vertical arrows vs. no arrows"
                highlightColor={HIGHLIGHT}
              />
            </div>
          }
        />

        <Row heading="Decision">
          <p>
            Despite the vertical arrows having a clear next step, I decided against it
            because it cluttered the screen too much.
          </p>
          <p className="mt-[36px]">
            {/* CHECK: cross-referenced against Spotify's own Decision
                paragraph, which uses these same phrases — high-confidence
                match, not a guess from the low-res screenshot alone. */}
            <TextHighlight color={HIGHLIGHT}>So we went with the no arrow option.</TextHighlight> Users
            can <TextHighlight color={HIGHLIGHT}>swipe or tap</TextHighlight> to move onto the next
            screen. The layering is intuitive enough for the next step to be obvious.
          </p>
        </Row>
      </Section>

      {/* 04 / Final Project */}
      <Section id="final-project">
        <Row
          eyebrow="04 / Final Project"
          heading="Screens"
          media={
            // CHECK: no real final-screens grid yet.
            <PlaceholderBox
              ratio="16/9"
              label="Final SkinSprout app screens"
              highlightColor={HIGHLIGHT}
            />
          }
          after={
            // CHECK: this is the biggest one — the Figma link Amy pasted
            // (".../spotify-game?...") is literally the Spotify Guessr
            // prototype link, carried over from that case study while this
            // page was being drafted. Swap in the real SkinSprout Figma URL
            // before this goes live.
            <CaseStudyCta
              href="https://www.figma.com/proto/0i9bMQFOCCtSDtrcVcJqNO/spotify-game?node-id=66-264&starting-point-node-id=66%3A264&t=hoMOqtYUHmmOuSGe-1"
              highlightColor={HIGHLIGHT}
            >
              Check out the Figma prototype!
            </CaseStudyCta>
          }
        />
      </Section>

      {/* 05 / Learnings */}
      <Section id="learnings">
        <Row eyebrow="05 / Learnings" heading="Research first">
          <p>
            This was my first complete solo project. As silly as it sounds, I
            didn&apos;t realize the importance of research in the past (my old workflow
            was pretty messed up, it was idea &rarr; execution &rarr; maybe conduct a
            bit of research to back it up). I now know that research is quite literally
            the most important step in UX. (Maybe I can even say I&apos;m pretty good
            at it now.)
          </p>
        </Row>
      </Section>
    </CaseStudyLayout>
  );
}

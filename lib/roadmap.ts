// The stops on the About page's map ("Amy's roadmap",
// components/sections/About/Roadmap). Placeholder copy and photos for now:
// Amy will swap in her own, and her own drawn map (ROADMAP_MAP below).
//
// x / y place each pin on the map, in % of the map's box (0,0 top left), so
// they stay put however big the map is drawn. When the map is swapped for
// Amy's drawing, only these need moving.

export type RoadmapPhoto = { src: string; alt: string };

export type RoadmapStop = {
  id: string;
  /** The pin's label on the map, and the panel's title. */
  place: string;
  /** Shown small under the title in the panel, e.g. the years. */
  when: string;
  x: number;
  y: number;
  /** Which side of the pin its label sits (default right), so it stays
   * clear of the route. */
  label?: "left" | "right" | "below";
  /** The hover marker: one photo and a short caption. No photo shows an
   * empty sketched frame (a stop still to come). */
  marker: { photo?: RoadmapPhoto; caption: string };
  /** The panel that slides up on click: paragraphs, then photos. */
  panel: { paragraphs: string[]; photos: RoadmapPhoto[] };
};

/** Amy's own drawing goes here (a path under /public), drawn into the
 * map's box (MAP_ASPECT wide to 1 tall). null draws the placeholder map. */
export const ROADMAP_MAP: { src: string; alt: string } | null = null;
/** The map's width over its height. */
export const MAP_ASPECT = 1000 / 640;

export const ROADMAP_STOPS: RoadmapStop[] = [
  {
    id: "calgary",
    place: "Calgary, AB",
    when: "where I grew up",
    x: 13.3,
    y: 26.9,
    marker: {
      photo: { src: "/images/etc/dance1.webp", alt: "Amy dancing" },
      caption: "grew up dancing, drawing and debating",
    },
    panel: {
      paragraphs: [
        "Placeholder: Calgary is where I grew up. Most of my evenings went to the dance studio, my sketchbook, or a debate round.",
        "Placeholder: a line about what those years taught me, and how they still show up in how I design.",
      ],
      photos: [
        { src: "/images/etc/dance1.webp", alt: "Dancing" },
        { src: "/images/etc/drawing1.webp", alt: "One of Amy's drawings" },
        { src: "/images/etc/dance3.webp", alt: "Dancing on stage" },
      ],
    },
  },
  {
    id: "waterloo",
    place: "Waterloo, ON",
    when: "now",
    x: 23,
    y: 78.3,
    label: "left",
    marker: {
      photo: { src: "/images/etc/drawing2.webp", alt: "A drawing" },
      caption: "studying management engineering",
    },
    panel: {
      paragraphs: [
        "Placeholder: now I'm at the University of Waterloo, studying management engineering.",
        "Placeholder: a line about design teams, co-ops and what I'm building on the side.",
      ],
      photos: [
        { src: "/images/etc/drawing2.webp", alt: "A drawing" },
        { src: "/images/etc/drawing3.webp", alt: "Another drawing" },
      ],
    },
  },
  {
    id: "next",
    place: "Next stop?",
    when: "to be continued",
    x: 70.8,
    y: 75,
    marker: { caption: "placeholder: somewhere new" },
    panel: {
      paragraphs: ["Placeholder: a stop still to come. Amy fills this one in later."],
      photos: [],
    },
  },
];

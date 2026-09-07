import Bio from "./Bio";
import Experience from "./Experience";
// WhatsInside (the carousel/gallery of the jar's own physical items) is
// pulled off the page per request — component untouched and still fully
// wired (its own toggle, Carousel.tsx, Gallery.tsx, whatsInsideItems.ts all
// still here), just not rendered below. Re-add by importing it again and
// dropping <WhatsInside /> back in below <Experience />.
// import WhatsInside from "./WhatsInside";

// Three independent sections stacked on the page, not one shared wrapper —
// matches jar-portfolio's own app/notes/page.tsx split (its own comment:
// the bio reads as its own complete block, Experience a clearly separate
// one below it, each animating in on its own terms — Bio fires on mount,
// Experience on scroll — rather than competing for one shared entrance).
export default function About() {
  return (
    <>
      <Bio />
      <Experience />
    </>
  );
}

import Bio from "./Bio";
import Experience from "./Experience";

// Two independent sections stacked on the page, not one shared wrapper —
// matches jar-portfolio's own app/notes/page.tsx split (its own comment:
// the bio reads as its own complete block, Experience a clearly separate
// one below it, each animating in on its own terms — Bio fires on mount,
// Experience on scroll — rather than competing for one shared entrance).
// A third "what's inside?" carousel/gallery section (WhatsInside.tsx) was
// built and wired in here, then removed by request — its files are still
// in this folder (WhatsInside.tsx, Carousel.tsx, Gallery.tsx, StarBadge.tsx,
// whatsInsideLayout.ts, and lib/whatsInsideItems.ts) in case it's wanted
// back later, just no longer imported/rendered.
export default function About() {
  return (
    <>
      <Bio />
      <Experience />
    </>
  );
}

import Bio from "./Bio";
import Experience from "./Experience";
import WhatsInside from "./WhatsInside";

// Three independent sections stacked on the page, not one shared wrapper —
// matches jar-portfolio's own app/notes/page.tsx split (its own comment:
// the bio reads as its own complete block, Experience a clearly separate
// one below it, each animating in on its own terms — Bio fires on mount,
// Experience on scroll — rather than competing for one shared entrance).
// WhatsInside is a carousel/gallery of the jar's own physical items, new to
// this page (jar-portfolio's own version lived on its homepage).
export default function About() {
  return (
    <>
      <Bio />
      <Experience />
      <WhatsInside />
    </>
  );
}

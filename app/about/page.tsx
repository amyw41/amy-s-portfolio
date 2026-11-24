import About from "@/components/sections/About";
import UnderConstruction from "@/components/ui/UnderConstruction";
import { UNDER_CONSTRUCTION } from "@/lib/underConstruction";

export default function AboutPage() {
  // Not finished yet (lib/underConstruction.ts): the barricade instead.
  if (UNDER_CONSTRUCTION.about) return <UnderConstruction />;
  return <About />;
}

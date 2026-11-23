import Playground from "@/components/sections/Playground";
import UnderConstruction from "@/components/ui/UnderConstruction";
import { UNDER_CONSTRUCTION } from "@/lib/underConstruction";

export default function PlaygroundPage() {
  // Not finished yet (lib/underConstruction.ts): the barricade instead.
  if (UNDER_CONSTRUCTION.play) return <UnderConstruction />;
  return <Playground />;
}

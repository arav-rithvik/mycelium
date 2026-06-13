import ForestDive from "@/components/ForestDive";
import ProblemSection from "@/components/ProblemSection";
import WhatItIsSection from "@/components/WhatItIsSection";
import TerminalDemo from "@/components/TerminalDemo";
import ScrollSnap from "@/components/ScrollSnap";

export default function Home() {
  return (
    <main className="bg-[#0a0a0a]">
      <ScrollSnap />
      <div data-snap>
        <ForestDive />
      </div>
      <div data-snap>
        <ProblemSection />
      </div>
      <div data-snap>
        <WhatItIsSection />
      </div>
      <div data-snap>
        <TerminalDemo />
      </div>
    </main>
  );
}

import ForestDive from "@/components/ForestDive";
import ProblemSection from "@/components/ProblemSection";
import WhatItIsSection from "@/components/WhatItIsSection";
import FeaturesSections from "@/components/FeaturesSections";
import InstallCompareSection from "@/components/InstallCompareSection";
import CommonsDashboardSection from "@/components/CommonsDashboardSection";
import BackdropFX from "@/components/BackdropFX";
import ScrollSnap from "@/components/ScrollSnap";

export default function Home() {
  return (
    <main className="relative">
      {/* Continuous, fixed root-network backdrop — shared by every section so the
          background never abruptly "turns" between beats. Sections below sit
          transparent on top of this, so scrolling reads as one living surface. */}
      <BackdropFX />
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
      <FeaturesSections />
      <InstallCompareSection />
      <CommonsDashboardSection />
    </main>
  );
}

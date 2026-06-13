import type { ComponentType } from "react";
import FeatureSection from "@/components/FeatureSection";
import SkillSynthesisSection from "@/components/features/SkillSynthesisSection";
import McpToolsSection from "@/components/features/McpToolsSection";
import ProvenHealingSection from "@/components/features/ProvenHealingSection";
import TrailsSection from "@/components/features/TrailsSection";
import EarnedTrustViz from "@/components/features/EarnedTrustViz";
import AntiPoisonViz from "@/components/features/AntiPoisonViz";

type GenericFeature = {
  kind: "generic";
  title: string;
  description: string;
  details?: { heading: string; text: string }[];
  commandStyle?: boolean;
  Viz: ComponentType;
};

type CustomFeature = {
  kind: "custom";
  Section: ComponentType<{ index: number; total: number }>;
};

type Feature = GenericFeature | CustomFeature;

// Final running order — six features.
//  01 Skills, not caches      → custom takeover section
//  02 The 5 MCP Tools         → custom takeover section (absorbed the privacy toggle)
//  03 Trails that strengthen  → generic
//  04 Trust you can watch fall→ generic
//  05 Proven + self-healing   → custom combined section (was two features)
//  06 Skills are data         → generic
const FEATURES: Feature[] = [
  { kind: "custom", Section: SkillSynthesisSection },
  { kind: "custom", Section: McpToolsSection },
  { kind: "custom", Section: TrailsSection },
  {
    kind: "generic",
    title: "Trust you can watch fall.",
    description:
      "Trust is a live Bayesian pass-rate from real success-checks. It climbs when a skill works, and drops the moment it does not.",
    details: [
      { heading: "Earned, not stamped", text: "Every apply runs the skill's success-check. The pass or fail is the only thing that moves trust." },
      { heading: "Usage is not trust", text: "A skill used 20 times but broken 18 of them has low trust. Outcomes count, popularity does not." },
      { heading: "It can fall", text: "One real failure drops the score immediately. Trust is a live track record, not a permanent badge." },
    ],
    Viz: EarnedTrustViz,
  },
  { kind: "custom", Section: ProvenHealingSection },
  {
    kind: "generic",
    title: "Skills are data, never commands.",
    description:
      "A poisoned skill can never build a track record, and a hard capability blacklist keeps skills from touching secrets or running destructive ops.",
    details: [
      { heading: "Trust gating", text: "A malicious skill that lies fails its success-check, so it can never build the track record agents rely on." },
      { heading: "Hard blacklist", text: "Enforced above the skill: no touching secrets, private data, source, or destructive ops, whatever text hides inside." },
      { heading: "Bounded blast radius", text: "We do not predict every attack. We make sure injection can never override the boundary." },
    ],
    Viz: AntiPoisonViz,
  },
];

export default function FeaturesSections() {
  const total = FEATURES.length;
  return (
    <>
      {FEATURES.map((f, i) => {
        const index = i + 1;
        if (f.kind === "custom") {
          const Section = f.Section;
          return <Section key={index} index={index} total={total} />;
        }
        const Viz = f.Viz;
        return (
          <FeatureSection
            key={f.title}
            index={index}
            total={total}
            title={f.title}
            description={f.description}
            details={f.details}
            commandStyle={f.commandStyle}
            side={i % 2 === 0 ? "left" : "right"}
          >
            <Viz />
          </FeatureSection>
        );
      })}
    </>
  );
}

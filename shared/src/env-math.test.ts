import { describe, it, expect } from "vitest";
import { tokensToImpact, tokensSaved, formatFooter } from "./env-math";

describe("tokensToImpact", () => {
  it("matches the published per-query factors at one query's worth of tokens (500)", () => {
    // 500 tokens == 1 'query' by our documented assumption -> the raw cited factors.
    const i = tokensToImpact(500);
    expect(i.energyWh).toBeCloseTo(0.42, 5); // arXiv:2505.09598
    expect(i.waterMl).toBeCloseTo(10, 5); // Li et al. arXiv:2304.03271
    expect(i.co2g).toBeCloseTo(0.16, 5); // EPA eGRID
  });

  it("scales linearly with tokens", () => {
    expect(tokensToImpact(1000).co2g).toBeCloseTo(2 * tokensToImpact(500).co2g, 6);
  });
});

describe("tokensSaved", () => {
  it("estimates ~80% saved when the actual cost is unknown", () => {
    expect(tokensSaved(10000)).toBe(8000);
  });

  it("uses the real delta when the actual cost is known", () => {
    expect(tokensSaved(10000, 2000)).toBe(8000);
  });

  it("never goes negative (reuse that cost more than scratch saves 0, not -X)", () => {
    expect(tokensSaved(10000, 12000)).toBe(0);
  });
});

describe("formatFooter", () => {
  it("renders the per-message savings line with skill, trust, and proven status", () => {
    const f = formatFooter({
      skillName: "nextjs-supabase-auth",
      trustScore: 0.93,
      tokensSaved: 14720,
      proven: true,
    });
    expect(f).toContain("🍄 Mycelium saved");
    expect(f).toContain("14,720 tokens");
    expect(f).toContain("nextjs-supabase-auth");
    expect(f).toContain("trust 0.93");
    expect(f).toContain("proven on your env");
  });

  it("switches water from mL to L past 1000 mL, and flags private skills", () => {
    const f = formatFooter({
      skillName: "x",
      trustScore: 0.5,
      tokensSaved: 60000, // 60000 * 0.02 mL/token = 1200 mL -> shown as L
      proven: false,
      isPrivate: true,
    });
    expect(f).toContain("1.20 L");
    expect(f).toContain("unproven — re-confirm");
    expect(f).toContain("🔒 private");
  });
});

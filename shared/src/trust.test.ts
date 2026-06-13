import { describe, it, expect } from "vitest";
import { bayesianTrust } from "./trust";

describe("bayesianTrust", () => {
  it("starts a brand-new skill at exactly 0.5 (honest 'unknown', not 0/0)", () => {
    expect(bayesianTrust(0, 0)).toBe(0.5);
  });

  it("does not jump to 1.0 on a single success (luck != proof)", () => {
    // 1 success -> 2/3, not 1.0. The prior resists small-sample flukes.
    expect(bayesianTrust(1, 0)).toBeCloseTo(0.667, 3);
  });

  it("reaches ~0.8 around 3 successes (the 'looks trustworthy' threshold)", () => {
    expect(bayesianTrust(3, 0)).toBeCloseTo(0.8, 5);
  });

  it("drops below 0.5 the moment a skill fails more than it works", () => {
    // The demo's 'trust goes DOWN' beat: used 20x but broke 18 of them -> low trust.
    expect(bayesianTrust(2, 18)).toBeLessThan(0.2);
  });

  it("rises with successes and falls with failures (monotonic)", () => {
    expect(bayesianTrust(5, 0)).toBeGreaterThan(bayesianTrust(4, 0));
    expect(bayesianTrust(4, 1)).toBeLessThan(bayesianTrust(4, 0));
  });

  it("approaches but never reaches 1.0 (always some doubt)", () => {
    expect(bayesianTrust(50, 0)).toBeGreaterThan(0.95);
    expect(bayesianTrust(50, 0)).toBeLessThan(1);
  });
});

import { describe, it, expect } from "vitest";
import { envSimilarity, compatibility, isProven } from "./fingerprint";
import { EnvFingerprint } from "./types";

const nextjs15: EnvFingerprint = { framework: "nextjs", frameworkVersion: "15.2", os: "darwin" };

describe("envSimilarity", () => {
  it("is 1.0 for an identical environment", () => {
    expect(envSimilarity(nextjs15, nextjs15)).toBeCloseTo(1, 5);
  });

  it("is 0 when the framework itself differs (a version match elsewhere can't rescue it)", () => {
    expect(envSimilarity({ framework: "nextjs" }, { framework: "react" })).toBe(0);
  });

  it("degrades smoothly across major versions of the same framework", () => {
    const proven19: EnvFingerprint = { framework: "react", frameworkVersion: "19" };
    const sameMajor = envSimilarity({ framework: "react", frameworkVersion: "19" }, proven19);
    const oneMajorOff = envSimilarity({ framework: "react", frameworkVersion: "20" }, proven19);
    const twoMajorsOff = envSimilarity({ framework: "react", frameworkVersion: "21" }, proven19);
    expect(sameMajor).toBeGreaterThan(oneMajorOff);
    expect(oneMajorOff).toBeGreaterThan(twoMajorsOff);
  });
});

describe("compatibility", () => {
  it("returns 1 when the requester gives no environment (nothing to fail)", () => {
    expect(compatibility(undefined, [])).toBe(1);
    expect(compatibility({}, [{ framework: "nextjs" }])).toBe(1);
  });

  it("returns 0.5 for a skill never proven anywhere (brand new)", () => {
    expect(compatibility({ framework: "nextjs" }, [])).toBe(0.5);
  });

  it("takes the BEST match across the proven envelope", () => {
    const envs: EnvFingerprint[] = [{ framework: "vue" }, { framework: "nextjs" }];
    expect(compatibility({ framework: "nextjs" }, envs)).toBe(1);
  });
});

describe("isProven (the 'drift is just a new environment' rule)", () => {
  it("treats the same major version as proven", () => {
    expect(
      isProven({ framework: "react", frameworkVersion: "19" }, [
        { framework: "react", frameworkVersion: "19" },
      ]),
    ).toBe(true);
  });

  it("treats a 2-major jump as UNPROVEN — re-confirm (the self-healing beat)", () => {
    // proven on react@19, requester on react@21 -> surfaced as unproven until re-confirmed.
    expect(
      isProven({ framework: "react", frameworkVersion: "21" }, [
        { framework: "react", frameworkVersion: "19" },
      ]),
    ).toBe(false);
  });
});

import { EnvFingerprint } from "./types";

/**
 * How close are two framework versions? We compare MAJOR versions only — a skill proven on
 * react@19 is usually fine on react@19.x but risky on react@20 (breaking changes land on majors).
 * Same major => 1.0; each major of distance costs 0.4; floored at 0. (19 vs 20 => 0.6, 19 vs 21 => 0.2.)
 */
function versionSimilarity(a: string, b: string): number {
  const majorA = parseInt(a, 10);
  const majorB = parseInt(b, 10);
  if (Number.isNaN(majorA) || Number.isNaN(majorB)) return a === b ? 1 : 0.5;
  return Math.max(0, 1 - 0.4 * Math.abs(majorA - majorB));
}

/** 0..1 overlap of one dep map against another (shared keys whose versions agree on major). */
function depsSimilarity(a: Record<string, string>, b: Record<string, string>): number {
  const keys = Object.keys(a);
  if (keys.length === 0) return 1; // requester pinned no deps -> nothing to fail
  let total = 0;
  for (const k of keys) {
    if (b[k] == null) continue; // proven env never used this dep
    total += versionSimilarity(a[k]!, b[k]!);
  }
  return total / keys.length;
}

/**
 * 0..1 overlap of a requester env against ONE proven env. We only judge the fields the requester
 * actually specified (we never penalize a skill for not pinning a runtime the requester didn't ask
 * about), and we weight them by how much they predict "will this skill still work here":
 * framework identity dominates, then framework version, then OS / runtime / shared deps.
 */
export function envSimilarity(req: EnvFingerprint, proven: EnvFingerprint): number {
  const parts: Array<{ weight: number; score: number }> = [];

  if (req.framework !== undefined) {
    const same = req.framework === proven.framework;
    parts.push({ weight: 0.4, score: same ? 1 : 0 });
    // version only matters once the framework matches; a version match on the wrong framework is meaningless
    if (req.frameworkVersion !== undefined && proven.frameworkVersion !== undefined) {
      parts.push({ weight: 0.3, score: same ? versionSimilarity(req.frameworkVersion, proven.frameworkVersion) : 0 });
    }
  }
  if (req.os !== undefined) {
    parts.push({ weight: 0.1, score: req.os === proven.os ? 1 : 0 });
  }
  if (req.runtime !== undefined) {
    parts.push({ weight: 0.1, score: req.runtime === proven.runtime ? 1 : 0 });
  }
  if (req.deps !== undefined) {
    parts.push({ weight: 0.1, score: depsSimilarity(req.deps, proven.deps ?? {}) });
  }

  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  if (totalWeight === 0) return 1; // requester specified nothing concrete -> no constraint to fail
  return parts.reduce((s, p) => s + p.weight * p.score, 0) / totalWeight;
}

/** Best compatibility of a requester env against the skill's proven envelope.
 *  Returns 1 when `req` is empty/undefined (no env constraint to fail). */
export function compatibility(req: EnvFingerprint | undefined, provenEnvs: EnvFingerprint[]): number {
  if (!req || Object.keys(req).length === 0) return 1;
  if (provenEnvs.length === 0) return 0.5; // brand new, unproven anywhere
  return Math.max(...provenEnvs.map((p) => envSimilarity(req, p)));
}

/** Is `req` already inside the proven envelope (compatibility >= threshold)? */
export function isProven(
  req: EnvFingerprint | undefined,
  provenEnvs: EnvFingerprint[],
  threshold = 0.7,
): boolean {
  return compatibility(req, provenEnvs) >= threshold;
}

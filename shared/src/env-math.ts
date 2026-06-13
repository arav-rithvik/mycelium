import { Impact } from "./types";
import {
  ENERGY_WH_PER_TOKEN,
  WATER_ML_PER_TOKEN,
  CO2_G_PER_TOKEN,
  REUSE_SAVED_FRACTION,
} from "./constants";

/** Convert a token count into environmental impact. Pure. */
export function tokensToImpact(tokens: number): Impact {
  return {
    tokens,
    energyWh: tokens * ENERGY_WH_PER_TOKEN,
    waterMl: tokens * WATER_ML_PER_TOKEN,
    co2g: tokens * CO2_G_PER_TOKEN,
  };
}

/** Tokens saved by reusing instead of re-solving. If actual unknown, estimate from the baseline. */
export function tokensSaved(tokensToCreate: number, actualTokens?: number): number {
  if (actualTokens == null) return Math.round(tokensToCreate * REUSE_SAVED_FRACTION);
  return Math.max(0, tokensToCreate - actualTokens);
}

/** The per-message footer Claude appends. `proven` => "proven on your env" vs "unproven — re-confirm". */
export function formatFooter(opts: {
  skillName: string;
  trustScore: number;
  tokensSaved: number;
  proven: boolean;
  isPrivate?: boolean;
}): string {
  const i = tokensToImpact(opts.tokensSaved);
  const water = i.waterMl >= 1000 ? `${(i.waterMl / 1000).toFixed(2)} L` : `${Math.round(i.waterMl)} mL`;
  const env = opts.proven ? "proven on your env" : "unproven — re-confirm";
  const priv = opts.isPrivate ? " · 🔒 private" : "";
  return [
    `---`,
    `🍄 Mycelium saved ~${opts.tokensSaved.toLocaleString()} tokens this turn → ` +
      `${i.energyWh.toFixed(1)} Wh · ${water} water · ${i.co2g.toFixed(1)} g CO₂ not emitted`,
    `   (skill: ${opts.skillName} · trust ${opts.trustScore.toFixed(2)} · ${env}${priv})`,
  ].join("\n");
}

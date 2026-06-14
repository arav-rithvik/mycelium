// Human-relatable equivalents from cumulative impact (energy Wh, water mL, CO₂ g).
// Conservative, defensible constants — see the dashboard build brief.
export function equivalents(energyWh: number, waterMl: number, co2g: number) {
  const kWh = energyWh / 1000;
  const liters = waterMl / 1000;
  const kgCO2 = co2g / 1000;
  return {
    kWh,
    liters,
    kgCO2,
    homeDays: kWh / 28.8, // avg US home ~28.8 kWh/day
    phoneCharges: kWh / 0.0114, // ~11.4 Wh per full phone charge
    carMiles: kgCO2 / 0.404, // EPA ~404 g CO₂ / mile
    treesYear: kgCO2 / 21, // a tree absorbs ~21 kg CO₂ / year
    showers: liters / 65, // avg shower ~65 L
  };
}

// Category → vibrant accent, shared by the graph + try-it chips.
export const CATEGORY_COLOR: Record<string, string> = {
  auth: "#34d399",
  payments: "#fbbf24",
  database: "#60a5fa",
  frontend: "#f472b6",
  devops: "#a78bfa",
  api: "#22d3ee",
  testing: "#4ade80",
  other: "#94a3b8",
};

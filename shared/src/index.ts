// The package barrel — types + pure math. NOTE: embed() is intentionally NOT re-exported here
// (import it from "@mycelium/shared/embed") so the transformers runtime stays out of the web bundle.
export * from "./types";
export * from "./constants";
export * from "./env-math";
export * from "./trust";
export * from "./fingerprint";

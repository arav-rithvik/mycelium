/**
 * Bayesian posterior-mean pass-rate. Usage alone never moves this; only success_check outcomes do.
 *
 * Why (s+1)/(s+f+2) and not s/(s+f): with zero data, s/(s+f) is 0/0 (undefined), and a single
 * early success would read as 100% trust — luck masquerading as proof. This is the mean of a
 * Beta(1,1) prior updated by the outcomes (Laplace's rule of succession): it starts every skill
 * at exactly 0.5 (honest "unknown"), and each real pass/fail nudges it. 3 successes -> ~0.8;
 * one failure visibly drops it. Trust is earned by working, repeatedly — not stamped once.
 */
export function bayesianTrust(successCount: number, failureCount: number): number {
  return (successCount + 1) / (successCount + failureCount + 2);
}

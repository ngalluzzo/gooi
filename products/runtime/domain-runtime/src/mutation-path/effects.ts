import type { EffectKind } from "@gooi/capability-contracts/capability-port";

/**
 * Drops write/session/emit effects from simulation-mode observations.
 */
export const sanitizeSimulationEffects = (
	effects: readonly EffectKind[],
): readonly EffectKind[] =>
	effects.filter((effect) => effect === "read" || effect === "compute");

import type { EffectKind } from "@gooi/capability-contracts/capability-port";

/**
 * Normalizes observed effects to deterministic ordering with deduplication.
 */
export const normalizeObservedEffects = (
	effects: readonly EffectKind[],
): readonly EffectKind[] =>
	[...new Set(effects)].sort((left, right) => left.localeCompare(right));

/**
 * Drops write/session/emit effects from simulation-mode observations.
 */
export const sanitizeSimulationEffects = (
	effects: readonly EffectKind[],
): readonly EffectKind[] =>
	effects.filter((effect) => effect === "read" || effect === "compute");

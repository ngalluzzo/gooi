import type { EffectKind } from "@gooi/capability-contracts/capability-port";
import { fail, ok } from "../shared/result";
import type { RuntimeResult } from "../shared/types";

/**
 * Ensures all observed side effects were declared in the capability contract.
 */
export const ensureObservedEffectsDeclared = (
	declaredEffects: readonly EffectKind[],
	observedEffects: readonly EffectKind[],
): RuntimeResult<void> => {
	const declared = new Set(declaredEffects);

	for (const effect of observedEffects) {
		if (!declared.has(effect)) {
			return fail("effect_violation_error", "Observed undeclared effect.", {
				effect,
			});
		}
	}

	return ok(undefined);
};

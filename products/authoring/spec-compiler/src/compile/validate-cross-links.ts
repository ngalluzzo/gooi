import type {
	CanonicalSpecModel,
	CompileDiagnostic,
} from "./compile.contracts";
import { validateAccessLinks } from "./cross-links/validate-access-links";
import { validateCapabilityLinks } from "./cross-links/validate-capability-links";
import { validateDuplicateIds } from "./cross-links/validate-duplicate-ids";
import { validateEntrypointLinks } from "./cross-links/validate-entrypoint-links";
import { validateScenarioLinks } from "./cross-links/validate-scenario-links";
import { validateSurfaceLinks } from "./cross-links/validate-surface-links";

/**
 * Runs feature-scoped cross-link validators against the canonical spec model.
 *
 * @param model - Canonical in-memory model.
 * @returns Collected cross-link diagnostics.
 */
export const validateCrossLinks = (
	model: CanonicalSpecModel,
): readonly CompileDiagnostic[] => [
	...validateDuplicateIds(model),
	...validateAccessLinks(model),
	...validateEntrypointLinks(model),
	...validateSurfaceLinks(model),
	...validateCapabilityLinks(model),
	...validateScenarioLinks(model),
];

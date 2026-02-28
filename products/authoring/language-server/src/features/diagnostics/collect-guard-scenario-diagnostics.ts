import type { AuthoringReadContext } from "../../contracts/read-context";
import { collectGuardDiagnostics } from "./collect-guard-diagnostics";
import { collectScenarioDiagnostics } from "./collect-scenario-diagnostics";
import type { AuthoringDiagnostic } from "./guard-scenario-diagnostic-shared";

/**
 * Collects guard/scenario diagnostics from optional source spec content.
 */
export const collectGuardScenarioDiagnostics = (
	context: AuthoringReadContext,
): AuthoringDiagnostic[] => [
	...collectGuardDiagnostics(context),
	...collectScenarioDiagnostics(context),
];

import { lockfileContracts } from "@gooi/authoring-contracts/lockfile";
import { checksContracts } from "@gooi/conformance-contracts/checks";
import { reportsContracts } from "@gooi/conformance-contracts/reports";
import { authoringPositionSchema } from "@gooi/language-server/contracts/positions";
import { authoringReadContextSchema } from "@gooi/language-server/contracts/read-context";
import { z } from "zod";

/**
 * Named conformance checks for RFC-0003 authoring intelligence behavior.
 */
export const authoringConformanceCheckIdSchema = z.enum([
	"completion_correctness",
	"cli_lsp_parity",
	"diagnostics_parity",
	"reachability_diagnostics",
	"guard_scenario_diagnostics",
	"guard_scenario_completion",
	"lens_correctness",
	"rename_safety",
	"expression_symbol_resolution",
	"signal_impact_chain",
]);

/**
 * One authoring conformance check result.
 */
export const authoringConformanceCheckSchema = z.object({
	id: authoringConformanceCheckIdSchema,
	passed: checksContracts.conformanceCheckResultSchema.shape.passed,
	detail: checksContracts.conformanceCheckResultSchema.shape.detail,
});

/**
 * Parsed authoring conformance check result.
 */
export type AuthoringConformanceCheck = z.infer<
	typeof authoringConformanceCheckSchema
>;

/**
 * Aggregate authoring conformance report.
 */
export const authoringConformanceReportSchema = z.object({
	passed: reportsContracts.conformanceSuiteReportSchema.shape.passed,
	checks: z.array(authoringConformanceCheckSchema),
});

/**
 * Parsed authoring conformance report.
 */
export type AuthoringConformanceReport = z.infer<
	typeof authoringConformanceReportSchema
>;

/**
 * Input payload for running authoring conformance checks.
 */
export const runAuthoringConformanceInputSchema = z.object({
	context: authoringReadContextSchema,
	staleLockfile: lockfileContracts.authoringLockfileSchema,
	invalidReachabilitySourceSpec: z.unknown().optional(),
	invalidGuardScenarioSourceSpec: z.unknown().optional(),
	positions: z.object({
		capabilityCompletion: authoringPositionSchema,
		signalCompletion: authoringPositionSchema,
		guardPolicyCompletion: authoringPositionSchema,
		scenarioPersonaCompletion: authoringPositionSchema,
		expressionReference: authoringPositionSchema,
		ambientSymbol: authoringPositionSchema,
	}),
	renameTarget: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
	renameCollisionTarget: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
});

/**
 * Parsed run-authoring-conformance input.
 */
export type RunAuthoringConformanceInput = z.infer<
	typeof runAuthoringConformanceInputSchema
>;

import { checksContracts } from "@gooi/conformance-contracts/checks";
import { reportsContracts } from "@gooi/conformance-contracts/reports";
import { authoringPositionSchema } from "@gooi/language-server/contracts/positions";
import { z } from "zod";

/**
 * Named conformance checks for RFC-0003 authoring intelligence behavior.
 */
export const authoringConformanceCheckIdSchema = z.enum([
	"completion_correctness",
	"diagnostics_parity",
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
	context: z.object({
		documentUri: z.string().min(1),
		documentPath: z.string().min(1),
		documentText: z.string(),
		compiledEntrypointBundleIdentity: z.any(),
		capabilityIndexSnapshot: z.any(),
		symbolGraphSnapshot: z.any(),
		lockfile: z.any(),
	}),
	staleLockfile: z.any(),
	positions: z.object({
		capabilityCompletion: authoringPositionSchema,
		signalCompletion: authoringPositionSchema,
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

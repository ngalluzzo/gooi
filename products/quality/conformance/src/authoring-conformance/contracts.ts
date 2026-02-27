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
	passed: z.boolean(),
	message: z.string().min(1),
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
	passed: z.boolean(),
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
		compiledEntrypointBundleIdentity: z.unknown(),
		capabilityIndexSnapshot: z.unknown(),
		symbolGraphSnapshot: z.unknown(),
		lockfile: z.unknown(),
	}),
	staleLockfile: z.unknown(),
	positions: z.object({
		capabilityCompletion: z.object({
			line: z.number().int().nonnegative(),
			character: z.number().int().nonnegative(),
		}),
		signalCompletion: z.object({
			line: z.number().int().nonnegative(),
			character: z.number().int().nonnegative(),
		}),
		expressionReference: z.object({
			line: z.number().int().nonnegative(),
			character: z.number().int().nonnegative(),
		}),
		ambientSymbol: z.object({
			line: z.number().int().nonnegative(),
			character: z.number().int().nonnegative(),
		}),
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

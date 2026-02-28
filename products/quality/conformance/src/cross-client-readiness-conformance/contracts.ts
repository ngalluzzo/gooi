import { checksContracts } from "@gooi/conformance-contracts/checks";
import { reportsContracts } from "@gooi/conformance-contracts/reports";
import { authoringPositionSchema } from "@gooi/language-server/contracts/positions";
import { authoringReadContextSchema } from "@gooi/language-server/contracts/read-context";
import { z } from "zod";

/**
 * Named checks for RFC-0004 cross-client readiness baseline.
 */
export const crossClientReadinessCheckIdSchema = z.enum([
	"portable_protocol_surface",
	"protocol_fixture_parity",
	"client_deviation_catalog",
]);

/**
 * One cross-client readiness check result.
 */
export const crossClientReadinessCheckSchema = z.object({
	id: crossClientReadinessCheckIdSchema,
	passed: checksContracts.conformanceCheckResultSchema.shape.passed,
	detail: checksContracts.conformanceCheckResultSchema.shape.detail,
});

/**
 * Parsed check result for cross-client readiness.
 */
export type CrossClientReadinessCheck = z.infer<
	typeof crossClientReadinessCheckSchema
>;

/**
 * Aggregate cross-client readiness report.
 */
export const crossClientReadinessReportSchema = z.object({
	passed: reportsContracts.conformanceSuiteReportSchema.shape.passed,
	checks: z.array(crossClientReadinessCheckSchema),
});

/**
 * Parsed cross-client readiness report.
 */
export type CrossClientReadinessReport = z.infer<
	typeof crossClientReadinessReportSchema
>;

/**
 * Input payload for running cross-client readiness checks.
 */
export const runCrossClientReadinessInputSchema = z.object({
	context: authoringReadContextSchema,
	positions: z.object({
		capabilityCompletion: authoringPositionSchema,
		expressionReference: authoringPositionSchema,
	}),
	renameTarget: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
});

/**
 * Parsed cross-client readiness input.
 */
export type RunCrossClientReadinessInput = z.infer<
	typeof runCrossClientReadinessInputSchema
>;

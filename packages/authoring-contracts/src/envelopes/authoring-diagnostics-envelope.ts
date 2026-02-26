import { z } from "zod";

import {
	authoringEnvelopeVersionSchema,
	authoringTimestampSchema,
} from "./shared";

const positionSchema = z.object({
	line: z.number().int().nonnegative(),
	character: z.number().int().nonnegative(),
});

const rangeSchema = z.object({
	start: positionSchema,
	end: positionSchema,
});

/**
 * Diagnostic severity values used by authoring diagnostics.
 */
export const authoringDiagnosticSeveritySchema = z.enum([
	"error",
	"warning",
	"info",
]);

/**
 * One diagnostic emitted by authoring analysis.
 */
export const authoringDiagnosticSchema = z.object({
	code: z.string().min(1),
	severity: authoringDiagnosticSeveritySchema,
	message: z.string().min(1),
	path: z.string().min(1),
	range: rangeSchema,
	staleArtifacts: z.boolean().optional(),
});

const paritySchema = z.object({
	status: z.enum(["matched", "mismatch"]),
	lockfileHash: z
		.string()
		.regex(/^[a-f0-9]{64}$/)
		.optional(),
});

/**
 * Diagnostics envelope returned by authoring CLI and LSP diagnostics handlers.
 */
export const authoringDiagnosticsEnvelopeSchema = z.object({
	envelopeVersion: authoringEnvelopeVersionSchema,
	documentUri: z.string().min(1),
	generatedAt: authoringTimestampSchema,
	parity: paritySchema,
	diagnostics: z.array(authoringDiagnosticSchema),
});

/**
 * Parsed diagnostics envelope.
 */
export type AuthoringDiagnosticsEnvelope = z.infer<
	typeof authoringDiagnosticsEnvelopeSchema
>;

/**
 * Parses an untrusted diagnostics envelope.
 *
 * @param value - Untrusted diagnostics value.
 * @returns Parsed diagnostics envelope.
 *
 * @example
 * parseAuthoringDiagnosticsEnvelope({
 *   envelopeVersion: "1.0.0",
 *   documentUri: "spec://demo.yml",
 *   generatedAt: "2026-02-26T00:00:00.000Z",
 *   parity: { status: "matched" },
 *   diagnostics: [],
 * });
 */
export const parseAuthoringDiagnosticsEnvelope = (
	value: unknown,
): AuthoringDiagnosticsEnvelope =>
	authoringDiagnosticsEnvelopeSchema.parse(value);

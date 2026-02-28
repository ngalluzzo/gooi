import {
	type DiagnosticSeverity,
	diagnosticRecordSchema,
	diagnosticSeveritySchema,
} from "@gooi/app-spec-contracts/compiled";
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

const authoringDiagnosticQuickFixSchema = z.object({
	id: z.string().min(1),
	title: z.string().min(1),
	contractRef: z.string().min(1),
	replacement: z.string().min(1).optional(),
});

/**
 * Diagnostic severity values used by authoring diagnostics.
 */
export const authoringDiagnosticSeveritySchema = diagnosticSeveritySchema;

/**
 * Parsed authoring diagnostic severity value.
 */
export type AuthoringDiagnosticSeverity = DiagnosticSeverity;

/**
 * One diagnostic emitted by authoring analysis.
 */
export const authoringDiagnosticSchema = z.object({
	...diagnosticRecordSchema.shape,
	severity: authoringDiagnosticSeveritySchema,
	range: rangeSchema,
	staleArtifacts: z.boolean().optional(),
	hint: z.string().min(1).optional(),
	quickFixes: z.array(authoringDiagnosticQuickFixSchema).optional(),
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

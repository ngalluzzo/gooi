import { z } from "zod";

import {
	authoringEnvelopeVersionSchema,
	authoringRequestIdSchema,
	authoringTimestampSchema,
} from "./shared";

const timingsSchema = z.object({
	startedAt: authoringTimestampSchema,
	completedAt: authoringTimestampSchema,
	durationMs: z.number().nonnegative(),
});

/**
 * Success envelope returned by authoring handlers.
 */
export const authoringResultEnvelopeSchema = z.object({
	envelopeVersion: authoringEnvelopeVersionSchema,
	requestId: authoringRequestIdSchema,
	ok: z.literal(true),
	result: z.unknown(),
	timings: timingsSchema,
	meta: z
		.object({
			artifactHash: z.string().regex(/^[a-f0-9]{64}$/),
		})
		.optional(),
});

/**
 * Parsed success envelope returned by authoring handlers.
 */
export type AuthoringResultEnvelope = z.infer<
	typeof authoringResultEnvelopeSchema
>;

/**
 * Parses an untrusted authoring success envelope.
 *
 * @param value - Untrusted result value.
 * @returns Parsed success envelope.
 *
 * @example
 * parseAuthoringResultEnvelope({
 *   envelopeVersion: "1.0.0",
 *   requestId: "req-1",
 *   ok: true,
 *   result: {},
 *   timings: {
 *     startedAt: "2026-02-26T00:00:00.000Z",
 *     completedAt: "2026-02-26T00:00:01.000Z",
 *     durationMs: 1000,
 *   },
 * });
 */
export const parseAuthoringResultEnvelope = (
	value: unknown,
): AuthoringResultEnvelope => authoringResultEnvelopeSchema.parse(value);

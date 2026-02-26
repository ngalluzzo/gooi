import { z } from "zod";

/**
 * Envelope version identifier for authoring contracts.
 */
export const authoringEnvelopeVersionSchema = z.literal("1.0.0");

/**
 * Supported authoring envelope version.
 */
export type AuthoringEnvelopeVersion = z.infer<
	typeof authoringEnvelopeVersionSchema
>;

/**
 * Shared request identifier schema used across authoring envelopes.
 */
export const authoringRequestIdSchema = z.string().min(1);

/**
 * Shared ISO-8601 timestamp schema used across authoring envelopes.
 */
export const authoringTimestampSchema = z.string().datetime();

/**
 * Parses an authoring envelope request id.
 *
 * @param value - Untrusted request id.
 * @returns Parsed request id.
 *
 * @example
 * parseAuthoringRequestId("req-01");
 */
export const parseAuthoringRequestId = (value: unknown): string =>
	authoringRequestIdSchema.parse(value);

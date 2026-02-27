import {
	type JsonValue,
	jsonValueSchema,
} from "@gooi/contract-primitives/json";
import { z } from "zod";

import {
	authoringEnvelopeVersionSchema,
	authoringRequestIdSchema,
	authoringTimestampSchema,
} from "./shared";

/**
 * Supported authoring operation names for request routing.
 */
export const authoringOperationSchema = z.enum([
	"diagnose",
	"complete",
	"rename",
	"index.build",
]);

/**
 * Authoring request operation identifier.
 */
export type AuthoringOperation = z.infer<typeof authoringOperationSchema>;

/**
 * Invocation envelope for authoring CLI and LSP requests.
 */
export const authoringRequestEnvelopeSchema = z.object({
	envelopeVersion: authoringEnvelopeVersionSchema,
	requestId: authoringRequestIdSchema,
	requestedAt: authoringTimestampSchema,
	operation: authoringOperationSchema,
	payload: jsonValueSchema,
	meta: z
		.object({
			traceId: z.string().min(1),
			documentUri: z.string().min(1).optional(),
		})
		.optional(),
});

/**
 * Parsed authoring request envelope.
 */
export type AuthoringRequestEnvelope = Omit<
	z.infer<typeof authoringRequestEnvelopeSchema>,
	"payload"
> & {
	readonly payload: JsonValue;
};

/**
 * Parses an untrusted authoring request envelope.
 *
 * @param value - Untrusted request value.
 * @returns Parsed request envelope.
 *
 * @example
 * parseAuthoringRequestEnvelope({
 *   envelopeVersion: "1.0.0",
 *   requestId: "req-1",
 *   requestedAt: "2026-02-26T00:00:00.000Z",
 *   operation: "diagnose",
 *   payload: {},
 * });
 */
export const parseAuthoringRequestEnvelope = (
	value: unknown,
): AuthoringRequestEnvelope => authoringRequestEnvelopeSchema.parse(value);

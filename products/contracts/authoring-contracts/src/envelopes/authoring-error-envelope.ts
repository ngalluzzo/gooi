import {
	type JsonObject,
	jsonObjectSchema,
} from "@gooi/contract-primitives/json";
import { z } from "zod";

import {
	authoringEnvelopeVersionSchema,
	authoringRequestIdSchema,
} from "./shared";

/**
 * Stable authoring error codes.
 */
export const authoringErrorCodeSchema = z.enum([
	"authoring_parse_error",
	"authoring_symbol_error",
	"rename_conflict_error",
	"catalog_mismatch_error",
	"artifact_mismatch_error",
	"unsupported_client_capability_error",
]);

/**
 * Authoring error code identifier.
 */
export type AuthoringErrorCode = z.infer<typeof authoringErrorCodeSchema>;

const errorShapeSchema = z.object({
	code: authoringErrorCodeSchema,
	message: z.string().min(1),
	retryable: z.boolean(),
	details: jsonObjectSchema.optional(),
});

/**
 * Failure envelope returned by authoring handlers.
 */
export const authoringErrorEnvelopeSchema = z.object({
	envelopeVersion: authoringEnvelopeVersionSchema,
	requestId: authoringRequestIdSchema,
	ok: z.literal(false),
	error: errorShapeSchema,
});

/**
 * Parsed failure envelope returned by authoring handlers.
 */
export type AuthoringErrorEnvelope = Omit<
	z.infer<typeof authoringErrorEnvelopeSchema>,
	"error"
> & {
	readonly error: Omit<z.infer<typeof errorShapeSchema>, "details"> & {
		readonly details?: JsonObject | undefined;
	};
};

/**
 * Parses an untrusted authoring failure envelope.
 *
 * @param value - Untrusted error value.
 * @returns Parsed failure envelope.
 *
 * @example
 * parseAuthoringErrorEnvelope({
 *   envelopeVersion: "1.0.0",
 *   requestId: "req-1",
 *   ok: false,
 *   error: {
 *     code: "authoring_parse_error",
 *     message: "Invalid mapping.",
 *     retryable: false,
 *   },
 * });
 */
export const parseAuthoringErrorEnvelope = (
	value: unknown,
): AuthoringErrorEnvelope => authoringErrorEnvelopeSchema.parse(value);

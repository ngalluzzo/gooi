import {
	type JsonObject,
	jsonObjectSchema,
} from "@gooi/contract-primitives/json";
import { z } from "zod";
import { surfaceEnvelopeVersionSchema } from "../envelope-version/envelope-version";

/**
 * Runtime schema for emitted signal envelopes.
 */
export const signalEnvelopeSchema = z.object({
	envelopeVersion: surfaceEnvelopeVersionSchema,
	signalId: z.string().min(1),
	signalVersion: z.number().int().nonnegative(),
	payload: jsonObjectSchema.optional(),
	payloadHash: z.string().min(1),
	emittedAt: z.iso.datetime({ offset: true }),
});

/**
 * Emitted signal envelope.
 */
export type SignalEnvelope = Omit<
	z.infer<typeof signalEnvelopeSchema>,
	"payload"
> & {
	readonly payload?: JsonObject | undefined;
};

/**
 * Parses one untrusted signal envelope.
 */
export const parseSignalEnvelope = (value: unknown): SignalEnvelope =>
	signalEnvelopeSchema.parse(value);

/**
 * Runtime schema for refresh triggers derived from emitted signals.
 */
export const refreshTriggerSchema = z.object({
	signalId: z.string().min(1),
	signalVersion: z.number().int().nonnegative(),
	payloadHash: z.string().min(1),
});

/**
 * Refresh trigger used for query invalidation matching.
 */
export type RefreshTrigger = z.infer<typeof refreshTriggerSchema>;

/**
 * Parses one untrusted refresh trigger payload.
 */
export const parseRefreshTrigger = (value: unknown): RefreshTrigger =>
	refreshTriggerSchema.parse(value);

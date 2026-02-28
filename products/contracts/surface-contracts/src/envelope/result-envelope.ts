import {
	type EffectKind,
	effectKindSchema,
} from "@gooi/capability-contracts/capability-port";
import {
	type JsonObject,
	type JsonValue,
	jsonObjectSchema,
	jsonValueSchema,
} from "@gooi/contract-primitives/json";
import { z } from "zod";
import {
	type SurfaceEnvelopeVersion,
	surfaceEnvelopeVersionSchema,
} from "./envelope-version";
import {
	type RefreshTrigger,
	refreshTriggerSchema,
	type SignalEnvelope,
	signalEnvelopeSchema,
} from "./signal-envelope";

/**
 * Runtime schema for typed execution errors embedded in failed result envelopes.
 */
export const typedErrorEnvelopeSchema = z.object({
	envelopeVersion: surfaceEnvelopeVersionSchema,
	code: z.string().min(1),
	message: z.string().min(1),
	retryable: z.boolean(),
	details: jsonObjectSchema.optional(),
	typed: jsonValueSchema.optional(),
});

type ParsedTypedErrorEnvelope = z.infer<typeof typedErrorEnvelopeSchema>;

type TypedErrorEnvelopeShape = Omit<
	ParsedTypedErrorEnvelope,
	"details" | "typed" | "envelopeVersion"
> & {
	readonly envelopeVersion: SurfaceEnvelopeVersion;
	readonly details?: JsonObject | undefined;
};

/**
 * Structured typed execution error envelope.
 */
export type TypedErrorEnvelope<TTypedError = JsonValue> =
	TypedErrorEnvelopeShape & {
		readonly typed?: TTypedError | undefined;
	};

/**
 * Runtime schema for result envelopes returned by entrypoint execution.
 */
export const resultEnvelopeSchema = z.object({
	envelopeVersion: surfaceEnvelopeVersionSchema,
	traceId: z.string().min(1),
	invocationId: z.string().min(1),
	ok: z.boolean(),
	output: jsonValueSchema.optional(),
	error: typedErrorEnvelopeSchema.optional(),
	emittedSignals: z.array(signalEnvelopeSchema),
	observedEffects: z.array(effectKindSchema),
	timings: z.object({
		startedAt: z.iso.datetime({ offset: true }),
		completedAt: z.iso.datetime({ offset: true }),
		durationMs: z.number().nonnegative(),
	}),
	meta: z.object({
		replayed: z.boolean(),
		artifactHash: z.string().min(1),
		affectedQueryIds: z.array(z.string().min(1)),
		refreshTriggers: z.array(refreshTriggerSchema),
	}),
});

type ParsedResultEnvelope = z.infer<typeof resultEnvelopeSchema>;

type ResultEnvelopeShape = Omit<
	ParsedResultEnvelope,
	| "output"
	| "error"
	| "observedEffects"
	| "meta"
	| "emittedSignals"
	| "envelopeVersion"
> & {
	readonly envelopeVersion: SurfaceEnvelopeVersion;
};

/**
 * Result envelope returned by runtime entrypoint execution.
 */
export type ResultEnvelope<
	TOutput = JsonValue,
	TTypedError = JsonValue,
> = ResultEnvelopeShape & {
	readonly output?: TOutput | undefined;
	readonly error?: TypedErrorEnvelope<TTypedError> | undefined;
	readonly emittedSignals: readonly SignalEnvelope[];
	readonly observedEffects: readonly EffectKind[];
	readonly meta: {
		readonly replayed: boolean;
		readonly artifactHash: string;
		readonly affectedQueryIds: readonly string[];
		readonly refreshTriggers: readonly RefreshTrigger[];
	};
};

/**
 * Parses one untrusted typed error envelope.
 */
export const parseTypedErrorEnvelope = (
	value: unknown,
): TypedErrorEnvelope<JsonValue> => typedErrorEnvelopeSchema.parse(value);

/**
 * Parses one untrusted result envelope.
 */
export const parseResultEnvelope = (
	value: unknown,
): ResultEnvelope<JsonValue, JsonValue> => resultEnvelopeSchema.parse(value);

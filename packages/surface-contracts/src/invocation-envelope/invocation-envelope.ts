import { principalContextSchema } from "@gooi/host-contracts/principal";
import { z } from "zod";
import {
	type SurfaceEnvelopeVersion,
	surfaceEnvelopeVersionSchema,
} from "../envelope-version/envelope-version";

/**
 * Runtime schema for invocation envelopes.
 */
export const invocationEnvelopeSchema = z.object({
	envelopeVersion: surfaceEnvelopeVersionSchema,
	traceId: z.string().min(1),
	invocationId: z.string().min(1),
	entrypointId: z.string().min(1),
	entrypointKind: z.enum(["query", "mutation"]),
	principal: principalContextSchema,
	input: z.record(z.string(), z.unknown()),
	meta: z.object({
		idempotencyKey: z.string().min(1).optional(),
		requestReceivedAt: z.iso.datetime({ offset: true }),
	}),
});

type ParsedInvocationEnvelope = z.infer<typeof invocationEnvelopeSchema>;

type InvocationMeta = Omit<
	ParsedInvocationEnvelope["meta"],
	"idempotencyKey"
> & {
	readonly idempotencyKey?: string;
};

type InvocationEnvelopeShape = Omit<
	ParsedInvocationEnvelope,
	"input" | "envelopeVersion" | "meta"
> & {
	readonly envelopeVersion: SurfaceEnvelopeVersion;
	readonly meta: InvocationMeta;
};

/**
 * Invocation envelope for one entrypoint execution.
 */
export type InvocationEnvelope<Input> = InvocationEnvelopeShape & {
	readonly input: Input;
};

/**
 * Parses one untrusted invocation envelope.
 */
export const parseInvocationEnvelope = (
	value: unknown,
): InvocationEnvelope<Readonly<Record<string, unknown>>> =>
	invocationEnvelopeSchema.parse(value) as InvocationEnvelope<
		Readonly<Record<string, unknown>>
	>;

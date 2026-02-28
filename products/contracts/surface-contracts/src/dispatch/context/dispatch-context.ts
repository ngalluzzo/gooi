import { providerManifestContracts } from "@gooi/capability-contracts/provider-manifest";
import { z } from "zod";

/**
 * Canonical host where this surface invocation originated.
 */
export const dispatchInvocationHostSchema =
	providerManifestContracts.executionHostSchema;

/**
 * Invocation host identifier for dispatch context.
 */
export type DispatchInvocationHost = z.infer<
	typeof dispatchInvocationHostSchema
>;

/**
 * Runtime schema for canonical dispatch context fields.
 */
export const dispatchContextSchema = z
	.object({
		surfaceId: z.string().min(1),
		invocationHost: dispatchInvocationHostSchema,
	})
	.strict();

/**
 * Canonical dispatch context propagated downstream.
 */
export type DispatchContext = z.infer<typeof dispatchContextSchema>;

/**
 * Parses one untrusted dispatch invocation host value.
 */
export const parseDispatchInvocationHost = (
	value: unknown,
): DispatchInvocationHost => dispatchInvocationHostSchema.parse(value);

/**
 * Parses one untrusted dispatch context payload.
 */
export const parseDispatchContext = (value: unknown): DispatchContext =>
	dispatchContextSchema.parse(value);

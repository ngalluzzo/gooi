import { z } from "zod";

export const executionHostSchema = z.enum([
	"browser",
	"node",
	"edge",
	"worker",
]);

export const capabilityReachabilityModeSchema = z.enum([
	"local",
	"delegated",
	"unreachable",
]);

export const localCapabilityBindingResolutionSchema = z.object({
	mode: z.literal("local"),
	targetHost: executionHostSchema,
	providerId: z.string().min(1),
});

export const delegatedCapabilityBindingResolutionSchema = z.object({
	mode: z.literal("delegated"),
	targetHost: executionHostSchema,
	providerId: z.string().min(1),
	delegateRouteId: z.string().min(1),
});

export const unreachableCapabilityBindingResolutionSchema = z.object({
	mode: z.literal("unreachable"),
	reason: z.string().min(1).optional(),
});

export const capabilityBindingResolutionSchema = z.discriminatedUnion("mode", [
	localCapabilityBindingResolutionSchema,
	delegatedCapabilityBindingResolutionSchema,
	unreachableCapabilityBindingResolutionSchema,
]);

/**
 * Supported execution host value in binding artifacts.
 */
export type ExecutionHost = z.infer<typeof executionHostSchema>;

/**
 * Reachability mode for required capability bindings.
 */
export type CapabilityReachabilityMode = z.infer<
	typeof capabilityReachabilityModeSchema
>;

/**
 * One required capability reachability classification.
 */
export type CapabilityBindingResolution = z.infer<
	typeof capabilityBindingResolutionSchema
>;

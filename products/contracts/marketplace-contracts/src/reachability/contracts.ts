/**
 * Canonical boundary contract API.
 */
import { z } from "zod";
import * as policy from "./policy";

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

export type ExecutionHost = z.infer<typeof executionHostSchema>;
export type CapabilityReachabilityMode = z.infer<
	typeof capabilityReachabilityModeSchema
>;
export type CapabilityBindingResolution = z.infer<
	typeof capabilityBindingResolutionSchema
>;

export const reachabilityContracts = Object.freeze({
	executionHostSchema,
	capabilityReachabilityModeSchema,
	localCapabilityBindingResolutionSchema,
	delegatedCapabilityBindingResolutionSchema,
	unreachableCapabilityBindingResolutionSchema,
	capabilityBindingResolutionSchema,
	isCapabilityReachable: policy.isCapabilityReachable,
});

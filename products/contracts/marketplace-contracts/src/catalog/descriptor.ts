import { z } from "zod";
import { executionHostSchema } from "../reachability/contracts";
import { semverSchema } from "../shared/semver";

const providerReference = (
	providerId: string,
	providerVersion: string,
): string => `${providerId}@${providerVersion}`;

export const catalogDescriptorVersionSchema = z.literal("1.0.0");

export type CatalogDescriptorVersion = z.infer<
	typeof catalogDescriptorVersionSchema
>;

export const catalogCapabilityExecutionDescriptorSchema = z.object({
	portId: z.string().min(1),
	portVersion: semverSchema,
	mode: z.enum(["local", "delegated"]),
	targetHost: executionHostSchema,
	delegateRouteId: z.string().min(1).optional(),
	delegateDescriptor: z.string().min(1).optional(),
});

export type CatalogCapabilityExecutionDescriptor = z.infer<
	typeof catalogCapabilityExecutionDescriptorSchema
>;

export const catalogDelegationRouteDescriptorSchema = z.object({
	routeId: z.string().min(1),
	targetHost: executionHostSchema,
	descriptor: z.string().min(1),
});

export type CatalogDelegationRouteDescriptor = z.infer<
	typeof catalogDelegationRouteDescriptorSchema
>;

export const catalogProviderExecutionDescriptorSchema = z.object({
	descriptorVersion: catalogDescriptorVersionSchema,
	requiredHostApiVersion: semverSchema,
	supportedHosts: z.array(executionHostSchema).min(1),
	capabilities: z.array(catalogCapabilityExecutionDescriptorSchema).min(1),
	delegationRoutes: z.array(catalogDelegationRouteDescriptorSchema).default([]),
});

export type CatalogProviderExecutionDescriptor = z.infer<
	typeof catalogProviderExecutionDescriptorSchema
>;

export const catalogProviderExecutionDescriptorIndexSchema = z.record(
	z.string().min(1),
	catalogProviderExecutionDescriptorSchema,
);

export type CatalogProviderExecutionDescriptorIndex = z.infer<
	typeof catalogProviderExecutionDescriptorIndexSchema
>;

export const resolveCatalogProviderExecutionDescriptor = (
	providerId: string,
	providerVersion: string,
	descriptorIndex: CatalogProviderExecutionDescriptorIndex | undefined,
): CatalogProviderExecutionDescriptor | undefined => {
	return descriptorIndex?.[providerReference(providerId, providerVersion)];
};

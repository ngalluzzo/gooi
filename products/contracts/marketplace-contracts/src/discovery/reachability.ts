import { z } from "zod";
import { executionHostSchema } from "../reachability/contracts";

const providerReference = (
	providerId: string,
	providerVersion: string,
): string => `${providerId}@${providerVersion}`;

export const localProviderReachabilitySchema = z.object({
	mode: z.literal("local"),
	targetHost: executionHostSchema.optional(),
});

export const delegatedProviderReachabilitySchema = z.object({
	mode: z.literal("delegated"),
	targetHost: executionHostSchema,
	delegateRouteId: z.string().min(1).optional(),
	delegateDescriptor: z.string().min(1).optional(),
});

export const providerReachabilitySchema = z.discriminatedUnion("mode", [
	localProviderReachabilitySchema,
	delegatedProviderReachabilitySchema,
]);

export type ProviderReachability = z.infer<typeof providerReachabilitySchema>;

export const providerReachabilityIndexSchema = z.record(
	z.string().min(1),
	providerReachabilitySchema,
);

export type ProviderReachabilityIndex = z.infer<
	typeof providerReachabilityIndexSchema
>;

export const defaultProviderReachability = (): ProviderReachability => ({
	mode: "local",
});

export const resolveProviderReachability = (
	providerId: string,
	providerVersion: string,
	reachabilityIndex: ProviderReachabilityIndex | undefined,
): ProviderReachability => {
	return (
		reachabilityIndex?.[providerReference(providerId, providerVersion)] ??
		defaultProviderReachability()
	);
};

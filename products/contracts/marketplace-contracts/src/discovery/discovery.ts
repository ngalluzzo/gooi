import { z } from "zod";
import {
	type DeploymentLockfile,
	deploymentLockfileSchema,
} from "../lockfile/contracts";
import { hexHashSchema } from "../shared/hashes";
import { semverSchema } from "../shared/semver";

const providerRef = (providerId: string, providerVersion: string): string =>
	`${providerId}@${providerVersion}`;

const trustTierRank = {
	blocked: 0,
	unknown: 1,
	review: 2,
	trusted: 3,
} as const;

const isTrustTierAtLeast = (
	tier: ProviderTrustTier,
	minimum: ProviderTrustTier,
): boolean => trustTierRank[tier] >= trustTierRank[minimum];

export const providerTrustTierSchema = z.enum([
	"blocked",
	"unknown",
	"review",
	"trusted",
]);

export type ProviderTrustTier = z.infer<typeof providerTrustTierSchema>;

export const providerTrustMetadataSchema = z.object({
	tier: providerTrustTierSchema,
	certifications: z.array(z.string().min(1)).default([]),
});

export type ProviderTrustMetadata = z.infer<typeof providerTrustMetadataSchema>;

export const providerDiscoveryQuerySchema = z.object({
	portId: z.string().min(1),
	portVersion: semverSchema,
	contractHash: hexHashSchema.optional(),
	hostApiVersion: semverSchema.optional(),
	minTrustTier: providerTrustTierSchema.optional(),
});

export type ProviderDiscoveryQuery = z.infer<
	typeof providerDiscoveryQuerySchema
>;

export const providerTrustIndexSchema = z.record(
	z.string().min(1),
	providerTrustMetadataSchema,
);

export const providerDiscoveryInputSchema = z.object({
	lockfile: deploymentLockfileSchema,
	query: providerDiscoveryQuerySchema,
	trustIndex: providerTrustIndexSchema.optional(),
});

export type ProviderDiscoveryInput = z.infer<
	typeof providerDiscoveryInputSchema
>;

export const providerDiscoveryCompatibilitySchema = z.object({
	requiredHostApiVersion: semverSchema,
	actualHostApiVersion: semverSchema,
	hostApiCompatible: z.boolean(),
	capabilityCompatible: z.boolean(),
	contractHashCompatible: z.boolean(),
});

export type ProviderDiscoveryCompatibility = z.infer<
	typeof providerDiscoveryCompatibilitySchema
>;

export const providerDiscoverySelectionSchema = z.object({
	eligible: z.boolean(),
	reasons: z.array(z.string().min(1)),
});

export type ProviderDiscoverySelection = z.infer<
	typeof providerDiscoverySelectionSchema
>;

export const providerDiscoveryTrustSchema = providerTrustMetadataSchema.extend({
	meetsMinimumTier: z.boolean(),
	minimumTier: providerTrustTierSchema.optional(),
});

export type ProviderDiscoveryTrust = z.infer<
	typeof providerDiscoveryTrustSchema
>;

export const providerCatalogEntrySchema = z.object({
	providerId: z.string().min(1),
	providerVersion: semverSchema,
	integrity: z.string().min(1),
	compatibility: providerDiscoveryCompatibilitySchema,
	trust: providerDiscoveryTrustSchema,
	selection: providerDiscoverySelectionSchema,
});

export type ProviderCatalogEntry = z.infer<typeof providerCatalogEntrySchema>;

export const providerCatalogViewSchema = z.object({
	query: providerDiscoveryQuerySchema.extend({
		hostApiVersion: semverSchema,
	}),
	providers: z.array(providerCatalogEntrySchema),
});

export type ProviderCatalogView = z.infer<typeof providerCatalogViewSchema>;

const defaultTrust = (): ProviderTrustMetadata => ({
	tier: "unknown",
	certifications: [],
});

const resolveTrust = (
	providerId: string,
	providerVersion: string,
	trustIndex: Record<string, ProviderTrustMetadata> | undefined,
): ProviderTrustMetadata => {
	return (
		trustIndex?.[providerRef(providerId, providerVersion)] ?? defaultTrust()
	);
};

const toCatalogEntry = (
	lockfile: DeploymentLockfile,
	provider: DeploymentLockfile["providers"][number],
	query: ProviderDiscoveryQuery & { hostApiVersion: string },
	trustIndex: Record<string, ProviderTrustMetadata> | undefined,
): ProviderCatalogEntry | null => {
	const capability = provider.capabilities.find(
		(item) =>
			item.portId === query.portId && item.portVersion === query.portVersion,
	);
	if (capability === undefined) {
		return null;
	}

	const hostApiCompatible = lockfile.hostApiVersion === query.hostApiVersion;
	const contractHashCompatible =
		query.contractHash === undefined
			? true
			: capability.contractHash === query.contractHash;
	const capabilityCompatible = contractHashCompatible;
	const trust = resolveTrust(
		provider.providerId,
		provider.providerVersion,
		trustIndex,
	);
	const meetsMinimumTier =
		query.minTrustTier === undefined
			? true
			: isTrustTierAtLeast(trust.tier, query.minTrustTier);

	const reasons: string[] = [];
	if (!hostApiCompatible) {
		reasons.push("host_api_incompatible");
	}
	if (!capabilityCompatible) {
		reasons.push("capability_contract_mismatch");
	}
	if (!meetsMinimumTier) {
		reasons.push("trust_tier_below_minimum");
	}

	return {
		providerId: provider.providerId,
		providerVersion: provider.providerVersion,
		integrity: provider.integrity,
		compatibility: {
			requiredHostApiVersion: query.hostApiVersion,
			actualHostApiVersion: lockfile.hostApiVersion,
			hostApiCompatible,
			capabilityCompatible,
			contractHashCompatible,
		},
		trust: {
			tier: trust.tier,
			certifications: trust.certifications,
			meetsMinimumTier,
			...(query.minTrustTier === undefined
				? {}
				: { minimumTier: query.minTrustTier }),
		},
		selection: {
			eligible: hostApiCompatible && capabilityCompatible && meetsMinimumTier,
			reasons,
		},
	};
};

export const parseProviderDiscoveryInput = (
	value: unknown,
): ProviderDiscoveryInput => providerDiscoveryInputSchema.parse(value);

export const discoverProviders = (
	value: ProviderDiscoveryInput,
): ProviderCatalogView => {
	const parsed = parseProviderDiscoveryInput(value);
	const query = {
		...parsed.query,
		hostApiVersion:
			parsed.query.hostApiVersion ?? parsed.lockfile.hostApiVersion,
	};
	const providers = parsed.lockfile.providers
		.map((provider) =>
			toCatalogEntry(parsed.lockfile, provider, query, parsed.trustIndex),
		)
		.filter((provider): provider is ProviderCatalogEntry => provider !== null);

	return {
		query,
		providers,
	};
};

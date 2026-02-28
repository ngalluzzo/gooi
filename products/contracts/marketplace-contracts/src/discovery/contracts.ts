/**
 * Canonical provider discovery contract API.
 */
import * as discovery from "./discovery";
import * as reachability from "./reachability";

export type {
	ProviderCatalogEntry,
	ProviderCatalogView,
	ProviderDiscoveryCompatibility,
	ProviderDiscoveryInput,
	ProviderDiscoveryQuery,
	ProviderDiscoverySelection,
	ProviderDiscoveryTrust,
	ProviderTrustMetadata,
	ProviderTrustTier,
} from "./discovery";
export type {
	ProviderReachability,
	ProviderReachabilityIndex,
} from "./reachability";

export const discoveryContracts = Object.freeze({
	providerTrustTierSchema: discovery.providerTrustTierSchema,
	providerTrustMetadataSchema: discovery.providerTrustMetadataSchema,
	providerDiscoveryQuerySchema: discovery.providerDiscoveryQuerySchema,
	providerDiscoveryInputSchema: discovery.providerDiscoveryInputSchema,
	providerReachabilitySchema: reachability.providerReachabilitySchema,
	providerReachabilityIndexSchema: reachability.providerReachabilityIndexSchema,
	providerDiscoveryCompatibilitySchema:
		discovery.providerDiscoveryCompatibilitySchema,
	providerDiscoverySelectionSchema: discovery.providerDiscoverySelectionSchema,
	providerDiscoveryTrustSchema: discovery.providerDiscoveryTrustSchema,
	providerCatalogEntrySchema: discovery.providerCatalogEntrySchema,
	providerCatalogViewSchema: discovery.providerCatalogViewSchema,
	parseProviderDiscoveryInput: discovery.parseProviderDiscoveryInput,
	discoverProviders: discovery.discoverProviders,
});

/**
 * Canonical provider discovery contract API.
 */
import * as discovery from "./discovery";

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

export const discoveryContracts = Object.freeze({
	providerTrustTierSchema: discovery.providerTrustTierSchema,
	providerTrustMetadataSchema: discovery.providerTrustMetadataSchema,
	providerDiscoveryQuerySchema: discovery.providerDiscoveryQuerySchema,
	providerDiscoveryInputSchema: discovery.providerDiscoveryInputSchema,
	providerDiscoveryCompatibilitySchema:
		discovery.providerDiscoveryCompatibilitySchema,
	providerDiscoverySelectionSchema: discovery.providerDiscoverySelectionSchema,
	providerDiscoveryTrustSchema: discovery.providerDiscoveryTrustSchema,
	providerCatalogEntrySchema: discovery.providerCatalogEntrySchema,
	providerCatalogViewSchema: discovery.providerCatalogViewSchema,
	parseProviderDiscoveryInput: discovery.parseProviderDiscoveryInput,
	discoverProviders: discovery.discoverProviders,
});

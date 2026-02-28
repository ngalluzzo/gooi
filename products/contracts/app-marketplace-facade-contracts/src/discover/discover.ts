import {
	discoveryContracts,
	type ProviderCatalogEntry,
	type ProviderCatalogView,
	type ProviderDiscoveryCompatibility,
	type ProviderDiscoveryInput,
	type ProviderDiscoveryQuery,
	type ProviderDiscoverySelection,
	type ProviderDiscoveryTrust,
	type ProviderTrustMetadata,
	type ProviderTrustTier,
} from "@gooi/marketplace-contracts/discovery";

export type DiscoverProvidersInput = ProviderDiscoveryInput;
export type DiscoverProvidersQuery = ProviderDiscoveryQuery;
export type DiscoverProvidersCompatibility = ProviderDiscoveryCompatibility;
export type DiscoverProvidersTrust = ProviderDiscoveryTrust;
export type DiscoverProvidersSelection = ProviderDiscoverySelection;
export type DiscoverProvidersCatalogEntry = ProviderCatalogEntry;
export type DiscoverProvidersCatalogView = ProviderCatalogView;
export type DiscoverProvidersTrustMetadata = ProviderTrustMetadata;
export type DiscoverProvidersTrustTier = ProviderTrustTier;

export const parseDiscoverProvidersInput =
	discoveryContracts.parseProviderDiscoveryInput;

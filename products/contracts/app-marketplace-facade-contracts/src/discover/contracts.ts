/**
 * Canonical boundary contract API.
 */
import * as discover from "./discover";

export type {
	DiscoverProvidersCatalogEntry,
	DiscoverProvidersCatalogView,
	DiscoverProvidersCompatibility,
	DiscoverProvidersInput,
	DiscoverProvidersQuery,
	DiscoverProvidersSelection,
	DiscoverProvidersTrust,
	DiscoverProvidersTrustMetadata,
	DiscoverProvidersTrustTier,
} from "./discover";

export const discoverContracts = Object.freeze({
	parseDiscoverProvidersInput: discover.parseDiscoverProvidersInput,
	discoverProviders: discover.discoverProviders,
});

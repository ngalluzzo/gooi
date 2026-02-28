import {
	type DiscoverProvidersCatalogView,
	type DiscoverProvidersInput,
	discoverContracts,
} from "@gooi/app-marketplace-facade-contracts/discover";

export const discoverProviders = (
	input: DiscoverProvidersInput,
): DiscoverProvidersCatalogView => {
	return discoverContracts.discoverProviders(input);
};

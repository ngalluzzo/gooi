import {
	type DiscoverProvidersCatalogView,
	type DiscoverProvidersInput,
	discoverContracts,
} from "@gooi/app-marketplace-facade-contracts/discover";
import { discoveryContracts } from "@gooi/marketplace-contracts/discovery";

export const discoverProviders = (
	input: DiscoverProvidersInput,
): DiscoverProvidersCatalogView => {
	const parsedInput = discoverContracts.parseDiscoverProvidersInput(input);
	return discoveryContracts.discoverProviders(parsedInput);
};

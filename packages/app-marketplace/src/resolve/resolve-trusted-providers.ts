import {
	type ResolveProvidersInput,
	type ResolveProvidersResult,
	resolveContracts,
} from "@gooi/app-marketplace-facade-contracts/resolve";

export const resolveTrustedProviders = (
	input: ResolveProvidersInput,
): ResolveProvidersResult => {
	return resolveContracts.resolveTrustedProviders(input);
};

/**
 * Canonical boundary contract API.
 */
import * as provider from "./provider";

export type {
	CreateHostPortProviderInput,
	CreateHostPortProviderManifestInput,
	HostPortContractDescriptor,
	HostPortProvider,
	HostPortProviderManifest,
} from "./provider";

export const providerContracts = Object.freeze({
	createHostPortProviderManifest: provider.createHostPortProviderManifest,
	createHostPortProvider: provider.createHostPortProvider,
});

/**
 * Canonical boundary contract API.
 */
import * as provider_manifest from "./provider-manifest";

export type {
	CapabilityPortReference,
	ExecutionHost,
	ProviderCapability,
	ProviderManifest,
} from "./provider-manifest";

export const providerManifestContracts = Object.freeze({
	executionHostSchema: provider_manifest.executionHostSchema,
	capabilityPortReferenceSchema:
		provider_manifest.capabilityPortReferenceSchema,
	providerCapabilitySchema: provider_manifest.providerCapabilitySchema,
	parseProviderManifest: provider_manifest.parseProviderManifest,
	safeParseProviderManifest: provider_manifest.safeParseProviderManifest,
});

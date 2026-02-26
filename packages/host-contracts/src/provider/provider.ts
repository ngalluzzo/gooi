import type { ProviderManifestBase } from "@gooi/provider-manifest/base";

/**
 * Stable contract descriptor for one host port feature.
 */
export interface HostPortContractDescriptor {
	readonly id: string;
	readonly version: string;
}

/**
 * Shared host provider manifest type.
 */
export type HostPortProviderManifest<
	TContract extends HostPortContractDescriptor = HostPortContractDescriptor,
> = ProviderManifestBase & {
	readonly contract: TContract;
};

/**
 * Input payload for host provider manifest construction.
 */
export interface CreateHostPortProviderManifestInput<
	TContract extends HostPortContractDescriptor = HostPortContractDescriptor,
> {
	readonly manifest: ProviderManifestBase;
	readonly contract: TContract;
}

/**
 * Creates a host provider manifest with stable contract metadata.
 */
export const createHostPortProviderManifest = <
	TContract extends HostPortContractDescriptor,
>(
	input: CreateHostPortProviderManifestInput<TContract>,
): HostPortProviderManifest<TContract> => ({
	providerId: input.manifest.providerId,
	providerVersion: input.manifest.providerVersion,
	hostApiRange: input.manifest.hostApiRange,
	contract: input.contract,
});

/**
 * Shared provider definition shape for host port implementations.
 */
export interface HostPortProvider<
	TCreatePort,
	TContract extends HostPortContractDescriptor = HostPortContractDescriptor,
> {
	readonly manifest: HostPortProviderManifest<TContract>;
	readonly createPort: TCreatePort;
}

/**
 * Input payload for host port provider construction.
 */
export interface CreateHostPortProviderInput<
	TCreatePort,
	TContract extends HostPortContractDescriptor = HostPortContractDescriptor,
> {
	readonly manifest: HostPortProviderManifest<TContract>;
	readonly createPort: TCreatePort;
}

/**
 * Creates a host provider definition.
 */
export const createHostPortProvider = <
	TCreatePort,
	TContract extends HostPortContractDescriptor = HostPortContractDescriptor,
>(
	input: CreateHostPortProviderInput<TCreatePort, TContract>,
): HostPortProvider<TCreatePort, TContract> => ({
	manifest: input.manifest,
	createPort: input.createPort,
});

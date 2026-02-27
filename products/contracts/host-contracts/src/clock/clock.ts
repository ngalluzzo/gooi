import {
	createHostPortProvider,
	createHostPortProviderManifest,
	type HostPortContractDescriptor,
	type HostPortProvider,
	type HostPortProviderManifest,
} from "../provider/provider";

/**
 * Host clock contract.
 */
export interface HostClockPort {
	/** Returns the current timestamp in ISO-8601 format. */
	readonly nowIso: () => string;
}

/**
 * Stable clock host contract descriptor for provider manifests.
 */
const hostClockContract = {
	id: "gooi.host.clock",
	version: "1.0.0",
} as const satisfies HostPortContractDescriptor;

/**
 * Provider manifest for clock implementations.
 */
export type HostClockProviderManifest = HostPortProviderManifest<
	typeof hostClockContract
>;

/**
 * Clock provider contract consumed by marketplace contributors.
 */
export type HostClockProvider = HostPortProvider<
	() => HostClockPort,
	typeof hostClockContract
>;

/**
 * Input payload for clock provider construction.
 */
export interface CreateHostClockProviderInput {
	readonly manifest: {
		readonly providerId: string;
		readonly providerVersion: string;
		readonly hostApiRange: string;
	};
	readonly createPort: () => HostClockPort;
}

/**
 * Creates a clock provider definition.
 */
export const createHostClockProvider = (
	input: CreateHostClockProviderInput,
): HostClockProvider =>
	createHostPortProvider({
		manifest: createHostPortProviderManifest({
			manifest: input.manifest,
			contract: hostClockContract,
		}),
		createPort: input.createPort,
	});

/**
 * Creates a clock port backed by the system clock.
 */
export const createSystemClockPort = (): HostClockPort => ({
	nowIso: () => new Date().toISOString(),
});

import {
	createHostPortProvider,
	createHostPortProviderManifest,
	type HostPortContractDescriptor,
	type HostPortProvider,
	type HostPortProviderManifest,
} from "../provider/provider";
import { type HostPortResult, hostFail, hostOk } from "../result/result";

/**
 * Input payload for module integrity assertions.
 */
export interface AssertModuleIntegrityInput {
	/** Provider id expected by runtime resolution artifacts. */
	readonly providerId: string;
	/** Provider version expected by runtime resolution artifacts. */
	readonly providerVersion: string;
	/** Integrity checksum from deployment lockfile. */
	readonly integrity: string;
}

/**
 * Host module-integrity contract.
 */
export interface HostModuleIntegrityPort {
	/** Validates integrity material before module activation. */
	readonly assertModuleIntegrity: (
		input: AssertModuleIntegrityInput,
	) => Promise<HostPortResult<void>>;
}

/**
 * Stable module-integrity host contract descriptor for provider manifests.
 */
const hostModuleIntegrityContract = {
	id: "gooi.host.module-integrity",
	version: "1.0.0",
} as const satisfies HostPortContractDescriptor;

/**
 * Provider manifest for module-integrity implementations.
 */
export type HostModuleIntegrityProviderManifest = HostPortProviderManifest<
	typeof hostModuleIntegrityContract
>;

/**
 * Module-integrity provider contract consumed by marketplace contributors.
 */
export type HostModuleIntegrityProvider = HostPortProvider<
	() => HostModuleIntegrityPort,
	typeof hostModuleIntegrityContract
>;

/**
 * Input payload for module-integrity provider construction.
 */
export interface CreateHostModuleIntegrityProviderInput {
	readonly manifest: {
		readonly providerId: string;
		readonly providerVersion: string;
		readonly hostApiRange: string;
	};
	readonly createPort: () => HostModuleIntegrityPort;
}

/**
 * Creates a module-integrity provider definition.
 */
export const createHostModuleIntegrityProvider = (
	input: CreateHostModuleIntegrityProviderInput,
): HostModuleIntegrityProvider =>
	createHostPortProvider({
		manifest: createHostPortProviderManifest({
			manifest: input.manifest,
			contract: hostModuleIntegrityContract,
		}),
		createPort: input.createPort,
	});

/**
 * Creates a permissive module-integrity port for deferred integration milestones.
 */
export const createPermissiveModuleIntegrityPort =
	(): HostModuleIntegrityPort => ({
		assertModuleIntegrity: async (_input: AssertModuleIntegrityInput) =>
			hostOk(undefined),
	});

/**
 * Creates a module-integrity port that fail-hard rejects integrity assertions.
 */
export const createFailingModuleIntegrityPort =
	(): HostModuleIntegrityPort => ({
		assertModuleIntegrity: async (input: AssertModuleIntegrityInput) =>
			hostFail(
				"module_integrity_not_configured",
				"Provider module integrity verification is not configured.",
				{
					providerId: input.providerId,
					providerVersion: input.providerVersion,
					integrity: input.integrity,
				},
			),
	});

import {
	createHostModuleIntegrityProvider,
	type HostModuleIntegrityPort,
} from "@gooi/host-contracts/module-integrity";
import { hostFail, hostOk } from "@gooi/host-contracts/result";

/**
 * Input payload for in-memory module-integrity configuration.
 */
export interface CreateMemoryModuleIntegrityPortInput {
	/** Optional allowlist of accepted integrity checksums. */
	readonly acceptedIntegrity?: readonly string[];
}

/**
 * Creates an in-memory module-integrity port with deterministic allowlist checks.
 */
export const createMemoryModuleIntegrityPort = (
	input?: CreateMemoryModuleIntegrityPortInput,
): HostModuleIntegrityPort => ({
	assertModuleIntegrity: async ({ providerId, providerVersion, integrity }) => {
		const acceptedIntegrity = input?.acceptedIntegrity;
		if (
			acceptedIntegrity !== undefined &&
			!acceptedIntegrity.includes(integrity)
		) {
			return hostFail(
				"module_integrity_failed",
				"Integrity checksum is not accepted by memory provider.",
				{
					providerId,
					providerVersion,
					integrity,
				},
			);
		}
		return hostOk(undefined);
	},
});

/**
 * Reference module-integrity provider for marketplace contributor implementations.
 */
export const memoryModuleIntegrityProvider = createHostModuleIntegrityProvider({
	manifest: {
		providerId: "gooi.marketplace.memory",
		providerVersion: "1.0.0",
		hostApiRange: "^1.0.0",
	},
	createPort: createMemoryModuleIntegrityPort,
});

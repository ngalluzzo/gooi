import {
	activationPolicyContracts,
	type HostActivationPolicyPort,
} from "@gooi/host-contracts/activation-policy";

/**
 * Creates an in-memory activation policy port.
 */
export const createMemoryActivationPolicyPort = (): HostActivationPolicyPort =>
	activationPolicyContracts.createStrictActivationPolicyPort();

/**
 * Reference activation-policy provider for marketplace contributor implementations.
 */
export const memoryActivationPolicyProvider =
	activationPolicyContracts.createHostActivationPolicyProvider({
		manifest: {
			providerId: "gooi.marketplace.memory",
			providerVersion: "1.0.0",
			hostApiRange: "^1.0.0",
		},
		createPort: createMemoryActivationPolicyPort,
	});

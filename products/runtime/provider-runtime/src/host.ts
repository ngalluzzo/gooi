import type { HostActivationPolicyPort } from "@gooi/host-contracts/activation-policy";
import { createStrictActivationPolicyPort } from "@gooi/host-contracts/activation-policy";
import type { HostClockPort } from "@gooi/host-contracts/clock";
import { createSystemClockPort } from "@gooi/host-contracts/clock";

/**
 * Host port set consumed by provider activation and lifecycle orchestration.
 */
export interface ProviderRuntimeHostPorts {
	/** Clock port used for activation timestamps. */
	readonly clock: HostClockPort;
	/** Activation policy port used for host-version alignment checks. */
	readonly activationPolicy: HostActivationPolicyPort;
}

/**
 * Creates host ports for provider runtime orchestration.
 *
 * @returns Provider runtime host ports.
 */
export const createDefaultProviderRuntimeHostPorts =
	(): ProviderRuntimeHostPorts => ({
		clock: createSystemClockPort(),
		activationPolicy: createStrictActivationPolicyPort(),
	});

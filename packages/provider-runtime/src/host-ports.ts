import type {
	HostActivationPolicyPort,
	HostClockPort,
} from "@gooi/host-contracts";

/**
 * Host port set consumed by provider activation and lifecycle orchestration.
 */
export interface ProviderRuntimeHostPorts {
	/** Clock port used for activation timestamps. */
	readonly clock: HostClockPort;
	/** Activation policy port used for host-version alignment checks. */
	readonly activationPolicy: HostActivationPolicyPort;
}

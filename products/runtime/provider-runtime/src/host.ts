import type { HostActivationPolicyPort } from "@gooi/host-contracts/activation-policy";
import { createStrictActivationPolicyPort } from "@gooi/host-contracts/activation-policy";
import type { HostClockPort } from "@gooi/host-contracts/clock";
import { createSystemClockPort } from "@gooi/host-contracts/clock";
import {
	createFailingCapabilityDelegationPort,
	type HostCapabilityDelegationPort,
} from "@gooi/host-contracts/delegation";
import {
	createFailingModuleIntegrityPort,
	type HostModuleIntegrityPort,
} from "@gooi/host-contracts/module-integrity";
import {
	createFailingModuleLoaderPort,
	type HostModuleLoaderPort,
} from "@gooi/host-contracts/module-loader";

/**
 * Host port set consumed by provider activation and lifecycle orchestration.
 */
export interface ProviderRuntimeHostPorts {
	/** Clock port used for activation timestamps. */
	readonly clock: HostClockPort;
	/** Activation policy port used for host-version alignment checks. */
	readonly activationPolicy: HostActivationPolicyPort;
	/** Delegation port used for cross-host capability invocation. */
	readonly capabilityDelegation: HostCapabilityDelegationPort;
	/** Module loading port used for runtime-managed provider activation. */
	readonly moduleLoader: HostModuleLoaderPort;
	/** Module integrity port used for lockfile-backed integrity verification. */
	readonly moduleIntegrity: HostModuleIntegrityPort;
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
	typeof value === "object" && value !== null;

/**
 * Missing provider-runtime host-port contract member descriptor.
 */
export interface ProviderRuntimeHostPortContractIssue {
	/** Dot-path for the missing or invalid host-port member. */
	readonly path: string;
	/** Expected member shape. */
	readonly expected: "function";
}

/**
 * Returns required provider-runtime host-port members that are missing or invalid.
 */
export const getMissingProviderRuntimeHostPortMembers = (
	hostPorts: unknown,
): readonly ProviderRuntimeHostPortContractIssue[] => {
	const record = isRecord(hostPorts) ? hostPorts : {};
	const issues: ProviderRuntimeHostPortContractIssue[] = [];
	const requiredMembers = [
		{
			path: "clock.nowIso",
			valid: () =>
				isRecord(record.clock) && typeof record.clock.nowIso === "function",
		},
		{
			path: "activationPolicy.assertHostVersionAligned",
			valid: () =>
				isRecord(record.activationPolicy) &&
				typeof record.activationPolicy.assertHostVersionAligned === "function",
		},
		{
			path: "capabilityDelegation.invokeDelegated",
			valid: () =>
				isRecord(record.capabilityDelegation) &&
				typeof record.capabilityDelegation.invokeDelegated === "function",
		},
		{
			path: "moduleLoader.loadModule",
			valid: () =>
				isRecord(record.moduleLoader) &&
				typeof record.moduleLoader.loadModule === "function",
		},
		{
			path: "moduleIntegrity.assertModuleIntegrity",
			valid: () =>
				isRecord(record.moduleIntegrity) &&
				typeof record.moduleIntegrity.assertModuleIntegrity === "function",
		},
	] as const;

	for (const member of requiredMembers) {
		if (!member.valid()) {
			issues.push({
				path: member.path,
				expected: "function",
			});
		}
	}

	return issues;
};

/**
 * Creates host ports for provider runtime orchestration.
 *
 * @returns Provider runtime host ports.
 */
export const createDefaultProviderRuntimeHostPorts =
	(): ProviderRuntimeHostPorts => ({
		clock: createSystemClockPort(),
		activationPolicy: createStrictActivationPolicyPort(),
		capabilityDelegation: createFailingCapabilityDelegationPort(),
		moduleLoader: createFailingModuleLoaderPort(),
		moduleIntegrity: createFailingModuleIntegrityPort(),
	});

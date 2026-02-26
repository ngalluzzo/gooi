import {
	createHostPortProvider,
	createHostPortProviderManifest,
	type HostPortContractDescriptor,
	type HostPortProvider,
	type HostPortProviderManifest,
} from "../provider/provider";
import { type HostPortResult, hostFail } from "../result/result";

/**
 * Side-effect categories reported from delegated capability invocation.
 */
export type DelegatedObservedEffectKind =
	| "compute"
	| "read"
	| "write"
	| "network"
	| "emit"
	| "session";

/**
 * Principal context passed through delegated capability calls.
 */
export interface DelegatedPrincipalContext {
	readonly subject: string;
	readonly roles: readonly string[];
}

/**
 * Invocation context passed through delegated capability calls.
 */
export interface DelegatedInvocationContext {
	readonly id: string;
	readonly traceId: string;
	readonly now: string;
}

/**
 * Capability invocation envelope forwarded across delegation boundaries.
 */
export interface DelegatedCapabilityCall {
	readonly portId: string;
	readonly portVersion: string;
	readonly input: unknown;
	readonly principal: DelegatedPrincipalContext;
	readonly ctx: DelegatedInvocationContext;
}

/**
 * Delegated capability invocation result envelope.
 */
export interface DelegatedCapabilityResult {
	readonly ok: boolean;
	readonly output?: unknown;
	readonly error?: unknown;
	readonly observedEffects: readonly DelegatedObservedEffectKind[];
}

/**
 * Delegated invocation input for one cross-host route.
 */
export interface DelegatedCapabilityInvocationInput {
	readonly routeId: string;
	readonly traceId: string;
	readonly invocationId: string;
	readonly capabilityCall: DelegatedCapabilityCall;
}

/**
 * Host capability delegation contract.
 */
export interface HostCapabilityDelegationPort {
	/** Invokes one capability through a concrete delegation route. */
	readonly invokeDelegated: (
		input: DelegatedCapabilityInvocationInput,
	) => Promise<HostPortResult<DelegatedCapabilityResult>>;
}

/**
 * Stable capability-delegation host contract descriptor for provider manifests.
 */
const hostCapabilityDelegationContract = {
	id: "gooi.host.capability-delegation",
	version: "1.0.0",
} as const satisfies HostPortContractDescriptor;

/**
 * Provider manifest for capability-delegation implementations.
 */
export type HostCapabilityDelegationProviderManifest = HostPortProviderManifest<
	typeof hostCapabilityDelegationContract
>;

/**
 * Capability-delegation provider contract consumed by marketplace contributors.
 */
export type HostCapabilityDelegationProvider = HostPortProvider<
	() => HostCapabilityDelegationPort,
	typeof hostCapabilityDelegationContract
>;

/**
 * Input payload for capability-delegation provider construction.
 */
export interface CreateHostCapabilityDelegationProviderInput {
	readonly manifest: {
		readonly providerId: string;
		readonly providerVersion: string;
		readonly hostApiRange: string;
	};
	readonly createPort: () => HostCapabilityDelegationPort;
}

/**
 * Creates a capability-delegation provider definition.
 */
export const createHostCapabilityDelegationProvider = (
	input: CreateHostCapabilityDelegationProviderInput,
): HostCapabilityDelegationProvider =>
	createHostPortProvider({
		manifest: createHostPortProviderManifest({
			manifest: input.manifest,
			contract: hostCapabilityDelegationContract,
		}),
		createPort: input.createPort,
	});

/**
 * Creates a delegation port that fail-hard rejects delegated invocation attempts.
 */
export const createFailingCapabilityDelegationPort =
	(): HostCapabilityDelegationPort => ({
		invokeDelegated: async (input: DelegatedCapabilityInvocationInput) =>
			hostFail(
				"capability_delegation_error",
				"Capability delegation route is not configured.",
				{
					routeId: input.routeId,
					portId: input.capabilityCall.portId,
					portVersion: input.capabilityCall.portVersion,
				},
			),
	});

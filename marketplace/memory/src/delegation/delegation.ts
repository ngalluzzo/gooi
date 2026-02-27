import {
	createHostCapabilityDelegationProvider,
	type DelegatedCapabilityInvocationInput,
	type DelegatedCapabilityResult,
	type HostCapabilityDelegationPort,
} from "@gooi/host-contracts/delegation";
import { hostFail, hostOk } from "@gooi/host-contracts/result";

/**
 * In-memory delegated route handler.
 */
export type MemoryDelegationRouteHandler = (
	input: DelegatedCapabilityInvocationInput,
) => Promise<DelegatedCapabilityResult>;

/**
 * Input payload for in-memory capability delegation configuration.
 */
export interface CreateMemoryCapabilityDelegationPortInput {
	/** Route registry keyed by delegated route id. */
	readonly routes?: Readonly<Record<string, MemoryDelegationRouteHandler>>;
}

/**
 * Creates an in-memory capability delegation port with deterministic route dispatch.
 */
export const createMemoryCapabilityDelegationPort = (
	input?: CreateMemoryCapabilityDelegationPortInput,
): HostCapabilityDelegationPort => {
	const routes = input?.routes ?? {};
	return {
		invokeDelegated: async (invocation) => {
			const route = routes[invocation.routeId];
			if (route === undefined) {
				return hostFail(
					"capability_delegation_error",
					"Delegation route is not configured in memory provider.",
					{
						routeId: invocation.routeId,
						portId: invocation.capabilityCall.portId,
						portVersion: invocation.capabilityCall.portVersion,
					},
				);
			}
			return hostOk(await route(invocation));
		},
	};
};

/**
 * Reference capability-delegation provider for marketplace contributor implementations.
 */
export const memoryCapabilityDelegationProvider =
	createHostCapabilityDelegationProvider({
		manifest: {
			providerId: "gooi.marketplace.memory",
			providerVersion: "1.0.0",
			hostApiRange: "^1.0.0",
		},
		createPort: createMemoryCapabilityDelegationPort,
	});

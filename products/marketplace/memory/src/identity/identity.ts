import {
	type HostIdentityPort,
	identityContracts,
} from "@gooi/host-contracts/identity";

/**
 * Input payload for in-memory identity configuration.
 */
export interface CreateMemoryIdentityPortInput {
	/** Prefix applied to generated trace ids. */
	readonly tracePrefix?: string;
	/** Prefix applied to generated invocation ids. */
	readonly invocationPrefix?: string;
}

/**
 * Creates an in-memory identity port with deterministic counters.
 */
export const createMemoryIdentityPort = (
	input?: CreateMemoryIdentityPortInput,
): HostIdentityPort => {
	const tracePrefix = input?.tracePrefix ?? "trace_";
	const invocationPrefix = input?.invocationPrefix ?? "inv_";
	let traceCounter = 0;
	let invocationCounter = 0;
	return {
		newTraceId: () => {
			traceCounter += 1;
			return `${tracePrefix}${traceCounter}`;
		},
		newInvocationId: () => {
			invocationCounter += 1;
			return `${invocationPrefix}${invocationCounter}`;
		},
	};
};

/**
 * Reference identity provider for marketplace contributor implementations.
 */
export const memoryIdentityProvider =
	identityContracts.createHostIdentityProvider({
		manifest: {
			providerId: "gooi.marketplace.memory",
			providerVersion: "1.0.0",
			hostApiRange: "^1.0.0",
		},
		createPort: createMemoryIdentityPort,
	});

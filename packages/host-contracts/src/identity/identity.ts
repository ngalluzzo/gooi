import {
	createHostPortProvider,
	createHostPortProviderManifest,
	type HostPortContractDescriptor,
	type HostPortProvider,
	type HostPortProviderManifest,
} from "../provider/provider";

/**
 * Host identity contract.
 */
export interface HostIdentityPort {
	/** Creates a trace identifier. */
	readonly newTraceId: () => string;
	/** Creates an invocation identifier. */
	readonly newInvocationId: () => string;
}

/**
 * Stable identity host contract descriptor for provider manifests.
 */
const hostIdentityContract = {
	id: "gooi.host.identity",
	version: "1.0.0",
} as const satisfies HostPortContractDescriptor;

/**
 * Provider manifest for identity implementations.
 */
export type HostIdentityProviderManifest = HostPortProviderManifest<
	typeof hostIdentityContract
>;

/**
 * Identity provider contract consumed by marketplace contributors.
 */
export type HostIdentityProvider = HostPortProvider<
	() => HostIdentityPort,
	typeof hostIdentityContract
>;

/**
 * Input payload for identity provider construction.
 */
export interface CreateHostIdentityProviderInput {
	readonly manifest: {
		readonly providerId: string;
		readonly providerVersion: string;
		readonly hostApiRange: string;
	};
	readonly createPort: () => HostIdentityPort;
}

/**
 * Creates an identity provider definition.
 */
export const createHostIdentityProvider = (
	input: CreateHostIdentityProviderInput,
): HostIdentityProvider =>
	createHostPortProvider({
		manifest: createHostPortProviderManifest({
			manifest: input.manifest,
			contract: hostIdentityContract,
		}),
		createPort: input.createPort,
	});

/**
 * Input payload for system identity port configuration.
 */
export interface CreateSystemIdentityPortInput {
	/** Prefix applied to generated trace ids. */
	readonly tracePrefix?: string;
	/** Prefix applied to generated invocation ids. */
	readonly invocationPrefix?: string;
}

/**
 * Creates an identity port backed by runtime UUID generation.
 */
export const createSystemIdentityPort = (
	input?: CreateSystemIdentityPortInput,
): HostIdentityPort => {
	const tracePrefix = input?.tracePrefix ?? "trace_";
	const invocationPrefix = input?.invocationPrefix ?? "inv_";
	return {
		newTraceId: () => `${tracePrefix}${crypto.randomUUID()}`,
		newInvocationId: () => `${invocationPrefix}${crypto.randomUUID()}`,
	};
};

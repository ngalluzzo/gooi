import { z } from "zod";
import {
	createHostPortProvider,
	createHostPortProviderManifest,
	type HostPortContractDescriptor,
	type HostPortProvider,
	type HostPortProviderManifest,
} from "../provider/provider";
import type { HostPortResult } from "../result/result";
/**
 * Principal context schema used across runtime boundaries.
 */
export const principalContextSchema = z.object({
	/** Stable subject id for authenticated principal, or null for anonymous. */
	subject: z.string().nullable(),
	/** Claims map used for policy derivation rules. */
	claims: z.record(z.string(), z.unknown()),
	/** Non-authoritative caller tags. */
	tags: z.array(z.string()).readonly(),
});

/**
 * Principal context carried across runtime boundaries.
 */
export type PrincipalContext = z.infer<typeof principalContextSchema>;

/**
 * Stable principal host contract descriptor for provider manifests.
 */
const hostPrincipalContract = {
	id: "gooi.host.principal",
	version: "1.0.0",
} as const satisfies HostPortContractDescriptor;

/**
 * Provider manifest for principal implementations.
 */
export type HostPrincipalProviderManifest = HostPortProviderManifest<
	typeof hostPrincipalContract
>;

/**
 * Host principal validation contract.
 */
export interface HostPrincipalPort<TPrincipalContext = PrincipalContext> {
	/** Validates untrusted principal payloads. */
	readonly validatePrincipal: (
		value: unknown,
	) => HostPortResult<TPrincipalContext>;
}

/**
 * Input payload for host principal port construction.
 */
export interface CreateHostPrincipalPortInput<
	TPrincipalContext = PrincipalContext,
> {
	readonly validatePrincipal: (
		value: unknown,
	) => HostPortResult<TPrincipalContext>;
}

/**
 * Creates a host principal port from caller-provided validation callback.
 */
export const createHostPrincipalPort = <TPrincipalContext = PrincipalContext>(
	input: CreateHostPrincipalPortInput<TPrincipalContext>,
): HostPrincipalPort<TPrincipalContext> => ({
	validatePrincipal: input.validatePrincipal,
});

/**
 * Principal provider contract consumed by marketplace contributors.
 */
export type HostPrincipalProvider<TPrincipalContext = PrincipalContext> =
	HostPortProvider<
		() => HostPrincipalPort<TPrincipalContext>,
		typeof hostPrincipalContract
	>;

/**
 * Input payload for principal provider construction.
 */
export interface CreateHostPrincipalProviderInput<
	TPrincipalContext = PrincipalContext,
> {
	readonly manifest: {
		readonly providerId: string;
		readonly providerVersion: string;
		readonly hostApiRange: string;
	};
	readonly createPort: () => HostPrincipalPort<TPrincipalContext>;
}

/**
 * Creates a principal provider definition.
 */
export const createHostPrincipalProvider = <
	TPrincipalContext = PrincipalContext,
>(
	input: CreateHostPrincipalProviderInput<TPrincipalContext>,
): HostPrincipalProvider<TPrincipalContext> =>
	createHostPortProvider({
		manifest: createHostPortProviderManifest({
			manifest: input.manifest,
			contract: hostPrincipalContract,
		}),
		createPort: input.createPort,
	});

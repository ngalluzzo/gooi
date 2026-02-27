import {
	createHostPortProvider,
	createHostPortProviderManifest,
	type HostPortContractDescriptor,
	type HostPortProvider,
	type HostPortProviderManifest,
} from "../provider/provider";
import { type HostPortResult, hostFail, hostOk } from "../result/result";

/**
 * Host activation policy contract.
 */
export interface HostActivationPolicyPort {
	/** Validates host API alignment between runtime and deployment artifacts. */
	readonly assertHostVersionAligned: (input: {
		readonly runtimeHostApiVersion: string;
		readonly bindingPlanHostApiVersion: string;
		readonly lockfileHostApiVersion: string;
	}) => HostPortResult<void>;
}

/**
 * Stable activation-policy host contract descriptor for provider manifests.
 */
const hostActivationPolicyContract = {
	id: "gooi.host.activation-policy",
	version: "1.0.0",
} as const satisfies HostPortContractDescriptor;

/**
 * Provider manifest for activation-policy implementations.
 */
export type HostActivationPolicyProviderManifest = HostPortProviderManifest<
	typeof hostActivationPolicyContract
>;

/**
 * Activation-policy provider contract consumed by marketplace contributors.
 */
export type HostActivationPolicyProvider = HostPortProvider<
	() => HostActivationPolicyPort,
	typeof hostActivationPolicyContract
>;

/**
 * Input payload for activation-policy provider construction.
 */
export interface CreateHostActivationPolicyProviderInput {
	readonly manifest: {
		readonly providerId: string;
		readonly providerVersion: string;
		readonly hostApiRange: string;
	};
	readonly createPort: () => HostActivationPolicyPort;
}

/**
 * Creates an activation-policy provider definition.
 */
export const createHostActivationPolicyProvider = (
	input: CreateHostActivationPolicyProviderInput,
): HostActivationPolicyProvider =>
	createHostPortProvider({
		manifest: createHostPortProviderManifest({
			manifest: input.manifest,
			contract: hostActivationPolicyContract,
		}),
		createPort: input.createPort,
	});

/**
 * Input payload for strict host version alignment checks.
 */
export interface AssertHostVersionAlignedInput {
	readonly runtimeHostApiVersion: string;
	readonly bindingPlanHostApiVersion: string;
	readonly lockfileHostApiVersion: string;
}

/**
 * Creates an activation policy port that requires exact host API equality.
 */
export const createStrictActivationPolicyPort =
	(): HostActivationPolicyPort => ({
		assertHostVersionAligned: (input: AssertHostVersionAlignedInput) => {
			if (
				input.runtimeHostApiVersion !== input.bindingPlanHostApiVersion ||
				input.runtimeHostApiVersion !== input.lockfileHostApiVersion
			) {
				return hostFail(
					"artifact_alignment_error",
					"Runtime host API version is not aligned with deployment artifacts.",
					{
						runtimeHostApiVersion: input.runtimeHostApiVersion,
						bindingPlanHostApiVersion: input.bindingPlanHostApiVersion,
						lockfileHostApiVersion: input.lockfileHostApiVersion,
					},
				);
			}

			return hostOk(undefined);
		},
	});

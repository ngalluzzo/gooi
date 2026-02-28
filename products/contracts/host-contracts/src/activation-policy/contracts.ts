/**
 * Canonical boundary contract API.
 */
import * as activation_policy from "./activation-policy";

export type {
	AssertHostVersionAlignedInput,
	CreateHostActivationPolicyProviderInput,
	HostActivationPolicyPort,
	HostActivationPolicyProvider,
	HostActivationPolicyProviderManifest,
} from "./activation-policy";

export const activationPolicyContracts = Object.freeze({
	createHostActivationPolicyProvider:
		activation_policy.createHostActivationPolicyProvider,
	createStrictActivationPolicyPort:
		activation_policy.createStrictActivationPolicyPort,
});

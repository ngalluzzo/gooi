/**
 * Canonical boundary contract API.
 */
import * as delegation from "./delegation";

export type {
	CreateHostCapabilityDelegationProviderInput,
	DelegatedCapabilityCall,
	DelegatedCapabilityInvocationInput,
	DelegatedCapabilityResult,
	DelegatedInvocationContext,
	DelegatedObservedEffectKind,
	DelegatedPrincipalContext,
	HostCapabilityDelegationPort,
	HostCapabilityDelegationProvider,
	HostCapabilityDelegationProviderManifest,
} from "./delegation";

export const delegationContracts = Object.freeze({
	createHostCapabilityDelegationProvider:
		delegation.createHostCapabilityDelegationProvider,
	createFailingCapabilityDelegationPort:
		delegation.createFailingCapabilityDelegationPort,
});

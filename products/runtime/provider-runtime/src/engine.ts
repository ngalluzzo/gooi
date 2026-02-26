import { activateProvider as activateProviderFeature } from "./activation/activation";
import type { ProviderRuntimeHostPorts } from "./host";
import { invokeCapability as invokeCapabilityFeature } from "./invocation/invocation";
import { deactivateProvider as deactivateProviderFeature } from "./lifecycle/lifecycle";
import { fail } from "./shared/result";
import type {
	ActivateContext as SharedActivateContext,
	ActivatedProvider as SharedActivatedProvider,
	ActivateProviderInput as SharedActivateProviderInput,
	ActivateProviderRuntimeInput as SharedActivateProviderRuntimeInput,
	CapabilityCall as SharedCapabilityCall,
	CapabilityResult as SharedCapabilityResult,
	CreateProviderRuntimeInput as SharedCreateProviderRuntimeInput,
	InvocationContext as SharedInvocationContext,
	PrincipalContext as SharedPrincipalContext,
	ProviderInstance as SharedProviderInstance,
	ProviderModule as SharedProviderModule,
	ProviderRuntime as SharedProviderRuntime,
	RunProviderCapabilityInput as SharedRunProviderCapabilityInput,
	RuntimeError as SharedRuntimeError,
	RuntimeErrorKind as SharedRuntimeErrorKind,
	RuntimeResult as SharedRuntimeResult,
} from "./shared/types";

/**
 * Runtime error categories for provider activation and invocation.
 */
export type RuntimeErrorKind = SharedRuntimeErrorKind;

/**
 * Structured runtime error payload.
 */
export type RuntimeError = SharedRuntimeError;

/**
 * Result type used by runtime functions.
 */
export type RuntimeResult<T> = SharedRuntimeResult<T>;

/**
 * Principal context attached to capability calls.
 */
export type PrincipalContext = SharedPrincipalContext;

/**
 * Invocation context attached to capability calls.
 */
export type InvocationContext = SharedInvocationContext;

/**
 * Capability invocation envelope sent to provider instances.
 */
export type CapabilityCall = SharedCapabilityCall;

/**
 * Provider response envelope for one capability invocation.
 */
export type CapabilityResult = SharedCapabilityResult;

/**
 * Host activation context for provider modules.
 */
export type ActivateContext = SharedActivateContext;

/**
 * Provider instance lifecycle contract.
 */
export type ProviderInstance = SharedProviderInstance;

/**
 * Provider module contract loaded via dynamic import.
 */
export type ProviderModule = SharedProviderModule;

/**
 * Activation arguments for provider runtime.
 */
export type ActivateProviderInput = SharedActivateProviderInput;

/**
 * Provider-runtime configuration defaults used by orchestration API.
 */
export type CreateProviderRuntimeInput = SharedCreateProviderRuntimeInput;

/**
 * Activation input for one provider module under runtime defaults.
 */
export type ActivateProviderRuntimeInput = SharedActivateProviderRuntimeInput;

/**
 * One-shot activation/invocation input for runtime convenience execution.
 */
export type RunProviderCapabilityInput = SharedRunProviderCapabilityInput;

/**
 * Activated provider state tracked by runtime host.
 */
export type ActivatedProvider = SharedActivatedProvider;

/**
 * Provider-runtime orchestration API.
 */
export type ProviderRuntime = SharedProviderRuntime;

export type { ProviderRuntimeHostPorts };

/**
 * Creates a cohesive provider-runtime API with defaults and one-shot execution.
 */
export const createProviderRuntime = (
	input: CreateProviderRuntimeInput,
): ProviderRuntime => {
	const activate: ProviderRuntime["activate"] = (activateInput) => {
		const resolvedBindingPlan = activateInput.bindingPlan ?? input.bindingPlan;
		const resolvedLockfile = activateInput.lockfile ?? input.lockfile;
		const resolvedHostPorts = activateInput.hostPorts ?? input.hostPorts;

		return activateProviderFeature({
			providerModule: activateInput.providerModule,
			hostApiVersion: activateInput.hostApiVersion ?? input.hostApiVersion,
			contracts: activateInput.contracts ?? input.contracts,
			...(resolvedBindingPlan === undefined
				? {}
				: { bindingPlan: resolvedBindingPlan }),
			...(resolvedLockfile === undefined ? {} : { lockfile: resolvedLockfile }),
			...(activateInput.activatedAt === undefined
				? {}
				: { activatedAt: activateInput.activatedAt }),
			...(resolvedHostPorts === undefined
				? {}
				: { hostPorts: resolvedHostPorts }),
		});
	};

	const invoke: ProviderRuntime["invoke"] = (activated, call) =>
		invokeCapabilityFeature(activated, call);

	const deactivate: ProviderRuntime["deactivate"] = (activated) =>
		deactivateProviderFeature(activated);

	const run: ProviderRuntime["run"] = async (runInput) => {
		const activated = await activate({
			providerModule: runInput.providerModule,
			...(runInput.hostApiVersion === undefined
				? {}
				: { hostApiVersion: runInput.hostApiVersion }),
			...(runInput.contracts === undefined
				? {}
				: { contracts: runInput.contracts }),
			...(runInput.bindingPlan === undefined
				? {}
				: { bindingPlan: runInput.bindingPlan }),
			...(runInput.lockfile === undefined
				? {}
				: { lockfile: runInput.lockfile }),
			...(runInput.activatedAt === undefined
				? {}
				: { activatedAt: runInput.activatedAt }),
			...(runInput.hostPorts === undefined
				? {}
				: { hostPorts: runInput.hostPorts }),
		});
		if (!activated.ok) {
			return activated;
		}

		const invocation = await invoke(activated.value, runInput.call);
		const deactivated = await deactivate(activated.value);

		if (!invocation.ok) {
			if (!deactivated.ok) {
				return fail(invocation.error.kind, invocation.error.message, {
					...(invocation.error.details ?? {}),
					deactivationError: deactivated.error,
				});
			}
			return invocation;
		}

		if (!deactivated.ok) {
			return fail(
				deactivated.error.kind,
				deactivated.error.message,
				deactivated.error.details,
			);
		}

		return invocation;
	};

	return {
		activate,
		invoke,
		deactivate,
		run,
	};
};

import { activateProvider as activateProviderFeature } from "../activation/activation";
import { invokeCapability as invokeCapabilityFeature } from "../invocation/invocation";
import { deactivateProvider as deactivateProviderFeature } from "../lifecycle/lifecycle";
import { fail } from "../shared/result";
import type {
	CapabilityResult,
	CreateProviderRuntimeInput,
	ProviderRuntime,
	RuntimeResult,
} from "../shared/types";

const buildActivate = (
	input: CreateProviderRuntimeInput,
): ProviderRuntime["activate"] => {
	return (activateInput) => {
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
};

const handleInvocationFailure = (
	invocationError: RuntimeResult<CapabilityResult>,
	deactivated: RuntimeResult<void>,
): RuntimeResult<CapabilityResult> => {
	if (!invocationError.ok && !deactivated.ok) {
		return fail(invocationError.error.kind, invocationError.error.message, {
			...(invocationError.error.details ?? {}),
			deactivationError: deactivated.error,
		});
	}
	return invocationError;
};

const buildRun = (
	activate: ProviderRuntime["activate"],
	invoke: ProviderRuntime["invoke"],
	deactivate: ProviderRuntime["deactivate"],
): ProviderRuntime["run"] => {
	return async (runInput) => {
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
			return handleInvocationFailure(invocation, deactivated);
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
};

/**
 * Creates a cohesive provider-runtime API with defaults and one-shot execution.
 */
export const createProviderRuntime = (
	input: CreateProviderRuntimeInput,
): ProviderRuntime => {
	const activate = buildActivate(input);
	const invoke: ProviderRuntime["invoke"] = (activated, call) =>
		invokeCapabilityFeature(activated, call);
	const deactivate: ProviderRuntime["deactivate"] = (activated) =>
		deactivateProviderFeature(activated);
	const run = buildRun(activate, invoke, deactivate);

	return {
		activate,
		invoke,
		deactivate,
		run,
	};
};

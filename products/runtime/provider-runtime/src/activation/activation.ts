import { isHostApiCompatible } from "../compatibility/compatibility";
import {
	createDefaultProviderRuntimeHostPorts,
	type ProviderRuntimeHostPorts,
} from "../host";
import { capabilityKey } from "../shared/capability-key";
import { fail, ok } from "../shared/result";
import type {
	ActivatedProvider,
	ActivateProviderInput,
	ProviderInstance,
	RuntimeResult,
} from "../shared/types";
import {
	providerManifestSafeParse,
	validateBindingRequirements,
} from "../validation/validation";

/**
 * Activates a provider module with compatibility and binding checks.
 */
export const activateProvider = async (
	input: ActivateProviderInput,
): Promise<RuntimeResult<ActivatedProvider>> => {
	const hostPorts: ProviderRuntimeHostPorts =
		input.hostPorts ?? createDefaultProviderRuntimeHostPorts();
	const parsedManifestResult = providerManifestSafeParse(
		input.providerModule.manifest,
	);
	if (!parsedManifestResult.ok) {
		return parsedManifestResult;
	}

	const manifest = parsedManifestResult.value;

	const compatibility = isHostApiCompatible(
		manifest.hostApiRange,
		input.hostApiVersion,
	);

	if (!compatibility.ok) {
		return compatibility;
	}

	if (!compatibility.value) {
		return fail(
			"compatibility_error",
			"Provider host API range is incompatible with runtime host API version.",
			{
				hostApiRange: manifest.hostApiRange,
				hostApiVersion: input.hostApiVersion,
			},
		);
	}

	if ((input.bindingPlan === undefined) !== (input.lockfile === undefined)) {
		return fail(
			"activation_error",
			"Binding plan and lockfile must be provided together.",
		);
	}

	if (input.bindingPlan && input.lockfile) {
		const alignment = hostPorts.activationPolicy.assertHostVersionAligned({
			runtimeHostApiVersion: input.hostApiVersion,
			bindingPlanHostApiVersion: input.bindingPlan.hostApiVersion,
			lockfileHostApiVersion: input.lockfile.hostApiVersion,
		});
		if (!alignment.ok) {
			return fail(
				"activation_error",
				alignment.error.message,
				alignment.error.details,
			);
		}

		const bindingValidation = validateBindingRequirements(
			manifest,
			input.contracts,
			input.bindingPlan,
			input.lockfile,
		);

		if (!bindingValidation.ok) {
			return bindingValidation;
		}
	}

	let instance: ProviderInstance;

	try {
		instance = await input.providerModule.activate({
			hostApiVersion: input.hostApiVersion,
			activatedAt: input.activatedAt ?? hostPorts.clock.nowIso(),
		});
	} catch (error) {
		return fail("activation_error", "Provider activation failed.", {
			cause: error instanceof Error ? error.message : String(error),
		});
	}

	if (
		typeof instance !== "object" ||
		instance === null ||
		typeof instance.invoke !== "function" ||
		typeof instance.deactivate !== "function"
	) {
		return fail(
			"activation_error",
			"Provider activation returned invalid instance.",
		);
	}

	const contracts = new Map<string, (typeof input.contracts)[number]>(
		input.contracts.map((contract) => [
			capabilityKey(contract.id, contract.version),
			contract,
		]),
	);
	const bindingResolutions =
		input.bindingPlan === undefined
			? undefined
			: new Map(
					input.bindingPlan.capabilityBindings.map((binding) => [
						capabilityKey(binding.portId, binding.portVersion),
						binding.resolution,
					]),
				);

	return ok({
		manifest,
		instance,
		contracts,
		...(bindingResolutions === undefined ? {} : { bindingResolutions }),
		hostPorts,
	});
};

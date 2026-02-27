import {
	createDomainRuntimeError,
	type DomainRuntimeTypedError,
} from "../execution-core/errors";
import type { DomainCapabilityInputContract } from "./contracts";

export type CapabilityInputValidationResult =
	| { readonly ok: true }
	| { readonly ok: false; readonly error: DomainRuntimeTypedError };

/**
 * Validates capability input payloads before invocation side effects.
 */
export const validateCapabilityInput = (
	stepId: string,
	capabilityId: string,
	input: Readonly<Record<string, unknown>>,
	contract: DomainCapabilityInputContract,
): CapabilityInputValidationResult => {
	const missingRequired = contract.requiredKeys.filter(
		(key) => input[key] === undefined,
	);
	if (missingRequired.length > 0) {
		return {
			ok: false,
			error: createDomainRuntimeError(
				"capability_contract_error",
				"Capability input is missing required keys.",
				{
					stepId,
					capabilityId,
					missingRequired,
				},
			),
		};
	}

	const allowUnknown = contract.allowUnknownKeys === true;
	if (!allowUnknown) {
		const allowed = new Set(
			contract.allowedKeys === undefined
				? contract.requiredKeys
				: contract.allowedKeys,
		);
		const unknownKeys = Object.keys(input).filter((key) => !allowed.has(key));
		if (unknownKeys.length > 0) {
			return {
				ok: false,
				error: createDomainRuntimeError(
					"capability_contract_error",
					"Capability input includes unknown keys.",
					{
						stepId,
						capabilityId,
						unknownKeys,
					},
				),
			};
		}
	}

	return { ok: true };
};

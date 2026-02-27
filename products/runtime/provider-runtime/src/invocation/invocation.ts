import { effectKindSchema } from "@gooi/capability-contracts/capability-port";
import { z } from "zod";
import { ensureObservedEffectsDeclared } from "../effects/effects";
import { capabilityKey } from "../shared/capability-key";
import { fail, ok } from "../shared/result";
import type {
	ActivatedProvider,
	CapabilityCall,
	CapabilityResult,
	RuntimeResult,
} from "../shared/types";

const capabilityResultSchema = z.object({
	ok: z.boolean(),
	output: z.unknown().optional(),
	error: z.unknown().optional(),
	observedEffects: z.array(effectKindSchema),
});

const unreachableError = (
	call: CapabilityCall,
	message: string,
	details?: Readonly<Record<string, unknown>>,
): RuntimeResult<CapabilityResult> =>
	fail("capability_unreachable_error", message, {
		portId: call.portId,
		portVersion: call.portVersion,
		...(details ?? {}),
	});

/**
 * Invokes a validated capability contract on an activated provider.
 */
export const invokeCapability = async (
	activated: ActivatedProvider,
	call: CapabilityCall,
): Promise<RuntimeResult<CapabilityResult>> => {
	const contract = activated.contracts.get(
		capabilityKey(call.portId, call.portVersion),
	);

	if (contract === undefined) {
		return unreachableError(
			call,
			"No contract registered for capability call.",
		);
	}

	const inputValidation = contract.schemas.input.safeParse(call.input);
	if (!inputValidation.success) {
		return fail("validation_error", "Capability input validation failed.", {
			issues: inputValidation.error.issues,
		});
	}

	const key = capabilityKey(call.portId, call.portVersion);
	const resolution = activated.bindingResolutions?.get(key);
	const reachabilityMode =
		resolution?.mode === "delegated" ? "delegated" : "local";
	if (activated.bindingResolutions !== undefined && resolution === undefined) {
		return unreachableError(
			call,
			"No binding resolution registered for capability call.",
		);
	}

	if (resolution?.mode === "unreachable") {
		return unreachableError(
			call,
			"Capability is unreachable in binding plan.",
			{
				resolutionMode: resolution.mode,
			},
		);
	}

	let rawResult: unknown;

	if (resolution?.mode === "delegated") {
		const delegated =
			await activated.hostPorts.capabilityDelegation.invokeDelegated({
				routeId: resolution.delegateRouteId,
				traceId: call.ctx.traceId,
				invocationId: call.ctx.id,
				capabilityCall: {
					portId: call.portId,
					portVersion: call.portVersion,
					input: inputValidation.data,
					principal: call.principal,
					ctx: call.ctx,
				},
			});
		if (!delegated.ok) {
			return fail(
				"capability_delegation_error",
				"Delegated capability invocation failed.",
				{
					routeId: resolution.delegateRouteId,
					targetHost: resolution.targetHost,
					hostErrorCode: delegated.error.code,
					hostErrorMessage: delegated.error.message,
					...(delegated.error.details ?? {}),
				},
			);
		}
		rawResult = delegated.value;
	} else {
		try {
			rawResult = await activated.instance.invoke({
				...call,
				input: inputValidation.data,
			});
		} catch (error) {
			return fail(
				"invocation_error",
				"Provider invocation threw an exception.",
				{
					cause: error instanceof Error ? error.message : String(error),
				},
			);
		}
	}

	const resultValidation = capabilityResultSchema.safeParse(rawResult);
	if (!resultValidation.success) {
		return fail("validation_error", "Provider response envelope is invalid.", {
			issues: resultValidation.error.issues,
		});
	}

	const response = resultValidation.data;

	const effectCheck = ensureObservedEffectsDeclared(
		contract.declaredEffects,
		response.observedEffects,
	);

	if (!effectCheck.ok) {
		return effectCheck;
	}

	if (response.ok) {
		const outputValidation = contract.schemas.output.safeParse(response.output);
		if (!outputValidation.success) {
			return fail("validation_error", "Capability output validation failed.", {
				issues: outputValidation.error.issues,
			});
		}

		return ok({
			ok: true,
			output: outputValidation.data,
			observedEffects: response.observedEffects,
			reachabilityMode,
		});
	}

	const errorValidation = contract.schemas.error.safeParse(response.error);
	if (!errorValidation.success) {
		return fail(
			"validation_error",
			"Capability error payload validation failed.",
			{
				issues: errorValidation.error.issues,
			},
		);
	}

	return ok({
		ok: false,
		error: errorValidation.data,
		observedEffects: response.observedEffects,
		reachabilityMode,
	});
};

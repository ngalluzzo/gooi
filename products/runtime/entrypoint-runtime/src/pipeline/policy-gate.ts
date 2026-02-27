import type {
	CompiledEntrypoint,
	CompiledEntrypointBundle,
} from "@gooi/app-spec-contracts/compiled";
import type { PrincipalContext } from "@gooi/host-contracts/principal";
import type { InvocationEnvelope } from "@gooi/surface-contracts/invocation-envelope";
import type { ResultEnvelope } from "@gooi/surface-contracts/result-envelope";
import {
	deriveEffectiveRoles,
	isAccessAllowedForRoles,
} from "../access-policy/access-policy";
import { entrypointKey, errorEnvelope, errorResult } from "../errors/errors";
import type { HostPortSet } from "../host";

const normalizeRoles = (roles: readonly string[]): readonly string[] =>
	[...new Set(roles)].sort((left, right) => left.localeCompare(right));

interface ResolvePolicyGateInput {
	readonly bundle: CompiledEntrypointBundle;
	readonly entrypoint: CompiledEntrypoint;
	readonly invocation: InvocationEnvelope<Readonly<Record<string, unknown>>>;
	readonly hostPorts: HostPortSet;
	readonly principalInput: unknown;
	readonly startedAt: string;
	readonly nowIso: () => string;
}

export type PolicyGateResult =
	| {
			readonly ok: true;
			readonly principal: PrincipalContext;
			readonly effectiveRoles: readonly string[];
	  }
	| { readonly ok: false; readonly result: ResultEnvelope<unknown, unknown> };

/**
 * Runs principal validation, role derivation, and access-policy gate checks.
 */
export const resolvePolicyGate = (
	input: ResolvePolicyGateInput,
): PolicyGateResult => {
	const validatedPrincipalResult = input.hostPorts.principal.validatePrincipal(
		input.principalInput,
	);
	if (!validatedPrincipalResult.ok) {
		return {
			ok: false,
			result: errorResult(
				input.invocation,
				input.bundle.artifactHash,
				input.startedAt,
				input.nowIso,
				errorEnvelope(
					"validation_error",
					validatedPrincipalResult.error.message,
					false,
					{
						code: "principal_validation_error",
						hostErrorCode: validatedPrincipalResult.error.code,
						...(validatedPrincipalResult.error.details === undefined
							? {}
							: { hostErrorDetails: validatedPrincipalResult.error.details }),
					},
				),
			),
		};
	}

	const principalForPolicy = validatedPrincipalResult.value;
	const effectiveRoles = normalizeRoles(
		deriveEffectiveRoles(principalForPolicy, input.bundle.accessPlan),
	);
	const invocationEntrypointKey = entrypointKey(input.entrypoint);
	if (
		!isAccessAllowedForRoles(
			input.bundle.accessPlan,
			invocationEntrypointKey,
			effectiveRoles,
		)
	) {
		return {
			ok: false,
			result: errorResult(
				{
					...input.invocation,
					principal: principalForPolicy,
				},
				input.bundle.artifactHash,
				input.startedAt,
				input.nowIso,
				errorEnvelope(
					"access_denied_error",
					"Access denied for entrypoint.",
					false,
					{
						entrypointId: input.entrypoint.id,
						entrypointKind: input.entrypoint.kind,
						requiredRoles:
							input.bundle.accessPlan.entrypointRoles[
								invocationEntrypointKey
							] ?? [],
						effectiveRoles,
					},
				),
			),
		};
	}

	return {
		ok: true,
		principal: principalForPolicy,
		effectiveRoles,
	};
};

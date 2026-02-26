import type { CompiledAccessPlan } from "@gooi/spec-compiler/contracts";
import type { PrincipalContext } from "../entrypoint-runtime-contracts/entrypoint-runtime.contracts";

const canDeriveRole = (
	accessPlan: CompiledAccessPlan,
	principal: PrincipalContext,
	roleId: string,
	derived: ReadonlySet<string>,
): boolean => {
	if (roleId === "authenticated" && principal.subject !== null) {
		return true;
	}
	if (roleId === "anonymous" && principal.subject === null) {
		return true;
	}

	const definition = accessPlan.roleDefinitions[roleId];
	if (definition === undefined) {
		return false;
	}

	if (definition.extends.some((parentRole) => !derived.has(parentRole))) {
		return false;
	}

	if (definition.deriveRules.length === 0) {
		return false;
	}

	for (const rule of definition.deriveRules) {
		if (rule.kind === "auth_is_authenticated") {
			if (principal.subject === null) {
				return false;
			}
			continue;
		}
		if (rule.kind === "auth_claim_equals") {
			if (principal.claims[rule.claim] !== rule.expected) {
				return false;
			}
		}
	}

	return true;
};

/**
 * Derives effective role ids for principal access checks.
 *
 * Role derivation is deterministic and plan-driven; caller-supplied tags are
 * non-authoritative and are not used as effective access roles.
 *
 * Derivation order:
 * 1) built-in subject presence roles (`anonymous` and `authenticated`)
 * 2) explicit derive rules from compiled role definitions
 * 3) role extension closure (`extends`)
 *
 * @param principal - Principal context from invocation envelope.
 * @param accessPlan - Compiled access plan used by policy gate.
 * @returns Sorted unique effective role ids.
 *
 * @example
 * const roles = deriveEffectiveRoles(principal, accessPlan);
 */
export const deriveEffectiveRoles = (
	principal: PrincipalContext,
	accessPlan: CompiledAccessPlan,
): readonly string[] => {
	const derived = new Set<string>();
	let changed = true;
	while (changed) {
		changed = false;
		for (const roleId of accessPlan.knownRoles) {
			if (derived.has(roleId)) {
				continue;
			}
			if (canDeriveRole(accessPlan, principal, roleId, derived)) {
				derived.add(roleId);
				changed = true;
			}
		}
	}
	return [...derived].sort((left, right) => left.localeCompare(right));
};

/**
 * Evaluates entrypoint access based on compiled access plan and effective roles.
 *
 * @param accessPlan - Compiled access plan from artifact bundle.
 * @param entrypointKey - Entrypoint key `<kind>:<id>`.
 * @param principal - Principal context from invocation envelope.
 * @returns True when access is allowed.
 *
 * @example
 * const allowed = isAccessAllowed(accessPlan, "query:list_messages", principal);
 */
export const isAccessAllowed = (
	accessPlan: CompiledAccessPlan,
	entrypointKey: string,
	principal: PrincipalContext,
): boolean => {
	const required = accessPlan.entrypointRoles[entrypointKey];
	if (required === undefined || required.length === 0) {
		return accessPlan.defaultPolicy === "allow";
	}
	const effectiveRoles = deriveEffectiveRoles(principal, accessPlan);
	return required.some((role) => effectiveRoles.includes(role));
};

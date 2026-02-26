import type { CompiledAccessPlan } from "@gooi/spec-compiler/contracts";
import type { PrincipalContext } from "./contracts";

/**
 * Derives effective role ids for principal access checks.
 *
 * @param principal - Principal context from invocation envelope.
 * @returns Sorted unique effective role ids.
 *
 * @example
 * const roles = deriveEffectiveRoles(principal);
 */
export const deriveEffectiveRoles = (
	principal: PrincipalContext,
): readonly string[] => {
	const set = new Set<string>(principal.tags);
	if (principal.subject !== null) {
		set.add("authenticated");
	}
	if (principal.claims.is_admin === true) {
		set.add("admin");
	}
	return [...set].sort((left, right) => left.localeCompare(right));
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
	const effectiveRoles = deriveEffectiveRoles(principal);
	return required.some((role) => effectiveRoles.includes(role));
};

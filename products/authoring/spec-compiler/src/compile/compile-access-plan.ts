import type {
	CompiledAccessPlan,
	CompiledRoleDefinition,
	CompiledRoleDeriveRule,
} from "@gooi/app-spec-contracts/compiled";

interface AccessPlanSourceSpec {
	readonly queries: readonly {
		readonly id: string;
		readonly access: { readonly roles: readonly string[] };
	}[];
	readonly mutations: readonly {
		readonly id: string;
		readonly access: { readonly roles: readonly string[] };
	}[];
	readonly access: {
		readonly default_policy: "allow" | "deny";
		readonly roles: Readonly<Record<string, unknown>>;
	};
}

const parseDeriveRules = (
	roleValue: unknown,
): readonly CompiledRoleDeriveRule[] => {
	if (roleValue === null || typeof roleValue !== "object") {
		return [];
	}
	const roleRecord = roleValue as Readonly<Record<string, unknown>>;
	const deriveValue = roleRecord.derive;
	if (deriveValue === null || typeof deriveValue !== "object") {
		return [];
	}
	const deriveRecord = deriveValue as Readonly<Record<string, unknown>>;
	const rules: CompiledRoleDeriveRule[] = [];
	for (const [deriveKind, deriveInput] of Object.entries(deriveRecord).sort(
		([left], [right]) => left.localeCompare(right),
	)) {
		if (deriveKind === "auth_is_authenticated") {
			rules.push({ kind: "auth_is_authenticated" });
			continue;
		}
		if (
			deriveKind === "auth_claim_equals" &&
			Array.isArray(deriveInput) &&
			typeof deriveInput[0] === "string"
		) {
			rules.push({
				kind: "auth_claim_equals",
				claim: deriveInput[0],
				expected: deriveInput[1],
			});
		}
	}
	return rules;
};

const parseExtends = (roleValue: unknown): readonly string[] => {
	if (roleValue === null || typeof roleValue !== "object") {
		return [];
	}
	const roleRecord = roleValue as Readonly<Record<string, unknown>>;
	const extendsValue = roleRecord.extends;
	if (!Array.isArray(extendsValue)) {
		return [];
	}
	const filtered = extendsValue.filter(
		(entry): entry is string => typeof entry === "string" && entry.length > 0,
	);
	return [...new Set(filtered)];
};

/**
 * Compiles access policy declarations into a deterministic access plan.
 */
export const compileAccessPlan = (
	spec: AccessPlanSourceSpec,
): CompiledAccessPlan => {
	const entrypointRoles: Record<string, readonly string[]> = {};
	const roleDefinitions: Record<string, CompiledRoleDefinition> = {};

	for (const query of spec.queries) {
		entrypointRoles[`query:${query.id}`] = [...query.access.roles];
	}
	for (const mutation of spec.mutations) {
		entrypointRoles[`mutation:${mutation.id}`] = [...mutation.access.roles];
	}
	for (const roleId of Object.keys(spec.access.roles).sort((left, right) =>
		left.localeCompare(right),
	)) {
		roleDefinitions[roleId] = {
			roleId,
			extends: parseExtends(spec.access.roles[roleId]),
			deriveRules: parseDeriveRules(spec.access.roles[roleId]),
		};
	}

	return {
		defaultPolicy: spec.access.default_policy,
		knownRoles: Object.keys(roleDefinitions),
		roleDefinitions,
		entrypointRoles,
	};
};

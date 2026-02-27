import type {
	CanonicalSpecModel,
	CompileDiagnostic,
} from "@gooi/app-spec-contracts/compiled";
import { asRecord, asString, referenceNotFound } from "./shared";

const validateEntrypointAccessRoles = (
	diagnostics: CompileDiagnostic[],
	entrypoints: readonly Readonly<Record<string, unknown>>[],
	pathPrefix: "queries" | "mutations" | "routes",
	knownRoleIds: ReadonlySet<string>,
): void => {
	for (const [index, entrypoint] of entrypoints.entries()) {
		const accessRecord = asRecord(entrypoint.access) ?? {};
		const roles = Array.isArray(accessRecord.roles) ? accessRecord.roles : [];
		for (const [roleIndex, roleValue] of roles.entries()) {
			const roleId = asString(roleValue);
			if (roleId === undefined || knownRoleIds.has(roleId)) {
				continue;
			}
			diagnostics.push(
				referenceNotFound(
					`${pathPrefix}.${index}.access.roles.${roleIndex}`,
					`${pathPrefix.slice(0, -1)} references unknown access role \`${roleId}\`.`,
					"Declare the role under `access.roles` or update this entrypoint role binding.",
				),
			);
		}
	}
};

/**
 * Validates references to role ids declared under `access.roles`.
 *
 * @param model - Canonical in-memory model.
 * @returns Access-reference diagnostics.
 */
export const validateAccessLinks = (
	model: CanonicalSpecModel,
): readonly CompileDiagnostic[] => {
	const diagnostics: CompileDiagnostic[] = [];
	const accessRoles = asRecord(model.sections.access?.roles) ?? {};
	const knownRoleIds = new Set(Object.keys(accessRoles));

	validateEntrypointAccessRoles(
		diagnostics,
		model.queries,
		"queries",
		knownRoleIds,
	);
	validateEntrypointAccessRoles(
		diagnostics,
		model.mutations,
		"mutations",
		knownRoleIds,
	);
	validateEntrypointAccessRoles(
		diagnostics,
		model.sections.routes,
		"routes",
		knownRoleIds,
	);

	for (const [roleId, roleValue] of Object.entries(accessRoles)) {
		const roleRecord = asRecord(roleValue) ?? {};
		const extendedRoles = Array.isArray(roleRecord.extends)
			? roleRecord.extends
			: [];
		for (const [index, extendedRole] of extendedRoles.entries()) {
			const extendedRoleId = asString(extendedRole);
			if (extendedRoleId === undefined || knownRoleIds.has(extendedRoleId)) {
				continue;
			}
			diagnostics.push(
				referenceNotFound(
					`access.roles.${roleId}.extends.${index}`,
					`Role \`${roleId}\` extends unknown role \`${extendedRoleId}\`.`,
					"Declare the extended role under `access.roles` or remove it from the extends list.",
				),
			);
		}
	}

	return diagnostics;
};

import type {
	CanonicalSpecModel,
	CompileDiagnostic,
} from "@gooi/app-spec-contracts/compiled";

const duplicateIdDiagnostics = (
	ids: readonly string[],
	pathPrefix: string,
): readonly CompileDiagnostic[] => {
	const seen = new Set<string>();
	const diagnostics: CompileDiagnostic[] = [];
	for (const [index, id] of ids.entries()) {
		if (!seen.has(id)) {
			seen.add(id);
			continue;
		}
		diagnostics.push({
			severity: "error",
			code: "spec_duplicate_id_error",
			path: `${pathPrefix}.${index}.id`,
			message: `Duplicate id \`${id}\` is not allowed.`,
		});
	}
	return diagnostics;
};

/**
 * Validates duplicate id ambiguity across top-level array sections.
 *
 * @param model - Canonical in-memory model.
 * @returns Duplicate-id diagnostics.
 */
export const validateDuplicateIds = (
	model: CanonicalSpecModel,
): readonly CompileDiagnostic[] => [
	...duplicateIdDiagnostics(model.references.queryIds, "queries"),
	...duplicateIdDiagnostics(model.references.mutationIds, "mutations"),
	...duplicateIdDiagnostics(model.references.routeIds, "routes"),
	...duplicateIdDiagnostics(model.references.screenIds, "views.screens"),
	...duplicateIdDiagnostics(model.references.viewNodeIds, "views.nodes"),
];

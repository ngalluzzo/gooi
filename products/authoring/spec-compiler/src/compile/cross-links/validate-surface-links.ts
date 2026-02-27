import type {
	CanonicalSpecModel,
	CompileDiagnostic,
} from "@gooi/app-spec-contracts/compiled";
import { asRecord, referenceNotFound } from "./shared";

/**
 * Validates `wiring.surfaces.*` references to queries/mutations/routes.
 *
 * @param model - Canonical in-memory model.
 * @returns Surface-wiring diagnostics.
 */
export const validateSurfaceLinks = (
	model: CanonicalSpecModel,
): readonly CompileDiagnostic[] => {
	const diagnostics: CompileDiagnostic[] = [];
	const queryIds = new Set(model.references.queryIds);
	const mutationIds = new Set(model.references.mutationIds);
	const routeIds = new Set(model.references.routeIds);

	const wiringRecord = asRecord(model.sections.wiring) ?? {};
	const surfaces = asRecord(wiringRecord.surfaces) ?? {};
	for (const [surfaceId, surface] of Object.entries(surfaces)) {
		const surfaceRecord = asRecord(surface) ?? {};
		const queryBindings = asRecord(surfaceRecord.queries) ?? {};
		for (const queryId of Object.keys(queryBindings)) {
			if (queryIds.has(queryId)) {
				continue;
			}
			diagnostics.push(
				referenceNotFound(
					`wiring.surfaces.${surfaceId}.queries.${queryId}`,
					`Surface wiring references unknown query \`${queryId}\`.`,
				),
			);
		}

		const mutationBindings = asRecord(surfaceRecord.mutations) ?? {};
		for (const mutationId of Object.keys(mutationBindings)) {
			if (mutationIds.has(mutationId)) {
				continue;
			}
			diagnostics.push(
				referenceNotFound(
					`wiring.surfaces.${surfaceId}.mutations.${mutationId}`,
					`Surface wiring references unknown mutation \`${mutationId}\`.`,
				),
			);
		}

		const routeBindings = asRecord(surfaceRecord.routes) ?? {};
		for (const routeId of Object.keys(routeBindings)) {
			if (routeIds.has(routeId)) {
				continue;
			}
			diagnostics.push(
				referenceNotFound(
					`wiring.surfaces.${surfaceId}.routes.${routeId}`,
					`Surface wiring references unknown route \`${routeId}\`.`,
				),
			);
		}
	}

	return diagnostics;
};

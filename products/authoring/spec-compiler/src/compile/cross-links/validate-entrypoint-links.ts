import type {
	CanonicalSpecModel,
	CompileDiagnostic,
} from "../compile.contracts";
import { asRecord, asString, referenceNotFound } from "./shared";

/**
 * Validates query/mutation/route/view cross-section references.
 *
 * @param model - Canonical in-memory model.
 * @returns Entrypoint-reference diagnostics.
 */
export const validateEntrypointLinks = (
	model: CanonicalSpecModel,
): readonly CompileDiagnostic[] => {
	const diagnostics: CompileDiagnostic[] = [];
	const projectionIds = new Set(model.references.projectionIds);
	const actionIds = new Set(model.references.actionIds);
	const queryIds = new Set(model.references.queryIds);
	const screenIds = new Set(model.references.screenIds);

	for (const [index, query] of model.queries.entries()) {
		const returnsRecord = asRecord(query.returns);
		const projectionId = asString(returnsRecord?.projection);
		if (projectionId === undefined || projectionIds.has(projectionId)) {
			continue;
		}
		diagnostics.push(
			referenceNotFound(
				`queries.${index}.returns.projection`,
				`Query references unknown projection \`${projectionId}\`.`,
				"Declare the projection under `domain.projections` or update the query return mapping.",
			),
		);
	}

	for (const [index, mutation] of model.mutations.entries()) {
		const runRecord = asRecord(mutation.run);
		const actionId = asString(runRecord?.actionId);
		if (actionId === undefined || actionIds.has(actionId)) {
			continue;
		}
		diagnostics.push(
			referenceNotFound(
				`mutations.${index}.run.actionId`,
				`Mutation references unknown action \`${actionId}\`.`,
				"Declare the action under `domain.actions` or update the mutation run target.",
			),
		);
	}

	for (const [index, route] of model.sections.routes.entries()) {
		const renderTarget = asString(route.renders);
		if (renderTarget === undefined || screenIds.has(renderTarget)) {
			continue;
		}
		diagnostics.push(
			referenceNotFound(
				`routes.${index}.renders`,
				`Route renders unknown screen \`${renderTarget}\`.`,
				"Declare the screen under `views.screens` or update the route render target.",
			),
		);
	}

	const viewsRecord = asRecord(model.sections.views) ?? {};
	const screens = Array.isArray(viewsRecord.screens) ? viewsRecord.screens : [];
	for (const [screenIndex, screen] of screens.entries()) {
		const data = asRecord(screen.data) ?? {};
		for (const [slotId, binding] of Object.entries(data)) {
			const bindingRecord = asRecord(binding);
			const queryId = asString(bindingRecord?.query);
			if (queryId === undefined || queryIds.has(queryId)) {
				continue;
			}
			diagnostics.push(
				referenceNotFound(
					`views.screens.${screenIndex}.data.${slotId}.query`,
					`Screen data binding references unknown query \`${queryId}\`.`,
					"Declare the query in `queries` or update the screen data binding.",
				),
			);
		}
	}

	return diagnostics;
};

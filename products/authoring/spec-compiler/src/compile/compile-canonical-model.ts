import type { CanonicalSpecModel } from "@gooi/app-spec-contracts/compiled";
import type { GooiAppSpec } from "@gooi/app-spec-contracts/spec";

const sortLexical = (values: readonly string[]): readonly string[] =>
	[...values].sort((left, right) => left.localeCompare(right));

const capabilityReferenceKey = (id: string, version: string): string =>
	`${id}@${version}`;

/**
 * Builds canonical in-memory model and deterministic reference index.
 *
 * @param spec - Parsed app spec.
 * @returns Canonical model consumed by section compilers and validators.
 */
export const buildCanonicalSpecModel = (
	spec: GooiAppSpec,
): CanonicalSpecModel => {
	const queryIds = spec.queries.map((query) => query.id);
	const mutationIds = spec.mutations.map((mutation) => mutation.id);
	const routeIds = spec.routes.map((route) => route.id);
	const screenIds = spec.views.screens.map((screen) => screen.id);
	const actionIds = sortLexical(Object.keys(spec.domain.actions ?? {}));
	const projectionIds = sortLexical(Object.keys(spec.domain.projections ?? {}));
	const capabilityRefs = sortLexical(
		Object.entries(spec.domain.capabilities ?? {}).map(([id, capability]) =>
			capabilityReferenceKey(id, capability.version ?? "1.0.0"),
		),
	);
	const personaIds = sortLexical(Object.keys(spec.personas));
	const scenarioIds = sortLexical(Object.keys(spec.scenarios));

	return {
		sections: {
			app: spec.app,
			domain: spec.domain,
			session: spec.session,
			views: spec.views,
			routes: spec.routes,
			personas: spec.personas,
			scenarios: spec.scenarios,
			wiring: spec.wiring,
			access: spec.access,
		},
		references: {
			queryIds,
			mutationIds,
			routeIds,
			screenIds,
			actionIds,
			projectionIds,
			capabilityRefs,
			personaIds,
			scenarioIds,
		},
		queries: spec.queries as readonly Readonly<Record<string, unknown>>[],
		mutations: spec.mutations as readonly Readonly<Record<string, unknown>>[],
		wiring: spec.wiring,
		views: spec.views,
	};
};

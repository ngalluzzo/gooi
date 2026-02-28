import type {
	CanonicalSpecModel,
	CompileDiagnostic,
	CompiledEntrypoint,
} from "@gooi/app-spec-contracts/compiled";
import {
	type CompiledProjectionIR,
	type CompiledProjectionPlan,
	type CompiledQueryProjectionPlan,
	plansContracts,
} from "@gooi/projection-contracts/plans";
import { asRecord, asString } from "./cross-links/shared";
import { compileProjectionPlan } from "./projection-plan-compiler";
import { projectionError } from "./projection-plan-compiler-shared";

interface CompileProjectionIROutput {
	readonly projectionIR: CompiledProjectionIR;
	readonly diagnostics: readonly CompileDiagnostic[];
}

const sortRecord = <T>(
	value: Readonly<Record<string, T>>,
): Readonly<Record<string, T>> =>
	Object.fromEntries(
		Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
	);

const hasTimelineAsOfViolation = (
	queryId: string,
	entrypoints: Readonly<Record<string, CompiledEntrypoint>>,
	plan: CompiledProjectionPlan,
): boolean => {
	const queryEntrypoint = entrypoints[`query:${queryId}`];
	const asOfField = queryEntrypoint?.inputFields.as_of;
	return asOfField?.scalarType === "timestamp" && plan.strategy !== "timeline";
};

const compileQueryBinding = (input: {
	readonly queryId: string;
	readonly projectionId: string;
	readonly queryIndex: number;
	readonly entrypoints: Readonly<Record<string, CompiledEntrypoint>>;
	readonly compiledProjection: CompiledProjectionPlan;
}): {
	readonly plan: CompiledQueryProjectionPlan;
	readonly diagnostic?: CompileDiagnostic;
} => {
	const queryEntrypoint = input.entrypoints[`query:${input.queryId}`];
	const allowsAsOf =
		queryEntrypoint?.inputFields.as_of?.scalarType === "timestamp";
	const diagnostic = hasTimelineAsOfViolation(
		input.queryId,
		input.entrypoints,
		input.compiledProjection,
	)
		? projectionError(
				`queries.${input.queryIndex}.in.as_of`,
				"Query input `as_of` requires a timeline projection strategy.",
			)
		: undefined;
	return {
		plan: {
			queryId: input.queryId,
			projectionId: input.projectionId,
			allowsAsOf,
			sourceRef: {
				queryId: input.queryId,
				path: `queries.${input.queryIndex}.returns.projection`,
			},
		},
		...(diagnostic === undefined ? {} : { diagnostic }),
	};
};

/**
 * Compiles projection definitions and query-to-projection bindings into IR.
 */
export const compileProjectionIR = (input: {
	readonly model: CanonicalSpecModel;
	readonly entrypoints: Readonly<Record<string, CompiledEntrypoint>>;
}): CompileProjectionIROutput => {
	const diagnostics: CompileDiagnostic[] = [];
	const projectionPlans: Record<string, CompiledProjectionPlan> = {};
	const queryPlans: Record<string, CompiledQueryProjectionPlan> = {};

	const domainRecord = asRecord(input.model.sections.domain) ?? {};
	const authoredProjections = asRecord(domainRecord.projections) ?? {};
	const authoredProjectionIds = new Set(Object.keys(authoredProjections));
	for (const projectionId of Object.keys(authoredProjections).sort((a, b) =>
		a.localeCompare(b),
	)) {
		const result = compileProjectionPlan({
			projectionId,
			value: authoredProjections[projectionId],
		});
		diagnostics.push(...result.diagnostics);
		if (result.plan !== undefined) {
			projectionPlans[projectionId] = result.plan;
		}
	}

	for (let index = 0; index < input.model.queries.length; index += 1) {
		const query = input.model.queries[index];
		const queryId = asString(query?.id);
		const projectionId = asString(asRecord(query?.returns)?.projection);
		if (queryId === undefined || projectionId === undefined) {
			continue;
		}
		const compiledProjection = projectionPlans[projectionId];
		if (compiledProjection === undefined) {
			if (authoredProjectionIds.has(projectionId)) {
				diagnostics.push(
					projectionError(
						`queries.${index}.returns.projection`,
						`Query references projection \`${projectionId}\` that did not compile successfully.`,
					),
				);
			}
			continue;
		}
		const queryBinding = compileQueryBinding({
			queryId,
			projectionId,
			queryIndex: index,
			entrypoints: input.entrypoints,
			compiledProjection,
		});
		queryPlans[queryId] = queryBinding.plan;
		if (queryBinding.diagnostic !== undefined) {
			diagnostics.push(queryBinding.diagnostic);
		}
	}

	return {
		projectionIR: {
			artifactVersion: plansContracts.compiledProjectionIRVersion,
			projections: sortRecord(projectionPlans),
			queries: sortRecord(queryPlans),
		},
		diagnostics,
	};
};

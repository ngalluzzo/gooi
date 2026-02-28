import type { CompileDiagnostic } from "@gooi/app-spec-contracts/compiled";
import type {
	CompiledFromCollectionProjectionPlan,
	CompiledProjectionPlan,
} from "@gooi/projection-contracts/plans";
import { asRecord, asString } from "./cross-links/shared";
import { toSourceRef } from "./projection-plan-compiler-helpers";
import {
	parseFieldSelections,
	parsePagination,
	parseSortRules,
	projectionError,
} from "./projection-plan-compiler-shared";
import {
	compileAggregateProjectionPlan,
	compileJoinProjectionPlan,
	compileTimelineProjectionPlan,
} from "./projection-plan-compiler-strategies";

interface CompileProjectionPlanInput {
	readonly projectionId: string;
	readonly value: unknown;
}
interface CompileProjectionPlanResult {
	readonly diagnostics: readonly CompileDiagnostic[];
	readonly plan?: CompiledProjectionPlan;
}
const compileFromCollection = (
	projectionId: string,
	record: Readonly<Record<string, unknown>>,
	diagnostics: CompileDiagnostic[],
): CompiledFromCollectionProjectionPlan | null => {
	const collectionId = asString(record.collectionId);
	const pagination = parsePagination(
		record.pagination,
		`domain.projections.${projectionId}.pagination`,
		diagnostics,
	);
	if (collectionId === undefined || pagination === null) {
		diagnostics.push(
			projectionError(
				`domain.projections.${projectionId}`,
				"from_collection projections require collectionId and pagination.",
			),
		);
		return null;
	}
	const guard = record.guard as
		| CompiledFromCollectionProjectionPlan["guard"]
		| undefined;
	return {
		projectionId,
		strategy: "from_collection",
		sourceRef: toSourceRef(projectionId, "from_collection"),
		collectionId,
		fields: parseFieldSelections(
			record.fields,
			`domain.projections.${projectionId}.fields`,
			diagnostics,
		),
		sort: parseSortRules(
			record.sort,
			`domain.projections.${projectionId}.sort`,
			diagnostics,
		),
		pagination,
		...(guard === undefined ? {} : { guard }),
	};
};
const toCompileResult = (
	diagnostics: CompileDiagnostic[],
	plan: CompiledProjectionPlan | null,
): CompileProjectionPlanResult =>
	plan === null ? { diagnostics } : { diagnostics, plan };
export const compileProjectionPlan = (
	input: CompileProjectionPlanInput,
): CompileProjectionPlanResult => {
	const diagnostics: CompileDiagnostic[] = [];
	const record = asRecord(input.value);
	if (record === undefined) {
		return {
			diagnostics: [
				projectionError(
					`domain.projections.${input.projectionId}`,
					"Projection definition must be an object.",
				),
			],
		};
	}
	const strategy = asString(record.strategy);
	if (strategy === "from_collection") {
		return toCompileResult(
			diagnostics,
			compileFromCollection(input.projectionId, record, diagnostics),
		);
	}
	if (strategy === "join") {
		return toCompileResult(
			diagnostics,
			compileJoinProjectionPlan(input.projectionId, record, diagnostics),
		);
	}
	if (strategy === "aggregate") {
		return toCompileResult(
			diagnostics,
			compileAggregateProjectionPlan(input.projectionId, record, diagnostics),
		);
	}
	if (strategy === "timeline") {
		return toCompileResult(
			diagnostics,
			compileTimelineProjectionPlan(input.projectionId, record, diagnostics),
		);
	}
	return {
		diagnostics: [
			projectionError(
				`domain.projections.${input.projectionId}.strategy`,
				"Projection strategy must be one of: from_collection, join, aggregate, timeline.",
			),
		],
	};
};

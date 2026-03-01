import type { CompileDiagnostic } from "@gooi/app-spec-contracts/compiled";
import type {
	CompiledAggregateProjectionPlan,
	CompiledJoinProjectionPlan,
	CompiledTimelineProjectionPlan,
} from "@gooi/projection-contracts/plans";
import { asRecord, asString } from "./cross-links/shared";
import {
	parseGroupBy,
	parseMetrics,
	toSourceRef,
} from "./projection-plan-compiler-helpers";
import {
	parseFieldSelections,
	parseJoinEdges,
	parsePagination,
	parseSortRules,
	parseTimelineReducers,
} from "./projection-plan-compiler-shared";

export const compileJoinProjectionPlan = (
	projectionId: string,
	record: Readonly<Record<string, unknown>>,
	diagnostics: CompileDiagnostic[],
): CompiledJoinProjectionPlan | null => {
	const pagination = parsePagination(
		record.pagination,
		`domain.projections.${projectionId}.pagination`,
		diagnostics,
	);
	if (pagination === null) {
		return null;
	}
	const primary = asRecord(record.primary);
	const guard = record.guard as CompiledJoinProjectionPlan["guard"] | undefined;
	return {
		projectionId,
		strategy: "join",
		sourceRef: toSourceRef(projectionId, "join"),
		primary: {
			collectionId:
				asString(primary?.collectionId) ?? asString(primary?.collection) ?? "",
			alias: asString(primary?.alias) ?? asString(primary?.as) ?? "",
		},
		joins: parseJoinEdges(
			record.joins,
			`domain.projections.${projectionId}.joins`,
			diagnostics,
		),
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

export const compileAggregateProjectionPlan = (
	projectionId: string,
	record: Readonly<Record<string, unknown>>,
	diagnostics: CompileDiagnostic[],
): CompiledAggregateProjectionPlan | null => {
	const pagination = parsePagination(
		record.pagination,
		`domain.projections.${projectionId}.pagination`,
		diagnostics,
	);
	if (pagination === null) {
		return null;
	}
	const primary = asRecord(record.primary);
	const guard = record.guard as
		| CompiledAggregateProjectionPlan["guard"]
		| undefined;
	return {
		projectionId,
		strategy: "aggregate",
		sourceRef: toSourceRef(projectionId, "aggregate"),
		primary: {
			collectionId:
				asString(primary?.collectionId) ?? asString(primary?.collection) ?? "",
			alias: asString(primary?.alias) ?? asString(primary?.as) ?? "",
		},
		joins: parseJoinEdges(
			record.joins,
			`domain.projections.${projectionId}.joins`,
			diagnostics,
		),
		groupBy: parseGroupBy(record.groupBy),
		metrics: parseMetrics(record.metrics),
		sort: parseSortRules(
			record.sort,
			`domain.projections.${projectionId}.sort`,
			diagnostics,
		),
		pagination,
		...(guard === undefined ? {} : { guard }),
	};
};

export const compileTimelineProjectionPlan = (
	projectionId: string,
	record: Readonly<Record<string, unknown>>,
	diagnostics: CompileDiagnostic[],
): CompiledTimelineProjectionPlan | null => {
	const pagination = parsePagination(
		record.pagination,
		`domain.projections.${projectionId}.pagination`,
		diagnostics,
	);
	if (pagination === null) {
		return null;
	}
	const orderBy = asRecord(record.orderBy);
	const groupBy = Array.isArray(record.groupBy) ? record.groupBy : undefined;
	const groupByField =
		record.groupByField === null
			? null
			: (asString(record.groupByField) ??
				(typeof groupBy?.[0] === "string" ? groupBy[0] : null));
	const guard = record.guard as
		| CompiledTimelineProjectionPlan["guard"]
		| undefined;
	return {
		projectionId,
		strategy: "timeline",
		sourceRef: toSourceRef(projectionId, "timeline"),
		signals: Array.isArray(record.signals)
			? record.signals.filter(
					(entry): entry is string => typeof entry === "string",
				)
			: [],
		groupByField,
		orderBy: {
			field: asString(orderBy?.field) ?? "emitted_at",
			direction: asString(orderBy?.direction) === "desc" ? "desc" : "asc",
		},
		start: record.start === null ? null : (asRecord(record.start) ?? {}),
		reducers: parseTimelineReducers(
			record.reducers,
			`domain.projections.${projectionId}.reducers`,
			diagnostics,
		),
		signalReplay: (asRecord(record.signalReplay) ??
			{}) as unknown as CompiledTimelineProjectionPlan["signalReplay"],
		pagination,
		history: (asRecord(record.history) ??
			{}) as unknown as CompiledTimelineProjectionPlan["history"],
		...(guard === undefined ? {} : { guard }),
	};
};

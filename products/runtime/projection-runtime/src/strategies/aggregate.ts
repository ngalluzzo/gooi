import type {
	CompiledAggregateProjectionPlan,
	ProjectionAggregateMetricPlan,
} from "@gooi/projection-contracts/plans/projection-plan";
import { stableStringify } from "@gooi/stable-json";
import type {
	ExecuteProjectionContext,
	StrategyExecutionResult,
} from "../execute/contracts";
import { readFieldPath } from "../shared/field-path";
import { applyPagination } from "../shared/pagination";
import { sortRowsDeterministically } from "../shared/sort";
import { buildJoinedRows } from "./join";

interface AggregateBucket {
	readonly groupValues: Readonly<Record<string, unknown>>;
	readonly metrics: Record<string, unknown>;
}

const compareMetricValue = (left: unknown, right: unknown): number => {
	if (left === right) {
		return 0;
	}
	if (left === undefined || left === null) {
		return 1;
	}
	if (right === undefined || right === null) {
		return -1;
	}
	if (typeof left === "number" && typeof right === "number") {
		return left < right ? -1 : 1;
	}
	if (typeof left === "string" && typeof right === "string") {
		return left.localeCompare(right);
	}
	return stableStringify(left).localeCompare(stableStringify(right));
};

const initializeMetric = (metric: ProjectionAggregateMetricPlan): unknown => {
	if (metric.op === "count") {
		return 0;
	}
	return null;
};

const updateMetric = (
	metric: ProjectionAggregateMetricPlan,
	current: unknown,
	joinedRow: Readonly<Record<string, unknown>>,
): unknown => {
	if (metric.op === "count") {
		return typeof current === "number" ? current + 1 : 1;
	}
	const value =
		metric.field === undefined
			? undefined
			: readFieldPath(joinedRow, metric.field);
	if (current === null || current === undefined) {
		return value;
	}
	if (metric.op === "min") {
		return compareMetricValue(value, current) < 0 ? value : current;
	}
	return compareMetricValue(value, current) > 0 ? value : current;
};

/**
 * Executes a deterministic `aggregate` projection strategy.
 */
export const executeAggregateProjection = async (
	plan: CompiledAggregateProjectionPlan,
	context: ExecuteProjectionContext,
): Promise<StrategyExecutionResult> => {
	const joinedRows = await buildJoinedRows(
		{
			primary: plan.primary,
			joins: plan.joins,
		},
		context,
	);
	const grouped = new Map<string, AggregateBucket>();
	for (const joinedRow of joinedRows) {
		const groupValues = Object.fromEntries(
			plan.groupBy.map((field) => [
				field.as,
				readFieldPath(joinedRow, field.field),
			]),
		);
		const groupKey = stableStringify(groupValues);
		const bucket = grouped.get(groupKey) ?? {
			groupValues,
			metrics: Object.fromEntries(
				plan.metrics.map((metric) => [
					metric.metricId,
					initializeMetric(metric),
				]),
			),
		};
		for (const metric of plan.metrics) {
			bucket.metrics[metric.metricId] = updateMetric(
				metric,
				bucket.metrics[metric.metricId],
				joinedRow,
			);
		}
		grouped.set(groupKey, bucket);
	}

	const projectedRows = [...grouped.values()].map((bucket) => ({
		...bucket.groupValues,
		...bucket.metrics,
	}));
	const sorted = sortRowsDeterministically(projectedRows, plan.sort);
	const paged = applyPagination({
		rows: sorted,
		pagination: plan.pagination,
		args: context.args,
		sourceRef: plan.sourceRef,
	});
	if (!paged.ok) {
		return {
			ok: false,
			error: paged.error,
		};
	}
	return {
		ok: true,
		value: {
			rows: paged.value.rows,
			pagination: paged.value.meta,
		},
	};
};

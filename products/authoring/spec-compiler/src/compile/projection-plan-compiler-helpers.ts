import type {
	ProjectionAggregateMetricPlan,
	ProjectionGroupByFieldPlan,
	ProjectionStrategy,
} from "@gooi/projection-contracts/plans";
import { asRecord, asString } from "./cross-links/shared";

export const parseGroupBy = (
	value: unknown,
): readonly ProjectionGroupByFieldPlan[] =>
	Array.isArray(value)
		? value
				.map((entry) => {
					if (typeof entry === "string") {
						const leaf = entry.split(".").at(-1);
						if (leaf === undefined || leaf.length === 0) {
							return null;
						}
						return {
							field: entry,
							as: leaf,
						};
					}
					const record = asRecord(entry);
					const field = asString(record?.field);
					const as = asString(record?.as);
					return field === undefined || as === undefined ? null : { field, as };
				})
				.filter((entry): entry is ProjectionGroupByFieldPlan => entry !== null)
		: [];

export const parseMetrics = (
	value: unknown,
): readonly ProjectionAggregateMetricPlan[] =>
	Array.isArray(value)
		? value
				.map((entry) => {
					const record = asRecord(entry);
					const metricId = asString(record?.metricId) ?? asString(record?.id);
					const op = asString(record?.op);
					const field = asString(record?.field);
					if (
						metricId === undefined ||
						(op !== "count" && op !== "min" && op !== "max")
					) {
						return null;
					}
					return field === undefined
						? { metricId, op }
						: { metricId, op, field };
				})
				.filter(
					(entry): entry is ProjectionAggregateMetricPlan => entry !== null,
				)
		: [];

export const toSourceRef = (
	projectionId: string,
	strategy: ProjectionStrategy,
) => ({
	projectionId,
	path: `domain.projections.${projectionId}`,
	strategy,
});

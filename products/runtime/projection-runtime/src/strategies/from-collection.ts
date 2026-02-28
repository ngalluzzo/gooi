import type { CompiledFromCollectionProjectionPlan } from "@gooi/projection-contracts/plans";
import type {
	ExecuteProjectionContext,
	StrategyExecutionResult,
} from "../execute/contracts";
import { selectProjectionFields } from "../shared/field-path";
import { applyPagination } from "../shared/pagination";
import { sortRowsDeterministically } from "../shared/sort";

/**
 * Executes a deterministic `from_collection` projection strategy.
 */
export const executeFromCollectionProjection = async (
	plan: CompiledFromCollectionProjectionPlan,
	context: ExecuteProjectionContext,
): Promise<StrategyExecutionResult> => {
	const rows = await context.collectionReader.scanCollection({
		collectionId: plan.collectionId,
	});
	const projected = rows.map((row) => selectProjectionFields(row, plan.fields));
	const sorted = sortRowsDeterministically(projected, plan.sort);
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

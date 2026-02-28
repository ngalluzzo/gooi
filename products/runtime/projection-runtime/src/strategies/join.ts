import type {
	CompiledJoinProjectionPlan,
	ProjectionJoinEdgePlan,
} from "@gooi/projection-contracts/plans";
import { stableStringify } from "@gooi/stable-json";
import type {
	ExecuteProjectionContext,
	StrategyExecutionResult,
} from "../execute/contracts";
import { readFieldPath, selectProjectionFields } from "../shared/field-path";
import { applyPagination } from "../shared/pagination";
import { sortRowsDeterministically } from "../shared/sort";

type JoinedRow = Readonly<Record<string, unknown>>;

const keyForJoinValue = (value: unknown): string => stableStringify(value);

const indexJoinCollection = (
	rows: readonly Readonly<Record<string, unknown>>[],
	edge: ProjectionJoinEdgePlan,
): ReadonlyMap<string, readonly Readonly<Record<string, unknown>>[]> => {
	const grouped = new Map<string, Readonly<Record<string, unknown>>[]>();
	for (const row of rows) {
		const joinKey = keyForJoinValue(readFieldPath(row, edge.on.rightField));
		const next = grouped.get(joinKey) ?? [];
		grouped.set(joinKey, [...next, row]);
	}
	return new Map(
		[...grouped.entries()].map(([key, value]) => [
			key,
			sortRowsDeterministically(value, []),
		]),
	);
};

/**
 * Builds canonical joined rows for join/aggregate strategies.
 */
export const buildJoinedRows = async (
	plan: {
		readonly primary: CompiledJoinProjectionPlan["primary"];
		readonly joins: CompiledJoinProjectionPlan["joins"];
	},
	context: ExecuteProjectionContext,
): Promise<readonly JoinedRow[]> => {
	const primaryRows = sortRowsDeterministically(
		await context.collectionReader.scanCollection({
			collectionId: plan.primary.collectionId,
		}),
		[],
	);

	let candidates: JoinedRow[] = primaryRows.map((row) => ({
		[plan.primary.alias]: row,
	}));

	for (const edge of plan.joins) {
		const joinRows = sortRowsDeterministically(
			await context.collectionReader.scanCollection({
				collectionId: edge.collectionId,
			}),
			[],
		);
		const index = indexJoinCollection(joinRows, edge);
		const nextCandidates: JoinedRow[] = [];
		for (const candidate of candidates) {
			const leftValue = readFieldPath(candidate, edge.on.leftField);
			const matchKey = keyForJoinValue(leftValue);
			const matches = index.get(matchKey) ?? [];
			if (matches.length === 0) {
				if (edge.type === "left") {
					nextCandidates.push({
						...candidate,
						[edge.alias]: undefined,
					});
				}
				continue;
			}
			for (const match of matches) {
				nextCandidates.push({
					...candidate,
					[edge.alias]: match,
				});
			}
		}
		candidates = nextCandidates;
	}

	return candidates;
};

/**
 * Executes a deterministic `join` projection strategy.
 */
export const executeJoinProjection = async (
	plan: CompiledJoinProjectionPlan,
	context: ExecuteProjectionContext,
): Promise<StrategyExecutionResult> => {
	const joined = await buildJoinedRows(plan, context);
	const projected = joined.map((row) =>
		selectProjectionFields(row, plan.fields),
	);
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

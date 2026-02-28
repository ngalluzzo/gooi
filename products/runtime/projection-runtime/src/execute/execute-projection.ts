import type {
	ProjectionSemanticExecutionResult,
	ProjectionSemanticGuardMeta,
} from "@gooi/kernel-contracts/projection-semantic";
import { errorsContracts } from "@gooi/projection-contracts/errors";
import type {
	CompiledProjectionPlan,
	CompiledTimelineProjectionPlan,
	TimelineAccumulationState,
} from "@gooi/projection-contracts/plans";
import type { HistoryPort } from "@gooi/projection-contracts/ports";
import type { ProjectionCollectionReaderPort } from "../ports/collection-reader";
import { assertNever } from "../shared/assert-never";
import { createProviderError } from "../shared/errors";
import { executeAggregateProjection } from "../strategies/aggregate";
import { executeFromCollectionProjection } from "../strategies/from-collection";
import { executeJoinProjection } from "../strategies/join";
import { executeTimelineProjection } from "../strategies/timeline";
import { applyProjectionGuards } from "./apply-projection-guards";
import type { ExecuteProjectionContext } from "./contracts";
import {
	type RebuildTimelineProjectionInput,
	type RebuildTimelineProjectionResult,
	rebuildTimelineProjection,
} from "./rebuild-timeline";

/**
 * Input payload for one projection strategy execution.
 */
export interface ExecuteProjectionInput {
	readonly plan: CompiledProjectionPlan;
	readonly args: Readonly<Record<string, unknown>>;
	readonly asOf?: string | null;
	readonly collectionReader: ProjectionCollectionReaderPort;
	readonly historyPort?: HistoryPort;
	readonly timelineState?: TimelineAccumulationState;
}

/**
 * Runtime API for deterministic projection execution.
 */
export interface ProjectionRuntime {
	readonly executeProjection: (
		input: ExecuteProjectionInput,
	) => Promise<ProjectionSemanticExecutionResult>;
	readonly rebuildTimelineProjection: (
		input: RebuildTimelineProjectionInput,
	) => Promise<RebuildTimelineProjectionResult>;
}

const toExecutionContext = (
	input: ExecuteProjectionInput,
): ExecuteProjectionContext => ({
	args: input.args,
	asOf: input.asOf ?? null,
	collectionReader: input.collectionReader,
	...(input.historyPort === undefined
		? {}
		: { historyPort: input.historyPort }),
	...(input.timelineState === undefined
		? {}
		: { timelineState: input.timelineState }),
});

const ensureTimelineAsOfUsage = (
	plan: CompiledProjectionPlan,
	asOf: string | null,
): ProjectionSemanticExecutionResult | null => {
	if (asOf === null) {
		return null;
	}
	if (plan.strategy === "timeline") {
		return null;
	}
	return {
		ok: false,
		error: errorsContracts.createProjectionError(
			"projection_as_of_error",
			"Query supplied as_of for a non-timeline projection strategy.",
			plan.sourceRef,
			{ strategy: plan.strategy },
		),
	};
};

const toSemanticResult = (
	result: Awaited<
		ReturnType<
			| typeof executeFromCollectionProjection
			| typeof executeJoinProjection
			| typeof executeAggregateProjection
			| typeof executeTimelineProjection
		>
	>,
	guardMeta?: ProjectionSemanticGuardMeta,
): ProjectionSemanticExecutionResult => {
	if (!result.ok) {
		return { ok: false, error: result.error };
	}
	return {
		ok: true,
		rows: result.value.rows,
		pagination: result.value.pagination,
		...(guardMeta === undefined ? {} : { guards: guardMeta }),
		...(result.value.timeline === undefined
			? {}
			: { timeline: result.value.timeline }),
	};
};

const dispatchProjectionStrategy = async (
	plan: CompiledProjectionPlan,
	context: ExecuteProjectionContext,
): Promise<
	| Awaited<ReturnType<typeof executeFromCollectionProjection>>
	| Awaited<ReturnType<typeof executeJoinProjection>>
	| Awaited<ReturnType<typeof executeAggregateProjection>>
	| Awaited<ReturnType<typeof executeTimelineProjection>>
> => {
	switch (plan.strategy) {
		case "from_collection":
			return executeFromCollectionProjection(plan, context);
		case "join":
			return executeJoinProjection(plan, context);
		case "aggregate":
			return executeAggregateProjection(plan, context);
		case "timeline":
			return executeTimelineProjection(
				plan as CompiledTimelineProjectionPlan,
				context,
			);
	}
	return assertNever(plan);
};

/**
 * Creates the projection runtime executor.
 */
export const createProjectionRuntime = (): ProjectionRuntime => ({
	executeProjection: async (input) => {
		const asOfCheck = ensureTimelineAsOfUsage(input.plan, input.asOf ?? null);
		if (asOfCheck !== null) {
			return asOfCheck;
		}

		const context = toExecutionContext(input);
		try {
			const strategyResult = await dispatchProjectionStrategy(
				input.plan,
				context,
			);
			if (!strategyResult.ok) {
				return toSemanticResult(strategyResult);
			}
			const guardedRows = applyProjectionGuards({
				plan: input.plan,
				rows: strategyResult.value.rows,
				args: input.args,
				asOf: context.asOf,
			});
			if (!guardedRows.ok) {
				return { ok: false, error: guardedRows.error };
			}
			return toSemanticResult(
				{
					ok: true,
					value: {
						...strategyResult.value,
						rows: guardedRows.rows,
					},
				},
				guardedRows.guardMeta,
			);
		} catch (error) {
			return {
				ok: false,
				error: createProviderError(
					"Projection strategy execution failed due to provider/runtime exception.",
					input.plan.sourceRef,
					{
						error:
							error instanceof Error
								? { name: error.name, message: error.message }
								: { value: String(error) },
					},
				),
			};
		}
	},
	rebuildTimelineProjection: async (input) => rebuildTimelineProjection(input),
});

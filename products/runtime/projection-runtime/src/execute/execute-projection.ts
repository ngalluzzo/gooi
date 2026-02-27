import {
	type ProjectionResultEnvelope,
	projectionResultEnvelopeVersion,
} from "@gooi/projection-contracts/envelopes/projection-result-envelope";
import { createProjectionError } from "@gooi/projection-contracts/errors/projection-errors";
import type {
	CompiledProjectionPlan,
	CompiledTimelineProjectionPlan,
} from "@gooi/projection-contracts/plans/projection-plan";
import type { TimelineAccumulationState } from "@gooi/projection-contracts/plans/timeline-history-policy";
import type { HistoryPort } from "@gooi/projection-contracts/ports/history-port-contract";
import type { ProjectionCollectionReaderPort } from "../ports/collection-reader";
import { assertNever } from "../shared/assert-never";
import { createProviderError } from "../shared/errors";
import { executeAggregateProjection } from "../strategies/aggregate";
import { executeFromCollectionProjection } from "../strategies/from-collection";
import { executeJoinProjection } from "../strategies/join";
import { executeTimelineProjection } from "../strategies/timeline";
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
	readonly artifactHash: string;
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
	) => Promise<ProjectionResultEnvelope>;
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
	artifactHash: input.artifactHash,
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
): ProjectionResultEnvelope | null => {
	if (asOf === null) {
		return null;
	}
	if (plan.strategy === "timeline") {
		return null;
	}
	return {
		envelopeVersion: projectionResultEnvelopeVersion,
		ok: false,
		error: createProjectionError(
			"projection_as_of_error",
			"Query supplied as_of for a non-timeline projection strategy.",
			plan.sourceRef,
			{ strategy: plan.strategy },
		),
	};
};

const toEnvelope = (
	plan: CompiledProjectionPlan,
	artifactHash: string,
	result: Awaited<
		ReturnType<
			| typeof executeFromCollectionProjection
			| typeof executeJoinProjection
			| typeof executeAggregateProjection
			| typeof executeTimelineProjection
		>
	>,
): ProjectionResultEnvelope => {
	if (!result.ok) {
		return {
			envelopeVersion: projectionResultEnvelopeVersion,
			ok: false,
			error: result.error,
		};
	}
	return {
		envelopeVersion: projectionResultEnvelopeVersion,
		ok: true,
		rows: result.value.rows,
		meta: {
			projectionId: plan.projectionId,
			strategy: plan.strategy,
			artifactHash,
			pagination: result.value.pagination,
			...(result.value.timeline === undefined
				? {}
				: { timeline: result.value.timeline }),
		},
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
			return toEnvelope(input.plan, input.artifactHash, strategyResult);
		} catch (error) {
			return {
				envelopeVersion: projectionResultEnvelopeVersion,
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

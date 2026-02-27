import { resolveProjectionRefreshImpact } from "@gooi/projection-runtime/refresh";
import type {
	ProjectionConformanceReport,
	RunProjectionConformanceInput,
} from "./contracts";

const buildCheck = (
	id: ProjectionConformanceReport["checks"][number]["id"],
	passed: boolean,
	detail: string,
): ProjectionConformanceReport["checks"][number] => ({ id, passed, detail });

const allPassed = (
	checks: readonly ProjectionConformanceReport["checks"][number][],
): boolean => checks.every((check) => check.passed);

/**
 * Runs projection-runtime conformance checks for deterministic projection/domain parity.
 */
export const runProjectionConformance = async (
	input: RunProjectionConformanceInput,
): Promise<ProjectionConformanceReport> => {
	const checks: Array<ProjectionConformanceReport["checks"][number]> = [];

	const affectedQueryIds = resolveProjectionRefreshImpact(
		input.refreshSubscriptions,
		input.emittedSignalIds,
	);
	checks.push(
		buildCheck(
			"refresh_invalidation_parity",
			affectedQueryIds.join(",") === input.expectedAffectedQueryIds.join(","),
			affectedQueryIds.join(",") === input.expectedAffectedQueryIds.join(",")
				? "Refresh impact matches emitted domain invalidation signals."
				: `Expected ${input.expectedAffectedQueryIds.join(",")}, received ${affectedQueryIds.join(",")}.`,
		),
	);

	const aggregate = await input.runtime.executeProjection({
		plan: input.aggregatePlan,
		args: { page: 1, page_size: 20 },
		artifactHash: "projection_conformance_artifact",
		collectionReader: input.collectionReader,
		historyPort: input.historyPort,
	});
	checks.push(
		buildCheck(
			"projection_output_matches_mutation_fixture",
			aggregate.ok &&
				JSON.stringify(aggregate.rows) ===
					JSON.stringify(input.expectedAggregateRows),
			aggregate.ok
				? "Projection output matches mutation-derived fixture state."
				: `Aggregate execution failed with ${aggregate.error?.code ?? "unknown"}.`,
		),
	);

	const staleRead = await input.runtime.executeProjection({
		plan: input.timelinePlan,
		args: { page: 1, page_size: 20 },
		artifactHash: "projection_conformance_artifact",
		collectionReader: input.collectionReader,
		historyPort: input.historyPort,
		timelineState: {
			compiledAccumulationHash: "compiled_hash",
			persistedAccumulationHash: "persisted_hash",
			rebuildStatus: "stale",
			rebuildProgress: null,
			rebuildStartedAt: null,
			historyComplete: true,
		},
	});
	checks.push(
		buildCheck(
			"stale_read_blocked",
			!staleRead.ok &&
				staleRead.error?.code === "projection_rebuild_required_error",
			!staleRead.ok &&
				staleRead.error?.code === "projection_rebuild_required_error"
				? "Stale timeline reads are blocked until explicit rebuild."
				: `Expected projection_rebuild_required_error, received ${staleRead.error?.code ?? "success"}.`,
		),
	);

	const asOfGate = await input.runtime.executeProjection({
		plan: input.timelinePlan,
		args: { page: 1, page_size: 20 },
		asOf: "2026-02-27T00:00:01.000Z",
		artifactHash: "projection_conformance_artifact",
		collectionReader: input.collectionReader,
		historyPort: input.historyPortWithoutAsOf,
	});
	checks.push(
		buildCheck(
			"as_of_capability_gate_enforced",
			!asOfGate.ok &&
				asOfGate.error?.code === "projection_history_capability_error",
			!asOfGate.ok &&
				asOfGate.error?.code === "projection_history_capability_error"
				? "Timeline as_of requires explicit history.scan_as_of support."
				: `Expected projection_history_capability_error, received ${asOfGate.error?.code ?? "success"}.`,
		),
	);

	const timeline = await input.runtime.executeProjection({
		plan: input.timelinePlan,
		args: { page: 1, page_size: 20, limit: 100 },
		artifactHash: "projection_conformance_artifact",
		collectionReader: input.collectionReader,
		historyPort: input.historyPort,
		timelineState: {
			compiledAccumulationHash: "aligned_hash",
			persistedAccumulationHash: "aligned_hash",
			rebuildStatus: "complete",
			rebuildProgress: null,
			rebuildStartedAt: null,
			historyComplete: true,
		},
	});
	const dedupePassed =
		timeline.ok &&
		Array.isArray(timeline.rows) &&
		Number(timeline.rows[0]?.message_count ?? 0) === 2;
	checks.push(
		buildCheck(
			"duplicate_event_key_deduped",
			dedupePassed,
			dedupePassed
				? "Duplicate event keys are idempotently deduped for timeline replay."
				: `Timeline dedupe check failed with ${timeline.ok ? "unexpected row state" : (timeline.error?.code ?? "unknown")}.`,
		),
	);

	return {
		passed: allPassed(checks),
		checks,
		...(timeline.ok ? { lastTimelineResult: timeline } : {}),
	};
};

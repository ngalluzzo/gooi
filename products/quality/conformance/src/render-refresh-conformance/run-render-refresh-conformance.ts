import type { ProjectionRefreshSubscriptions } from "@gooi/projection-runtime/refresh";
import { resolveProjectionRefreshImpact } from "@gooi/projection-runtime/refresh";
import { stableStringify } from "@gooi/stable-json";
import { resolveRenderRefreshLifecycle } from "@gooi/surface-runtime";
import type {
	RenderRefreshConformanceReport,
	RunRenderRefreshConformanceInput,
} from "./contracts";

const sortLexical = (values: readonly string[]): readonly string[] =>
	[...values].sort((left, right) => left.localeCompare(right));

const buildCheck = (
	id: RenderRefreshConformanceReport["checks"][number]["id"],
	passed: boolean,
	detail: string,
): RenderRefreshConformanceReport["checks"][number] => ({
	id,
	passed,
	detail,
});

const deriveProjectionRefreshSubscriptions = (
	input: RunRenderRefreshConformanceInput["viewRenderIR"],
): ProjectionRefreshSubscriptions => {
	const signalSets = new Map<string, Set<string>>();
	for (const screenId of input.screenOrder) {
		const screen = input.screens[screenId];
		if (screen === undefined) {
			continue;
		}
		for (const slotId of sortLexical(Object.keys(screen.data))) {
			const slot = screen.data[slotId];
			if (slot === undefined) {
				continue;
			}
			const signalSet = signalSets.get(slot.queryId) ?? new Set<string>();
			for (const signalId of slot.refreshOnSignals) {
				signalSet.add(signalId);
			}
			signalSets.set(slot.queryId, signalSet);
		}
	}
	return Object.fromEntries(
		[...signalSets.entries()]
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([queryId, signalSet]) => [
				queryId,
				{
					queryId,
					signalIds: sortLexical([...signalSet]),
				},
			]),
	);
};

/**
 * Runs render refresh lifecycle conformance checks.
 */
export const runRenderRefreshConformance = (
	input: RunRenderRefreshConformanceInput,
): RenderRefreshConformanceReport => {
	const checks: Array<RenderRefreshConformanceReport["checks"][number]> = [];
	const subscriptions = deriveProjectionRefreshSubscriptions(
		input.viewRenderIR,
	);
	const emittedSignalIds = input.refreshTriggers.map(
		(trigger) => trigger.signalId,
	);
	const projectionAffectedQueryIds = resolveProjectionRefreshImpact(
		subscriptions,
		emittedSignalIds,
	);
	const runtimeLifecycle = resolveRenderRefreshLifecycle({
		viewRenderIR: input.viewRenderIR,
		refreshTriggers: input.refreshTriggers,
		affectedQueryIds: input.runtimeAffectedQueryIds,
	});
	const repeatedLifecycle = resolveRenderRefreshLifecycle({
		viewRenderIR: input.viewRenderIR,
		refreshTriggers: input.refreshTriggers,
		affectedQueryIds: input.runtimeAffectedQueryIds,
	});

	checks.push(
		buildCheck(
			"refresh_signal_consumption",
			stableStringify(runtimeLifecycle.plan.derivedAffectedQueryIds) ===
				stableStringify(projectionAffectedQueryIds),
			stableStringify(runtimeLifecycle.plan.derivedAffectedQueryIds) ===
				stableStringify(projectionAffectedQueryIds)
				? "Render refresh lifecycle consumed canonical invalidation signals."
				: `Expected ${projectionAffectedQueryIds.join(",")}, received ${runtimeLifecycle.plan.derivedAffectedQueryIds.join(",")}.`,
		),
	);
	checks.push(
		buildCheck(
			"refresh_order_determinism",
			stableStringify(runtimeLifecycle.plan) ===
				stableStringify(repeatedLifecycle.plan),
			stableStringify(runtimeLifecycle.plan) ===
				stableStringify(repeatedLifecycle.plan)
				? "Refresh plan ordering is deterministic under concurrent invalidations."
				: "Refresh lifecycle ordering diverged for equivalent inputs.",
		),
	);

	const runtimeProjectionAligned =
		stableStringify(sortLexical(input.runtimeAffectedQueryIds)) ===
			stableStringify(projectionAffectedQueryIds) &&
		runtimeLifecycle.diagnostics.length === 0;
	checks.push(
		buildCheck(
			"runtime_projection_consistency",
			runtimeProjectionAligned,
			runtimeProjectionAligned
				? "UI refresh artifacts are consistent with runtime and projection outputs."
				: `Runtime affected queries ${sortLexical(input.runtimeAffectedQueryIds).join(",")} diverged from projection ${projectionAffectedQueryIds.join(",")}.`,
		),
	);

	const driftLifecycle = resolveRenderRefreshLifecycle({
		viewRenderIR: input.viewRenderIR,
		refreshTriggers: input.refreshTriggers,
		affectedQueryIds: input.driftedRuntimeAffectedQueryIds,
	});
	const hasDriftDiagnostic = driftLifecycle.diagnostics.some(
		(item) => item.code === "render_refresh_consistency_error",
	);
	checks.push(
		buildCheck(
			"consistency_diagnostic_on_drift",
			!driftLifecycle.ok && hasDriftDiagnostic,
			!driftLifecycle.ok && hasDriftDiagnostic
				? "Refresh drift emits typed consistency diagnostics."
				: "Expected typed render refresh drift diagnostics.",
		),
	);

	return {
		passed: checks.every((check) => check.passed),
		checks,
		...(driftLifecycle.diagnostics.length === 0
			? {}
			: { diagnostics: driftLifecycle.diagnostics }),
	};
};

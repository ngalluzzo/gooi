import { renderDiagnosticEnvelopeVersion } from "@gooi/render-contracts/envelopes";
import type { CompiledViewRenderIR } from "@gooi/render-contracts/ir";
import {
	type RenderRefreshConsistencyDiagnostic,
	type RenderRefreshLifecycleResult,
	type RenderRefreshPlan,
	type RenderRefreshScreenArtifact,
	type RenderRefreshSlotArtifact,
	renderRefreshPlanVersion,
} from "@gooi/render-contracts/refresh";
import type { RefreshTrigger } from "@gooi/surface-contracts/envelope";

export interface ResolveRenderRefreshLifecycleInput {
	readonly viewRenderIR: CompiledViewRenderIR;
	readonly refreshTriggers: readonly RefreshTrigger[];
	readonly affectedQueryIds: readonly string[];
}

const sortLexical = (values: readonly string[]): readonly string[] =>
	[...values].sort((left, right) => left.localeCompare(right));

const uniqueSorted = (values: readonly string[]): readonly string[] =>
	sortLexical([...new Set(values)]);

const normalizeRefreshTriggers = (
	triggers: readonly RefreshTrigger[],
): readonly RefreshTrigger[] => {
	const deduped = new Map<string, RefreshTrigger>();
	for (const trigger of triggers) {
		const dedupeKey = `${trigger.signalId}:${trigger.signalVersion}:${trigger.payloadHash}`;
		if (!deduped.has(dedupeKey)) {
			deduped.set(dedupeKey, trigger);
		}
	}
	return [...deduped.values()].sort((left, right) => {
		if (left.signalId !== right.signalId) {
			return left.signalId.localeCompare(right.signalId);
		}
		if (left.signalVersion !== right.signalVersion) {
			return left.signalVersion - right.signalVersion;
		}
		return left.payloadHash.localeCompare(right.payloadHash);
	});
};

const buildRefreshArtifacts = (input: {
	readonly viewRenderIR: CompiledViewRenderIR;
	readonly runtimeAffectedQueryIds: readonly string[];
	readonly triggerSignalIds: readonly string[];
}): {
	readonly slotRefreshes: readonly RenderRefreshSlotArtifact[];
	readonly screenRefreshes: readonly RenderRefreshScreenArtifact[];
	readonly derivedAffectedQueryIds: readonly string[];
} => {
	const runtimeAffectedSet = new Set(input.runtimeAffectedQueryIds);
	const triggerSignalSet = new Set(input.triggerSignalIds);
	const slotRefreshes: RenderRefreshSlotArtifact[] = [];
	const byScreen = new Map<
		string,
		{ slotIds: Set<string>; queryIds: Set<string> }
	>();

	for (const screenId of input.viewRenderIR.screenOrder) {
		const screen = input.viewRenderIR.screens[screenId];
		if (screen === undefined) {
			continue;
		}
		for (const slotId of sortLexical(Object.keys(screen.data))) {
			const slot = screen.data[slotId];
			if (slot === undefined) {
				continue;
			}
			const matchedSignalIds = uniqueSorted(
				slot.refreshOnSignals.filter((signalId) =>
					triggerSignalSet.has(signalId),
				),
			);
			const shouldRefresh =
				matchedSignalIds.length > 0 || runtimeAffectedSet.has(slot.queryId);
			if (!shouldRefresh) {
				continue;
			}
			slotRefreshes.push({
				screenId,
				slotId,
				queryId: slot.queryId,
				matchedSignalIds,
			});
			const byScreenRecord = byScreen.get(screenId) ?? {
				slotIds: new Set<string>(),
				queryIds: new Set<string>(),
			};
			byScreenRecord.slotIds.add(slotId);
			byScreenRecord.queryIds.add(slot.queryId);
			byScreen.set(screenId, byScreenRecord);
		}
	}

	const screenRefreshes: RenderRefreshScreenArtifact[] = [];
	for (const screenId of input.viewRenderIR.screenOrder) {
		const refreshes = byScreen.get(screenId);
		if (refreshes === undefined) {
			continue;
		}
		screenRefreshes.push({
			screenId,
			slotIds: sortLexical([...refreshes.slotIds]),
			queryIds: sortLexical([...refreshes.queryIds]),
		});
	}

	const derivedAffectedQueryIds = uniqueSorted(
		slotRefreshes
			.filter((slot) => slot.matchedSignalIds.length > 0)
			.map((slot) => slot.queryId),
	);

	return {
		slotRefreshes,
		screenRefreshes,
		derivedAffectedQueryIds,
	};
};

const buildConsistencyDiagnostic = (input: {
	readonly runtimeAffectedQueryIds: readonly string[];
	readonly derivedAffectedQueryIds: readonly string[];
}): RenderRefreshConsistencyDiagnostic | undefined => {
	const runtimeSet = new Set(input.runtimeAffectedQueryIds);
	const derivedSet = new Set(input.derivedAffectedQueryIds);
	const missingInRuntime = input.derivedAffectedQueryIds.filter(
		(queryId) => !runtimeSet.has(queryId),
	);
	const missingInDerived = input.runtimeAffectedQueryIds.filter(
		(queryId) => !derivedSet.has(queryId),
	);
	if (missingInRuntime.length === 0 && missingInDerived.length === 0) {
		return undefined;
	}
	return {
		envelopeVersion: renderDiagnosticEnvelopeVersion,
		code: "render_refresh_consistency_error",
		message:
			"Render refresh lifecycle diverged from runtime affected query metadata.",
		path: "result.meta.affectedQueryIds",
		details: {
			runtimeAffectedQueryIds: input.runtimeAffectedQueryIds,
			derivedAffectedQueryIds: input.derivedAffectedQueryIds,
			missingInRuntime,
			missingInDerived,
		},
	};
};

/**
 * Resolves deterministic render refresh artifacts from canonical invalidation metadata.
 */
export const resolveRenderRefreshLifecycle = (
	input: ResolveRenderRefreshLifecycleInput,
): RenderRefreshLifecycleResult => {
	const normalizedTriggers = normalizeRefreshTriggers(input.refreshTriggers);
	const runtimeAffectedQueryIds = uniqueSorted(input.affectedQueryIds);
	const artifacts = buildRefreshArtifacts({
		viewRenderIR: input.viewRenderIR,
		runtimeAffectedQueryIds,
		triggerSignalIds: normalizedTriggers.map((trigger) => trigger.signalId),
	});
	const diagnostics: RenderRefreshConsistencyDiagnostic[] = [];
	const consistency = buildConsistencyDiagnostic({
		runtimeAffectedQueryIds,
		derivedAffectedQueryIds: artifacts.derivedAffectedQueryIds,
	});
	if (consistency !== undefined) {
		diagnostics.push(consistency);
	}

	const plan: RenderRefreshPlan = {
		artifactVersion: renderRefreshPlanVersion,
		refreshTriggers: normalizedTriggers,
		runtimeAffectedQueryIds,
		derivedAffectedQueryIds: artifacts.derivedAffectedQueryIds,
		slotRefreshes: artifacts.slotRefreshes,
		screenRefreshes: artifacts.screenRefreshes,
	};

	return {
		ok: diagnostics.length === 0,
		plan,
		diagnostics,
	};
};

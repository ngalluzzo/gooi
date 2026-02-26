import type { CompiledRefreshSubscription } from "@gooi/spec-compiler/contracts";
import type { RefreshTrigger, SignalEnvelope } from "./contracts";

/**
 * Derives refresh triggers from emitted mutation signals.
 *
 * @param signals - Emitted mutation signals.
 * @returns Refresh triggers for query subscription matching.
 *
 * @example
 * const triggers = buildRefreshTriggers(signals);
 */
export const buildRefreshTriggers = (
	signals: readonly SignalEnvelope[],
): readonly RefreshTrigger[] =>
	signals.map((signal) => ({
		signalId: signal.signalId,
		signalVersion: signal.signalVersion,
		payloadHash: signal.payloadHash,
	}));

/**
 * Matches refresh triggers against compiled refresh subscriptions.
 *
 * @param subscriptions - Compiled query refresh subscriptions.
 * @param triggers - Refresh triggers emitted by mutation execution.
 * @returns Sorted unique query ids affected by the triggers.
 *
 * @example
 * const ids = resolveAffectedQueryIds(bundle.refreshSubscriptions, triggers);
 */
export const resolveAffectedQueryIds = (
	subscriptions: Readonly<Record<string, CompiledRefreshSubscription>>,
	triggers: readonly RefreshTrigger[],
): readonly string[] => {
	const signalIds = new Set(triggers.map((trigger) => trigger.signalId));
	const affected = new Set<string>();
	for (const subscription of Object.values(subscriptions)) {
		if (subscription.signalIds.some((signalId) => signalIds.has(signalId))) {
			affected.add(subscription.queryId);
		}
	}
	return [...affected].sort((left, right) => left.localeCompare(right));
};

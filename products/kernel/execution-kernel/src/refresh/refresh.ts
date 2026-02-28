import type { CompiledRefreshSubscription } from "@gooi/app-spec-contracts/compiled";
import type {
	RefreshTrigger,
	SignalEnvelope,
} from "@gooi/surface-contracts/envelope";

/**
 * Derives refresh triggers from emitted mutation signals.
 */
export const buildRefreshTriggers = (
	signals: readonly SignalEnvelope[],
): readonly RefreshTrigger[] => {
	const deduped = new Map<string, RefreshTrigger>();
	for (const signal of signals) {
		const trigger: RefreshTrigger = {
			signalId: signal.signalId,
			signalVersion: signal.signalVersion,
			payloadHash: signal.payloadHash,
		};
		const dedupeKey = `${trigger.signalId}:${trigger.signalVersion}:${trigger.payloadHash}`;
		if (!deduped.has(dedupeKey)) {
			deduped.set(dedupeKey, trigger);
		}
	}
	return [...deduped.values()];
};

/**
 * Matches refresh triggers against compiled refresh subscriptions.
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

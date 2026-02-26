import type { CompiledRefreshSubscription } from "@gooi/spec-compiler/contracts";
import type {
	RefreshTrigger,
	SignalEnvelope,
} from "@gooi/surface-contracts/signal-envelope";

/**
 * Derives refresh triggers from emitted mutation signals.
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

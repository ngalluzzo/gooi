import type { GuardViolationSignalEnvelope } from "@gooi/guard-contracts/signals/guard-violation-signal";
import { sha256, stableStringify } from "@gooi/stable-json";
import { surfaceEnvelopeVersion } from "@gooi/surface-contracts/envelope-version";
import type { SignalEnvelope } from "@gooi/surface-contracts/signal-envelope";

/**
 * Converts guard-runtime violation signal envelopes into canonical surface signals.
 */
export const toSurfaceGuardSignals = (
	signals: readonly GuardViolationSignalEnvelope[],
	now: string,
): readonly SignalEnvelope[] =>
	signals.map((signal) => {
		const payload = {
			primitiveKind: signal.primitiveKind,
			primitiveId: signal.primitiveId,
			guardTier: signal.guardTier,
			guardId: signal.guardId,
			description: signal.description,
			policyApplied: signal.policyApplied,
			contextSnapshotRef: signal.contextSnapshotRef,
			sourceRef: signal.sourceRef,
		} satisfies Readonly<Record<string, unknown>>;
		return {
			envelopeVersion: surfaceEnvelopeVersion,
			signalId: signal.signalId,
			signalVersion: 1,
			payload,
			payloadHash: sha256(stableStringify(payload)),
			emittedAt: now,
		};
	});

import type { GuardViolationSignalEnvelope } from "@gooi/guard-contracts/signals";
import { sha256, stableStringify } from "@gooi/stable-json";
import {
	envelope,
	type SignalEnvelope,
} from "@gooi/surface-contracts/envelope";

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
			envelopeVersion: envelope.surfaceEnvelopeVersion,
			signalId: signal.signalId,
			signalVersion: 1,
			payload,
			payloadHash: sha256(stableStringify(payload)),
			emittedAt: now,
		};
	});

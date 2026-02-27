import type {
	GuardPolicy,
	GuardPrimitiveKind,
	GuardSourceRef,
} from "../plans/guard-plan";

export const guardViolationSignalEnvelopeVersion = "1.0.0" as const;

export interface GuardViolationSignalEnvelope {
	readonly envelopeVersion: typeof guardViolationSignalEnvelopeVersion;
	readonly signalId: "guard.violated";
	readonly primitiveKind: GuardPrimitiveKind;
	readonly primitiveId: string;
	readonly guardTier: "structural" | "semantic";
	readonly guardId: string;
	readonly description: string;
	readonly policyApplied: GuardPolicy;
	readonly contextSnapshotRef: string;
	readonly sourceRef: GuardSourceRef;
}

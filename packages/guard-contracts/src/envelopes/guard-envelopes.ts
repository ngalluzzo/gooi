import type { JsonObject } from "@gooi/contract-primitives/json";
import type { GuardTypedError } from "../errors/guard-errors";
import type { GuardPolicy, GuardRuntimeEnvironment } from "../plans/guard-plan";
import type { GuardViolationSignalEnvelope } from "../signals/guard-violation-signal";

export const guardEvaluationEnvelopeVersion = "1.0.0" as const;

export interface GuardViolationRecord {
	readonly guardId: string;
	readonly description: string;
	readonly tier: "structural" | "semantic";
	readonly blocking: boolean;
	readonly details?: JsonObject;
}

export interface GuardPolicyOutcome {
	readonly applied: "none" | GuardPolicy;
	readonly blockingViolationCount: number;
}

export interface GuardEvaluationMeta {
	readonly environment: GuardRuntimeEnvironment;
	readonly structuralEvaluated: number;
	readonly semanticEvaluated: number;
	readonly semanticSkipped: number;
}

export interface GuardEvaluationEnvelope {
	readonly envelopeVersion: typeof guardEvaluationEnvelopeVersion;
	readonly ok: boolean;
	readonly violations: readonly GuardViolationRecord[];
	readonly policyOutcome: GuardPolicyOutcome;
	readonly emittedSignals: readonly GuardViolationSignalEnvelope[];
	readonly diagnostics: readonly GuardTypedError[];
	readonly meta: GuardEvaluationMeta;
	readonly error?: GuardTypedError;
}

export const invariantEvaluationEnvelopeVersion = "1.0.0" as const;

export interface InvariantEvaluationEnvelope {
	readonly envelopeVersion: typeof invariantEvaluationEnvelopeVersion;
	readonly ok: boolean;
	readonly violations: readonly GuardViolationRecord[];
	readonly policyOutcome: GuardPolicyOutcome;
	readonly emittedSignals: readonly GuardViolationSignalEnvelope[];
	readonly diagnostics: readonly GuardTypedError[];
	readonly error?: GuardTypedError;
}

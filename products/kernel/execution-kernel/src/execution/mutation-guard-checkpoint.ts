import type { GuardViolationSignalEnvelope } from "@gooi/guard-contracts/signals";
import { evaluateGuard } from "@gooi/guard-runtime/evaluate";
import type {
	KernelSemanticExecutionInput,
	KernelSemanticGuardCheckpoint,
	KernelSemanticGuardRuntime,
} from "@gooi/kernel-contracts/semantic-engine";
import { sha256, stableStringify } from "@gooi/stable-json";
import {
	envelope,
	type SignalEnvelope,
} from "@gooi/surface-contracts/envelope";

const domainGuardCodes = new Set([
	"collection_invariant_error",
	"action_guard_error",
	"signal_guard_error",
	"flow_guard_error",
]);

const toSurfaceGuardSignals = (
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

const toGuardEnvironment = (
	mode: KernelSemanticExecutionInput["ctx"]["mode"] | undefined,
): "production" | "simulation" =>
	mode === "simulation" ? "simulation" : "production";

export interface EvaluateGuardCheckpointInput {
	readonly checkpoint: KernelSemanticGuardCheckpoint;
	readonly guardRuntime: KernelSemanticGuardRuntime | undefined;
	readonly mode: KernelSemanticExecutionInput["ctx"]["mode"] | undefined;
	readonly now: string;
	readonly fallbackCode:
		| "action_guard_error"
		| "signal_guard_error"
		| "flow_guard_error";
}

export interface EvaluateGuardCheckpointResult {
	readonly ok: true;
	readonly emittedSignals: readonly SignalEnvelope[];
}

export interface EvaluateGuardCheckpointFailure {
	readonly ok: false;
	readonly emittedSignals: readonly SignalEnvelope[];
	readonly error: Readonly<Record<string, unknown>>;
}

export const evaluateMutationGuardCheckpoint = async (
	input: EvaluateGuardCheckpointInput,
): Promise<EvaluateGuardCheckpointResult | EvaluateGuardCheckpointFailure> => {
	const envelope = await evaluateGuard({
		definition: input.checkpoint.definition,
		context: input.checkpoint.context,
		environment: toGuardEnvironment(input.mode),
		...(input.guardRuntime?.policyPlan === undefined
			? {}
			: { policyPlan: input.guardRuntime.policyPlan }),
		...(input.guardRuntime?.semanticJudge === undefined
			? {}
			: { semanticJudge: input.guardRuntime.semanticJudge }),
	});
	const emittedSignals = toSurfaceGuardSignals(
		envelope.emittedSignals,
		input.now,
	);
	if (envelope.ok) {
		return { ok: true, emittedSignals };
	}

	const detail = {
		policyApplied: envelope.policyOutcome.applied,
		blockingViolationCount: envelope.policyOutcome.blockingViolationCount,
		violationCount: envelope.violations.length,
		diagnosticCount: envelope.diagnostics.length,
		semanticEvaluated: envelope.meta.semanticEvaluated,
		semanticSkipped: envelope.meta.semanticSkipped,
		violations: envelope.violations,
		diagnostics: envelope.diagnostics,
		emittedSignals: envelope.emittedSignals,
	};
	const errorCode = envelope.error?.code;
	return {
		ok: false,
		emittedSignals,
		error: {
			code:
				errorCode !== undefined && domainGuardCodes.has(errorCode)
					? errorCode
					: input.fallbackCode,
			message: envelope.error?.message ?? "Guard evaluation failed.",
			details: {
				...(envelope.error?.sourceRef === undefined
					? {}
					: { sourceRef: envelope.error.sourceRef }),
				...(envelope.error?.details === undefined
					? {}
					: { guardDetails: envelope.error.details }),
				guardOutcome: detail,
			},
		},
	};
};

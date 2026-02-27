import type { GuardViolationRecord } from "@gooi/guard-contracts/envelopes/guard-envelopes";
import type { GuardTypedError } from "@gooi/guard-contracts/errors/guard-errors";
import { evaluateGuard, evaluateInvariant } from "@gooi/guard-runtime/evaluate";
import type { DomainRuntimeMode } from "../../execution-core/envelopes";
import type { DomainRuntimeTypedError } from "../../execution-core/errors";
import type { DomainGuardRuntime } from "../contracts";
import { toDomainGuardError } from "./guard-error-mapping";
import { toSurfaceGuardSignals } from "./guard-signal-mapping";

const toGuardEnvironment = (
	mode: DomainRuntimeMode,
): "production" | "simulation" =>
	mode === "simulation" ? "simulation" : "production";

interface EvaluateGuardInput {
	readonly definition: Parameters<typeof evaluateGuard>[0]["definition"];
	readonly context: Readonly<Record<string, unknown>>;
	readonly mode: DomainRuntimeMode;
	readonly now: string;
	readonly guardRuntime?: DomainGuardRuntime;
	readonly fallbackCode:
		| "action_guard_error"
		| "signal_guard_error"
		| "flow_guard_error";
}

interface EvaluateInvariantInput {
	readonly definition: Parameters<typeof evaluateInvariant>[0]["definition"];
	readonly context: Readonly<Record<string, unknown>>;
	readonly now: string;
}

export interface DomainGuardEvaluationResult {
	readonly ok: boolean;
	readonly emittedSignals: ReturnType<typeof toSurfaceGuardSignals>;
	readonly detail: Readonly<Record<string, unknown>>;
	readonly diagnostics: readonly GuardTypedError[];
	readonly violations: readonly GuardViolationRecord[];
	readonly error?: DomainRuntimeTypedError;
}

/**
 * Evaluates one action/signal/flow guard and maps results into domain runtime contracts.
 */
export const evaluateDomainGuard = async (
	input: EvaluateGuardInput,
): Promise<DomainGuardEvaluationResult> => {
	const envelope = await evaluateGuard({
		definition: input.definition,
		context: input.context,
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
	if (envelope.ok) {
		return {
			ok: true,
			emittedSignals,
			detail,
			diagnostics: envelope.diagnostics,
			violations: envelope.violations,
		};
	}

	const mappedError = toDomainGuardError(
		envelope.error ?? {
			code: input.fallbackCode,
			message: "Guard evaluation failed.",
			sourceRef: input.definition.sourceRef,
		},
		input.fallbackCode,
	);
	return {
		ok: false,
		emittedSignals,
		detail,
		diagnostics: envelope.diagnostics,
		violations: envelope.violations,
		error: {
			...mappedError,
			...(mappedError.details === undefined
				? {
						details: {
							guardOutcome: detail,
						},
					}
				: {
						details: {
							...mappedError.details,
							guardOutcome: detail,
						},
					}),
		},
	};
};

/**
 * Evaluates step-bound collection invariants and maps results into domain runtime contracts.
 */
export const evaluateDomainInvariant = (
	input: EvaluateInvariantInput,
): DomainGuardEvaluationResult => {
	const envelope = evaluateInvariant({
		definition: input.definition,
		context: input.context,
	});
	const emittedSignals = toSurfaceGuardSignals(
		envelope.emittedSignals,
		input.now,
	);
	const detail = {
		policyApplied: envelope.policyOutcome.applied,
		blockingViolationCount: envelope.policyOutcome.blockingViolationCount,
		violationCount: envelope.violations.length,
		diagnosticCount: envelope.diagnostics.length,
		violations: envelope.violations,
		diagnostics: envelope.diagnostics,
		emittedSignals: envelope.emittedSignals,
	};
	if (envelope.ok) {
		return {
			ok: true,
			emittedSignals,
			detail,
			diagnostics: envelope.diagnostics,
			violations: envelope.violations,
		};
	}
	const mappedError = toDomainGuardError(
		envelope.error ?? {
			code: "collection_invariant_error",
			message: "Collection invariant evaluation failed.",
			sourceRef: input.definition.sourceRef,
		},
		"collection_invariant_error",
	);
	return {
		ok: false,
		emittedSignals,
		detail,
		diagnostics: envelope.diagnostics,
		violations: envelope.violations,
		error: {
			...mappedError,
			...(mappedError.details === undefined
				? {
						details: {
							guardOutcome: detail,
						},
					}
				: {
						details: {
							...mappedError.details,
							guardOutcome: detail,
						},
					}),
		},
	};
};

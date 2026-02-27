import { evaluateInvariant } from "@gooi/guard-runtime/evaluate";
import type { ProjectionSemanticGuardMeta } from "@gooi/kernel-contracts/projection-semantic";
import { createProjectionError } from "@gooi/projection-contracts/errors/projection-errors";
import type { CompiledProjectionPlan } from "@gooi/projection-contracts/plans/projection-plan";

interface ApplyProjectionGuardsInput {
	readonly plan: CompiledProjectionPlan;
	readonly rows: readonly Readonly<Record<string, unknown>>[];
	readonly args: Readonly<Record<string, unknown>>;
	readonly asOf: string | null;
}

export type ApplyProjectionGuardsResult =
	| {
			readonly ok: true;
			readonly rows: readonly Readonly<Record<string, unknown>>[];
			readonly guardMeta?: ProjectionSemanticGuardMeta;
	  }
	| {
			readonly ok: false;
			readonly error: ReturnType<typeof createProjectionError>;
	  };

/**
 * Applies projection row invariants after strategy execution and before envelope assembly.
 */
export const applyProjectionGuards = (
	input: ApplyProjectionGuardsInput,
): ApplyProjectionGuardsResult => {
	const definition = input.plan.guard;
	if (definition === undefined) {
		return {
			ok: true,
			rows: input.rows,
		};
	}

	let violationCount = 0;
	let diagnosticCount = 0;
	let emittedViolationSignalCount = 0;
	const violations: ProjectionSemanticGuardMeta["violations"][number][] = [];
	const diagnostics: ProjectionSemanticGuardMeta["diagnostics"][number][] = [];
	const emittedViolationSignals: ProjectionSemanticGuardMeta["emittedViolationSignals"][number][] =
		[];
	for (const [rowIndex, row] of input.rows.entries()) {
		const evaluation = evaluateInvariant({
			definition,
			context: {
				row,
				args: input.args,
				asOf: input.asOf,
			},
		});
		violationCount += evaluation.violations.length;
		diagnosticCount += evaluation.diagnostics.length;
		emittedViolationSignalCount += evaluation.emittedSignals.length;
		violations.push(...evaluation.violations);
		diagnostics.push(...evaluation.diagnostics);
		emittedViolationSignals.push(...evaluation.emittedSignals);
		if (evaluation.ok) {
			continue;
		}
		return {
			ok: false,
			error: createProjectionError(
				"projection_guard_error",
				"Projection row guard/invariant blocked response assembly.",
				input.plan.sourceRef,
				{
					rowIndex,
					policyApplied: evaluation.policyOutcome.applied,
					blockingViolationCount:
						evaluation.policyOutcome.blockingViolationCount,
					violations: evaluation.violations,
					diagnostics: evaluation.diagnostics,
					emittedSignals: evaluation.emittedSignals,
					guardError: evaluation.error,
				},
			),
		};
	}

	return {
		ok: true,
		rows: input.rows,
		guardMeta: {
			evaluatedRows: input.rows.length,
			violationCount,
			diagnosticCount,
			emittedViolationSignalCount,
			violations,
			diagnostics,
			emittedViolationSignals,
		},
	};
};

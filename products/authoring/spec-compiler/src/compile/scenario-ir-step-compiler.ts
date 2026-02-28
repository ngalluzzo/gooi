import type { CompileDiagnostic } from "@gooi/app-spec-contracts/compiled";
import type { CompiledGuardDefinition } from "@gooi/guard-contracts/plans";
import type { CompiledScenarioPlanSet } from "@gooi/scenario-contracts/plans";
import { asRecord, asString } from "./cross-links/shared";
import {
	type CaptureSource,
	type ScenarioCaptureBinding,
	scenarioIRError,
	sortRecord,
} from "./scenario-ir-shared";

type CompiledScenarioStep =
	CompiledScenarioPlanSet["scenarios"][string]["steps"][number];

const parseCaptureBindings = (input: {
	readonly scenarioId: string;
	readonly stepIndex: number;
	readonly value: unknown;
	readonly diagnostics: CompileDiagnostic[];
}): readonly ScenarioCaptureBinding[] | undefined => {
	if (!Array.isArray(input.value)) {
		return undefined;
	}
	const bindings = input.value
		.map((item, captureIndex) => {
			const binding = asRecord(item);
			const captureId =
				asString(binding?.captureId) ?? asString(binding?.capture_id);
			const source = asString(binding?.source) ?? asString(binding?.from);
			const path = asString(binding?.path);
			if (
				captureId === undefined ||
				path === undefined ||
				(source !== "last_trigger_output" &&
					source !== "last_signal_payload" &&
					source !== "last_expectation_output" &&
					source !== "context")
			) {
				input.diagnostics.push(
					scenarioIRError(
						`scenarios.${input.scenarioId}.steps.${input.stepIndex}.capture.${captureIndex}`,
						"Capture binding requires `captureId`, `source`, and `path`.",
					),
				);
				return undefined;
			}
			return {
				captureId,
				source: source as CaptureSource,
				path,
			};
		})
		.filter((value): value is NonNullable<typeof value> => value !== undefined);
	return bindings.length === 0 ? undefined : bindings;
};

const parseTriggerStep = (input: {
	readonly scenarioId: string;
	readonly stepIndex: number;
	readonly trigger: Readonly<Record<string, unknown>>;
	readonly capture?: readonly ScenarioCaptureBinding[];
	readonly diagnostics: CompileDiagnostic[];
}): Extract<CompiledScenarioStep, { readonly kind: "trigger" }> | undefined => {
	const mutationId = asString(input.trigger.mutation);
	const queryId = asString(input.trigger.query);
	const entrypointKindFromField = asString(input.trigger.entrypointKind);
	const entrypointIdFromField = asString(input.trigger.entrypointId);
	const entrypointKind =
		mutationId !== undefined
			? "mutation"
			: queryId !== undefined
				? "query"
				: entrypointKindFromField === "mutation" ||
						entrypointKindFromField === "query"
					? entrypointKindFromField
					: undefined;
	const entrypointId = mutationId ?? queryId ?? entrypointIdFromField;
	if (entrypointKind === undefined || entrypointId === undefined) {
		input.diagnostics.push(
			scenarioIRError(
				`scenarios.${input.scenarioId}.steps.${input.stepIndex}.trigger`,
				"Trigger step requires a mutation/query target.",
			),
		);
		return undefined;
	}
	const inputValue = asRecord(input.trigger.input);
	const inputFromCapture =
		asRecord(input.trigger.inputFromCapture) ??
		asRecord(input.trigger.input_from_capture);
	const resolvedInputFromCapture =
		inputFromCapture === undefined
			? undefined
			: (Object.fromEntries(
					Object.entries(inputFromCapture)
						.filter(([, value]) => typeof value === "string")
						.sort(([left], [right]) => left.localeCompare(right)),
				) as Readonly<Record<string, string>>);
	return {
		kind: "trigger" as const,
		trigger: {
			entrypointKind: entrypointKind as "mutation" | "query",
			entrypointId,
			...(inputValue === undefined ? {} : { input: sortRecord(inputValue) }),
			...(resolvedInputFromCapture === undefined
				? {}
				: { inputFromCapture: resolvedInputFromCapture }),
			...(input.trigger.generate === true ? { generate: true } : {}),
		},
		...(input.capture === undefined ? {} : { capture: [...input.capture] }),
	};
};

const parseExpectationTargets = (
	expect: Readonly<Record<string, unknown>>,
): readonly Extract<
	CompiledScenarioStep,
	{ readonly kind: "expect" }
>["expect"][] => {
	const args = asRecord(expect.args) ?? asRecord(expect.input);
	const targets: Array<
		Extract<CompiledScenarioStep, { readonly kind: "expect" }>["expect"]
	> = [];
	const signalId = asString(expect.signal);
	const queryId = asString(expect.query);
	const projectionId = asString(expect.projection);
	const flowId =
		asString(expect.flow_completed) ?? asString(expect.flowCompleted);
	if (signalId !== undefined) {
		targets.push({ kind: "signal", signalId });
	}
	if (queryId !== undefined) {
		targets.push({
			kind: "query",
			queryId,
			...(args === undefined ? {} : { args: sortRecord(args) }),
		});
	}
	if (projectionId !== undefined) {
		targets.push({
			kind: "projection",
			projectionId,
			...(args === undefined ? {} : { args: sortRecord(args) }),
		});
	}
	if (flowId !== undefined) {
		targets.push({ kind: "flow", flowId });
	}
	return targets;
};

export const compileScenarioSteps = (input: {
	readonly scenarioId: string;
	readonly authoredSteps: readonly unknown[];
	readonly diagnostics: CompileDiagnostic[];
}): readonly CompiledScenarioStep[] => {
	const compiledSteps: CompiledScenarioStep[] = [];
	for (
		let stepIndex = 0;
		stepIndex < input.authoredSteps.length;
		stepIndex += 1
	) {
		const step = asRecord(input.authoredSteps[stepIndex]) ?? {};
		const capture = parseCaptureBindings({
			scenarioId: input.scenarioId,
			stepIndex,
			value: step.capture,
			diagnostics: input.diagnostics,
		});
		const trigger = asRecord(step.trigger);
		if (trigger !== undefined) {
			const triggerStep = parseTriggerStep({
				scenarioId: input.scenarioId,
				stepIndex,
				trigger,
				...(capture === undefined ? {} : { capture }),
				diagnostics: input.diagnostics,
			});
			if (triggerStep !== undefined) {
				compiledSteps.push(triggerStep);
			}
		}

		const expect = asRecord(step.expect);
		if (expect !== undefined) {
			const expectationTargets = parseExpectationTargets(expect);
			if (expectationTargets.length === 0) {
				input.diagnostics.push(
					scenarioIRError(
						`scenarios.${input.scenarioId}.steps.${stepIndex}.expect`,
						"Expect step requires at least one expectation target.",
					),
				);
			}
			const guard = asRecord(step.guard) ?? asRecord(expect.guard);
			for (const expectTarget of expectationTargets) {
				compiledSteps.push({
					kind: "expect",
					expect: expectTarget,
					...(guard === undefined
						? {}
						: { guard: guard as unknown as CompiledGuardDefinition }),
				});
			}
		}

		if (
			trigger === undefined &&
			expect === undefined &&
			capture !== undefined &&
			capture.length > 0
		) {
			compiledSteps.push({
				kind: "capture",
				capture,
			});
		}
	}
	return compiledSteps;
};

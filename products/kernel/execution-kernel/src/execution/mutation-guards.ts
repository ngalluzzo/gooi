import type {
	KernelSemanticExecutionInput,
	KernelSemanticExecutionResult,
	KernelSemanticRuntimePort,
} from "@gooi/kernel-contracts/semantic-engine";
import type { SignalEnvelope } from "@gooi/surface-contracts/envelope";
import { evaluateMutationGuardCheckpoint } from "./mutation-guard-checkpoint";

const executeLegacyMutation = async (input: {
	readonly domainRuntime: KernelSemanticRuntimePort;
	readonly semanticInput: KernelSemanticExecutionInput;
}): Promise<KernelSemanticExecutionResult> => {
	if (input.domainRuntime.executeMutation === undefined) {
		return {
			ok: false,
			error: {
				code: "invocation_error",
				message:
					"Semantic runtime does not implement executeMutation or prepare/core mutation APIs.",
			},
			observedEffects: [],
			emittedSignals: [],
		};
	}
	return input.domainRuntime.executeMutation(input.semanticInput);
};

const failMutation = (input: {
	readonly error: unknown;
	readonly observedEffects: KernelSemanticExecutionResult["observedEffects"];
	readonly emittedSignals: readonly SignalEnvelope[];
}): KernelSemanticExecutionResult => ({
	ok: false,
	error: input.error,
	observedEffects: input.observedEffects,
	emittedSignals: input.emittedSignals,
});

/**
 * Executes mutation semantics with kernel-owned action/signal/flow guard sequencing.
 */
export const executeMutationWithKernelGuards = async (input: {
	readonly domainRuntime: KernelSemanticRuntimePort;
	readonly semanticInput: KernelSemanticExecutionInput;
}): Promise<KernelSemanticExecutionResult> => {
	if (
		input.domainRuntime.prepareMutation === undefined ||
		input.domainRuntime.executeMutationCore === undefined
	) {
		return executeLegacyMutation(input);
	}

	const preparation = await input.domainRuntime.prepareMutation(
		input.semanticInput,
	);
	const emittedSignals: SignalEnvelope[] = [
		...(preparation.emittedSignals ?? []),
	];
	if (!preparation.ok) {
		return failMutation({
			error: preparation.error,
			observedEffects: preparation.observedEffects,
			emittedSignals,
		});
	}

	if (preparation.preGuard !== undefined) {
		const preOutcome = await evaluateMutationGuardCheckpoint({
			checkpoint: preparation.preGuard,
			guardRuntime: preparation.guardRuntime,
			mode: input.semanticInput.ctx.mode,
			now: input.semanticInput.ctx.now,
			fallbackCode: "action_guard_error",
		});
		if (!preOutcome.ok) {
			return failMutation({
				error: preOutcome.error,
				observedEffects: preparation.observedEffects,
				emittedSignals,
			});
		}
	}

	const core = await input.domainRuntime.executeMutationCore(
		input.semanticInput,
	);
	emittedSignals.push(...(core.emittedSignals ?? []));
	if (!core.ok) {
		return failMutation({
			error: core.error,
			observedEffects: core.observedEffects,
			emittedSignals,
		});
	}

	if (core.postGuard !== undefined) {
		const postOutcome = await evaluateMutationGuardCheckpoint({
			checkpoint: core.postGuard,
			guardRuntime: preparation.guardRuntime,
			mode: input.semanticInput.ctx.mode,
			now: input.semanticInput.ctx.now,
			fallbackCode: "action_guard_error",
		});
		if (!postOutcome.ok) {
			return failMutation({
				error: postOutcome.error,
				observedEffects: core.observedEffects,
				emittedSignals,
			});
		}
	}

	for (const checkpoint of core.signalGuards ?? []) {
		const signalOutcome = await evaluateMutationGuardCheckpoint({
			checkpoint,
			guardRuntime: preparation.guardRuntime,
			mode: input.semanticInput.ctx.mode,
			now: input.semanticInput.ctx.now,
			fallbackCode: "signal_guard_error",
		});
		emittedSignals.push(...signalOutcome.emittedSignals);
		if (!signalOutcome.ok) {
			return failMutation({
				error: signalOutcome.error,
				observedEffects: core.observedEffects,
				emittedSignals,
			});
		}
	}

	for (const checkpoint of core.flowGuards ?? []) {
		const flowOutcome = await evaluateMutationGuardCheckpoint({
			checkpoint,
			guardRuntime: preparation.guardRuntime,
			mode: input.semanticInput.ctx.mode,
			now: input.semanticInput.ctx.now,
			fallbackCode: "flow_guard_error",
		});
		if (!flowOutcome.ok) {
			return failMutation({
				error: flowOutcome.error,
				observedEffects: core.observedEffects,
				emittedSignals,
			});
		}
	}

	return {
		ok: true,
		output: core.output,
		observedEffects: core.observedEffects,
		emittedSignals,
	};
};

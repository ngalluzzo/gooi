import type {
	CompiledEntrypoint,
	CompiledEntrypointKind,
} from "@gooi/app-spec-contracts/compiled";
import type { EffectKind } from "@gooi/capability-contracts/capability-port";
import type {
	CompiledGuardDefinition,
	CompiledGuardPolicyPlan,
} from "@gooi/guard-contracts/plans";
import type { SemanticJudgePort } from "@gooi/guard-contracts/ports";
import type { PrincipalContext } from "@gooi/host-contracts/principal";
import type { SignalEnvelope } from "@gooi/surface-contracts/envelope";

export interface KernelSemanticExecutionInput {
	readonly entrypoint: CompiledEntrypoint;
	readonly kind: CompiledEntrypointKind;
	readonly input: Readonly<Record<string, unknown>>;
	readonly principal: PrincipalContext;
	readonly ctx: {
		readonly invocationId: string;
		readonly traceId: string;
		readonly now: string;
		readonly mode?: "live" | "simulation";
	};
}

export interface KernelSemanticExecutionResult {
	readonly ok: boolean;
	readonly output?: unknown;
	readonly error?: unknown;
	readonly observedEffects: readonly EffectKind[];
	readonly emittedSignals?: readonly SignalEnvelope[];
}

export interface KernelSemanticGuardRuntime {
	readonly policyPlan?: CompiledGuardPolicyPlan;
	readonly semanticJudge?: SemanticJudgePort;
}

export interface KernelSemanticGuardCheckpoint {
	readonly definition: CompiledGuardDefinition;
	readonly context: Readonly<Record<string, unknown>>;
}

export interface KernelSemanticSignalGuardCheckpoint
	extends KernelSemanticGuardCheckpoint {
	readonly signal: SignalEnvelope;
}

export interface KernelSemanticFlowGuardCheckpoint
	extends KernelSemanticGuardCheckpoint {
	readonly flowId: string;
}

export interface KernelSemanticMutationPreparationResult {
	readonly ok: boolean;
	readonly actionId?: string;
	readonly error?: unknown;
	readonly preGuard?: KernelSemanticGuardCheckpoint;
	readonly guardRuntime?: KernelSemanticGuardRuntime;
	readonly observedEffects: readonly EffectKind[];
	readonly emittedSignals?: readonly SignalEnvelope[];
}

export interface KernelSemanticMutationCoreResult
	extends KernelSemanticExecutionResult {
	readonly actionId: string;
	readonly stepOutputs: Readonly<Record<string, unknown>>;
	readonly postGuard?: KernelSemanticGuardCheckpoint;
	readonly signalGuards?: readonly KernelSemanticSignalGuardCheckpoint[];
	readonly flowGuards?: readonly KernelSemanticFlowGuardCheckpoint[];
}

export interface KernelSemanticRuntimePort {
	readonly executeQuery: (
		input: KernelSemanticExecutionInput,
	) => Promise<KernelSemanticExecutionResult>;
	readonly executeMutation?: (
		input: KernelSemanticExecutionInput,
	) => Promise<KernelSemanticExecutionResult>;
	readonly prepareMutation?: (
		input: KernelSemanticExecutionInput,
	) => Promise<KernelSemanticMutationPreparationResult>;
	readonly executeMutationCore?: (
		input: KernelSemanticExecutionInput,
	) => Promise<KernelSemanticMutationCoreResult>;
}

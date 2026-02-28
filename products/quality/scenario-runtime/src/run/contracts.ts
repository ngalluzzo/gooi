import type { GuardRuntimeEnvironment } from "@gooi/guard-contracts/plans";
import type { SemanticJudgePort } from "@gooi/guard-contracts/ports";
import type { ScenarioStepResultEnvelope } from "@gooi/scenario-contracts/envelopes";
import type { ScenarioTypedError } from "@gooi/scenario-contracts/errors";
import type {
	CompiledPersonaDefinition,
	CompiledScenarioPlan,
	ScenarioGeneratedInputLockSnapshot,
} from "@gooi/scenario-contracts/plans";
import type { generateTriggerInput } from "../persona/generate-trigger-input";

export type ScenarioExecutionProfile =
	| "simulation"
	| "pre_merge"
	| "default_ci"
	| "production_smoke";

export const defaultScenarioExecutionProfile: ScenarioExecutionProfile =
	"simulation";

export interface TriggerInvocationResult {
	readonly ok: boolean;
	readonly output?: unknown;
	readonly error?: unknown;
	readonly emittedSignals?: readonly {
		readonly signalId: string;
		readonly payload: Readonly<Record<string, unknown>>;
	}[];
	readonly meta?: Readonly<Record<string, unknown>>;
}

export interface RunScenarioInput {
	readonly scenario: CompiledScenarioPlan;
	readonly personas: Readonly<Record<string, CompiledPersonaDefinition>>;
	readonly lockSnapshot?: ScenarioGeneratedInputLockSnapshot;
	readonly refreshGenerated?: boolean;
	readonly profile?: ScenarioExecutionProfile;
	readonly environment?: GuardRuntimeEnvironment;
	readonly traceId: string;
	readonly invocationId: string;
	readonly semanticJudge?: SemanticJudgePort;
	readonly invokeEntrypoint: (input: {
		readonly entrypointKind: "mutation" | "query";
		readonly entrypointId: string;
		readonly input: Readonly<Record<string, unknown>>;
		readonly context: {
			readonly profile?: ScenarioExecutionProfile;
			readonly environment?: GuardRuntimeEnvironment;
			readonly principal?: Readonly<Record<string, unknown>>;
			readonly session?: Readonly<Record<string, unknown>>;
			readonly persona?: CompiledPersonaDefinition;
			readonly providerOverrides?: Readonly<Record<string, unknown>>;
		};
	}) => Promise<TriggerInvocationResult>;
	readonly resolveFlowCompletion?: (input: {
		readonly flowId: string;
		readonly context: CompiledScenarioPlan["context"];
	}) => Promise<Readonly<Record<string, unknown>> | null>;
	readonly resolveProjection?: (input: {
		readonly projectionId: string;
		readonly args: Readonly<Record<string, unknown>>;
		readonly context: CompiledScenarioPlan["context"];
	}) => Promise<Readonly<Record<string, unknown>> | null>;
	readonly generateInput?: typeof generateTriggerInput;
}

export interface MutableScenarioGeneratedInputLockSnapshot {
	readonly generated: Record<
		string,
		Record<number, Readonly<Record<string, unknown>>>
	>;
}

export interface RuntimeState {
	readonly captures: Record<string, unknown>;
	readonly emittedSignals: Array<{
		readonly signalId: string;
		readonly payload: Readonly<Record<string, unknown>>;
	}>;
	lastTrigger?: TriggerInvocationResult;
	lastExpectation?: Readonly<Record<string, unknown>>;
}

export interface StepExecutionSuccess {
	readonly ok: true;
	readonly stepResult: ScenarioStepResultEnvelope;
}

export interface StepExecutionFailure {
	readonly ok: false;
	readonly stepResult: ScenarioStepResultEnvelope;
	readonly error: ScenarioTypedError;
}

export type StepExecutionResult = StepExecutionSuccess | StepExecutionFailure;

export const emptyLockSnapshot: ScenarioGeneratedInputLockSnapshot = {
	generated: {},
};

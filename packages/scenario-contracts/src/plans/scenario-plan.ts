import type { CompiledGuardDefinition } from "@gooi/guard-contracts/plans/guard-plan";

export const compiledScenarioPlanSetVersion = "1.0.0" as const;

export interface CompiledPersonaDefinition {
	readonly personaId: string;
	readonly description: string;
	readonly traits: Readonly<Record<string, unknown>>;
	readonly history: readonly unknown[];
	readonly tags: readonly string[];
}

export interface CompiledScenarioContext {
	readonly personaId?: string;
	readonly principal?: Readonly<Record<string, unknown>>;
	readonly session?: Readonly<Record<string, unknown>>;
	readonly providerOverrides?: Readonly<Record<string, unknown>>;
}

export interface CompiledScenarioTriggerPlan {
	readonly entrypointKind: "mutation" | "query";
	readonly entrypointId: string;
	readonly input?: Readonly<Record<string, unknown>>;
	readonly inputFromCapture?: Readonly<Record<string, string>>;
	readonly generate?: boolean;
}

export type CompiledScenarioExpectationTarget =
	| {
			readonly kind: "signal";
			readonly signalId: string;
	  }
	| {
			readonly kind: "query";
			readonly queryId: string;
			readonly args?: Readonly<Record<string, unknown>>;
	  }
	| {
			readonly kind: "flow";
			readonly flowId: string;
	  }
	| {
			readonly kind: "projection";
			readonly projectionId: string;
			readonly args?: Readonly<Record<string, unknown>>;
	  };

export interface CompiledScenarioCaptureBinding {
	readonly captureId: string;
	readonly source:
		| "last_trigger_output"
		| "last_signal_payload"
		| "last_expectation_output"
		| "context";
	readonly path: string;
}

export type CompiledScenarioStep =
	| {
			readonly kind: "trigger";
			readonly trigger: CompiledScenarioTriggerPlan;
			readonly capture?: readonly CompiledScenarioCaptureBinding[];
	  }
	| {
			readonly kind: "expect";
			readonly expect: CompiledScenarioExpectationTarget;
			readonly guard?: CompiledGuardDefinition;
	  }
	| {
			readonly kind: "capture";
			readonly capture: readonly CompiledScenarioCaptureBinding[];
	  };

export interface CompiledScenarioPlan {
	readonly scenarioId: string;
	readonly tags: readonly string[];
	readonly context: CompiledScenarioContext;
	readonly steps: readonly CompiledScenarioStep[];
}

export interface ScenarioGeneratedInputLockSnapshot {
	readonly generated: Readonly<
		Record<string, Readonly<Record<number, Readonly<Record<string, unknown>>>>>
	>;
}

export interface CompiledScenarioPlanSet {
	readonly artifactVersion: typeof compiledScenarioPlanSetVersion;
	readonly artifactHash: string;
	readonly sectionHash: string;
	readonly personas: Readonly<Record<string, CompiledPersonaDefinition>>;
	readonly scenarios: Readonly<Record<string, CompiledScenarioPlan>>;
}

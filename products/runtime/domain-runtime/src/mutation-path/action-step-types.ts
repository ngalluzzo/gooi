import type { EffectKind } from "@gooi/capability-contracts/capability-port";
import type { PrincipalContext } from "@gooi/host-contracts/principal";
import type { SignalEnvelope } from "@gooi/surface-contracts/envelope";
import type {
	DomainMutationEnvelope,
	DomainRuntimeMode,
	DomainTraceEnvelope,
} from "../execution-core/envelopes";
import type {
	DomainActionPlan,
	DomainActionStepPlan,
	DomainCapabilityHandler,
} from "./contracts";

export interface MutableActionState {
	trace: DomainTraceEnvelope;
	readonly stepOutputs: Record<string, unknown>;
	readonly observedEffects: EffectKind[];
	readonly emittedSignals: SignalEnvelope[];
}

export interface ExecuteActionStepInput {
	readonly entrypointId: string;
	readonly action: DomainActionPlan;
	readonly step: DomainActionStepPlan;
	readonly mode: DomainRuntimeMode;
	readonly capabilities: Readonly<Record<string, DomainCapabilityHandler>>;
	readonly runtimeInput: Readonly<Record<string, unknown>>;
	readonly principal: PrincipalContext;
	readonly ctx: {
		readonly invocationId: string;
		readonly traceId: string;
		readonly now: string;
		readonly mode: DomainRuntimeMode;
	};
	readonly state: MutableActionState;
}

export type ExecuteActionStepResult =
	| { readonly ok: true }
	| { readonly ok: false; readonly envelope: DomainMutationEnvelope };

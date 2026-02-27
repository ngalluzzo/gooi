import type {
	CompiledEntrypoint,
	CompiledEntrypointKind,
} from "@gooi/app-spec-contracts/compiled";
import type { EffectKind } from "@gooi/capability-contracts/capability-port";
import type { PrincipalContext } from "@gooi/host-contracts/principal";
import type { SignalEnvelope } from "@gooi/surface-contracts/signal-envelope";

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

export interface KernelSemanticRuntimePort {
	readonly executeQuery: (
		input: KernelSemanticExecutionInput,
	) => Promise<KernelSemanticExecutionResult>;
	readonly executeMutation: (
		input: KernelSemanticExecutionInput,
	) => Promise<KernelSemanticExecutionResult>;
}

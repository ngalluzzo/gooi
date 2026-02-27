import type { EffectKind } from "@gooi/capability-contracts/capability-port";
import type { HostClockPort } from "@gooi/host-contracts/clock";
import type { HostCapabilityDelegationPort } from "@gooi/host-contracts/delegation";
import type { HostIdentityPort } from "@gooi/host-contracts/identity";
import type {
	HostPrincipalPort,
	PrincipalContext,
} from "@gooi/host-contracts/principal";
import type { HostReplayStorePort } from "@gooi/host-contracts/replay";
import type { HostPortContractIssue } from "@gooi/kernel-host-bridge/host-portset";
import type {
	CompiledAccessPlan,
	CompiledEntrypoint,
	CompiledEntrypointBundle,
	CompiledEntrypointKind,
	CompiledSurfaceBinding,
} from "@gooi/spec-compiler/contracts";
import type { ResultEnvelope } from "@gooi/surface-contracts/result-envelope";
import type { SignalEnvelope } from "@gooi/surface-contracts/signal-envelope";
import type { SurfaceRequestPayload } from "@gooi/surface-contracts/surface-request";

export interface KernelEntrypointHostPortSet {
	readonly clock: HostClockPort;
	readonly identity: HostIdentityPort;
	readonly principal: HostPrincipalPort<PrincipalContext, CompiledAccessPlan>;
	readonly capabilityDelegation: HostCapabilityDelegationPort;
}

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

export interface RunEntrypointThroughKernelSpineInput {
	readonly bundle: CompiledEntrypointBundle;
	readonly binding: CompiledSurfaceBinding;
	readonly request: SurfaceRequestPayload;
	readonly principal: PrincipalContext;
	readonly domainRuntime: KernelSemanticRuntimePort;
	readonly hostPorts: KernelEntrypointHostPortSet;
	readonly idempotencyKey?: string | undefined;
	readonly replayStore?: HostReplayStorePort<ResultEnvelope<unknown, unknown>>;
	readonly replayTtlSeconds?: number;
	readonly invocationId?: string;
	readonly traceId?: string;
	readonly now?: string;
}

export type DomainRuntimePort = KernelSemanticRuntimePort;
export type HostPortSet = KernelEntrypointHostPortSet;
export type RunEntrypointInput = RunEntrypointThroughKernelSpineInput;
export type { HostPortContractIssue };

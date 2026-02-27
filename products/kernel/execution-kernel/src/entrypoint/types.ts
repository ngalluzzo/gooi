import type {
	CompiledEntrypointBundle,
	CompiledSurfaceBinding,
} from "@gooi/app-spec-contracts/compiled";
import type {
	HostPortContractIssue,
	HostPortSet as SharedHostPortSet,
} from "@gooi/host-contracts/portset";
import type { PrincipalContext } from "@gooi/host-contracts/principal";
import type { HostReplayStorePort } from "@gooi/host-contracts/replay";
import type { KernelSemanticRuntimePort } from "@gooi/kernel-contracts/semantic-engine";
import type { ResultEnvelope } from "@gooi/surface-contracts/result-envelope";

export type KernelEntrypointHostPortSet = SharedHostPortSet<
	PrincipalContext,
	ResultEnvelope<unknown, unknown>
>;

export interface RunEntrypointThroughKernelInput {
	readonly bundle: CompiledEntrypointBundle;
	readonly binding: CompiledSurfaceBinding;
	readonly payload: Readonly<Record<string, unknown>>;
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
export type RunEntrypointInput = RunEntrypointThroughKernelInput;
export type {
	KernelSemanticExecutionInput,
	KernelSemanticExecutionResult,
	KernelSemanticRuntimePort,
} from "@gooi/kernel-contracts/semantic-engine";
export type { HostPortContractIssue };

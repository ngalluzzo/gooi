import type {
	CompiledEntrypointBundle,
	CompiledSurfaceBinding,
} from "@gooi/app-spec-contracts/compiled";
import type {
	HostPortContractIssue,
	HostPortSet as SharedHostPortSet,
} from "@gooi/host-contracts/portset";
import type { PrincipalContext } from "@gooi/host-contracts/principal";
import type { HostReplayStorePort as SharedHostReplayStorePort } from "@gooi/host-contracts/replay";
import type { RunEntrypointThroughKernelRuntimeInput } from "@gooi/kernel-contracts/entrypoint-runtime";
import type { KernelSemanticRuntimePort as SharedKernelSemanticRuntimePort } from "@gooi/kernel-contracts/semantic-engine";
import type { ResultEnvelope } from "@gooi/surface-contracts/envelope";

export type KernelEntrypointHostPortSet = SharedHostPortSet<
	PrincipalContext,
	ResultEnvelope<unknown, unknown>
>;

export interface RunEntrypointThroughKernelInput {
	readonly bundle: CompiledEntrypointBundle;
	readonly binding: CompiledSurfaceBinding;
	readonly payload: Readonly<Record<string, unknown>>;
	readonly principal: PrincipalContext;
	readonly domainRuntime: SharedKernelSemanticRuntimePort;
	readonly hostPorts: KernelEntrypointHostPortSet;
	readonly idempotencyKey?: string | undefined;
	readonly replayStore?: SharedHostReplayStorePort<
		ResultEnvelope<unknown, unknown>
	>;
	readonly replayTtlSeconds?: number;
	readonly invocationId?: string;
	readonly traceId?: string;
	readonly now?: string;
}

export type DomainRuntimePort = SharedKernelSemanticRuntimePort;
export type HostPortSet = KernelEntrypointHostPortSet;
export type RunEntrypointInput = RunEntrypointThroughKernelInput;
export type {
	KernelSemanticExecutionInput,
	KernelSemanticExecutionResult,
	KernelSemanticRuntimePort,
} from "@gooi/kernel-contracts/semantic-engine";
export type { HostPortContractIssue, RunEntrypointThroughKernelRuntimeInput };

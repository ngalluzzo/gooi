import type {
	CompiledEntrypointBundle,
	CompiledSurfaceBinding,
} from "@gooi/app-spec-contracts/compiled";
import type { HostPortSet } from "@gooi/host-contracts/portset";
import type { PrincipalContext } from "@gooi/host-contracts/principal";
import type { HostReplayStorePort } from "@gooi/host-contracts/replay";
import type { KernelSemanticRuntimePort } from "@gooi/kernel-contracts/semantic-engine";
import type { ResultEnvelope } from "@gooi/surface-contracts/result-envelope";

export interface RunEntrypointThroughKernelRuntimeInput {
	readonly bundle: CompiledEntrypointBundle;
	readonly binding: CompiledSurfaceBinding;
	readonly payload: Readonly<Record<string, unknown>>;
	readonly principal: PrincipalContext;
	readonly domainRuntime: KernelSemanticRuntimePort;
	readonly hostPorts: HostPortSet;
	readonly idempotencyKey?: string;
	readonly replayStore?: HostReplayStorePort<ResultEnvelope<unknown, unknown>>;
	readonly replayTtlSeconds?: number;
	readonly invocationId?: string;
	readonly traceId?: string;
	readonly now?: string;
}

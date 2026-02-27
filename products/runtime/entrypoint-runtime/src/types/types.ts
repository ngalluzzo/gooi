import type {
	CompiledEntrypointBundle,
	CompiledSurfaceBinding,
} from "@gooi/app-spec-contracts/compiled";
import type { PrincipalContext } from "@gooi/host-contracts/principal";
import type { HostReplayStorePort } from "@gooi/host-contracts/replay";
import type { ResultEnvelope } from "@gooi/surface-contracts/result-envelope";
import type { SurfaceRequestPayload } from "@gooi/surface-contracts/surface-request";
import type { DomainRuntimePort } from "../domain";
import type { HostPortSet } from "../host";

/**
 * Input payload for deterministic entrypoint runtime execution.
 */
export interface RunEntrypointInput {
	/** Compiled entrypoint bundle consumed by runtime. */
	readonly bundle: CompiledEntrypointBundle;
	/** Compiled surface binding selected by adapter routing. */
	readonly binding: CompiledSurfaceBinding;
	/** Native surface payload used for binding extraction. */
	readonly request: SurfaceRequestPayload;
	/** Principal context used for policy gate checks. */
	readonly principal: PrincipalContext;
	/** Domain runtime port implementation for query and mutation execution. */
	readonly domainRuntime: DomainRuntimePort;
	/** Optional idempotency key for mutation replay behavior. */
	readonly idempotencyKey?: string | undefined;
	/** Optional replay store for replay and conflict detection. */
	readonly replayStore?: HostReplayStorePort<ResultEnvelope<unknown, unknown>>;
	/** Optional replay record TTL in seconds for idempotent mutation caching. */
	readonly replayTtlSeconds?: number;
	/** Optional invocation id override. */
	readonly invocationId?: string;
	/** Optional trace id override. */
	readonly traceId?: string;
	/** Optional timestamp override for deterministic tests. */
	readonly now?: string;
	/** Optional host ports for orchestration infrastructure behavior. */
	readonly hostPorts?: HostPortSet;
}

/**
 * Runtime configuration shared across many entrypoint invocations.
 */
export interface CreateEntrypointRuntimeInput {
	/** Compiled entrypoint bundle consumed by runtime. */
	readonly bundle: CompiledEntrypointBundle;
	/** Domain runtime port implementation for query and mutation execution. */
	readonly domainRuntime: DomainRuntimePort;
	/** Optional replay store for replay and conflict detection. */
	readonly replayStore?: HostReplayStorePort<ResultEnvelope<unknown, unknown>>;
	/** Optional replay record TTL in seconds for idempotent mutation caching. */
	readonly replayTtlSeconds?: number;
	/** Optional host ports for orchestration infrastructure behavior. */
	readonly hostPorts?: HostPortSet;
}

/**
 * Per-invocation input for a configured entrypoint runtime.
 */
export interface RunEntrypointCallInput {
	/** Compiled surface binding selected by adapter routing. */
	readonly binding: CompiledSurfaceBinding;
	/** Native surface payload used for binding extraction. */
	readonly request: SurfaceRequestPayload;
	/** Principal context used for policy gate checks. */
	readonly principal: PrincipalContext;
	/** Optional idempotency key for mutation replay behavior. */
	readonly idempotencyKey?: string | undefined;
	/** Optional invocation id override. */
	readonly invocationId?: string;
	/** Optional trace id override. */
	readonly traceId?: string;
	/** Optional timestamp override for deterministic tests. */
	readonly now?: string;
}

/**
 * Entrypoint runtime orchestration API.
 */
export interface EntrypointRuntime {
	/** Executes one compiled query or mutation entrypoint invocation. */
	readonly run: (
		input: RunEntrypointCallInput,
	) => Promise<ResultEnvelope<unknown, unknown>>;
}

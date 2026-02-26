import type {
	HostClockPort,
	HostIdentityPort,
	HostPortResult,
} from "@gooi/host-contracts";
import type { CompiledAccessPlan } from "@gooi/spec-compiler/contracts";
import type { PrincipalContext } from "./contracts";
import type { IdempotencyRecord } from "./idempotency-store";

/**
 * Host principal contract consumed by entrypoint runtime policy gates.
 */
export interface EntrypointPrincipalPort {
	/** Validates untrusted principal payloads. */
	readonly validatePrincipal: (
		value: unknown,
	) => HostPortResult<PrincipalContext>;
	/** Derives effective roles from principal context and access plan. */
	readonly deriveRoles: (input: {
		readonly principal: PrincipalContext;
		readonly accessPlan: CompiledAccessPlan;
	}) => HostPortResult<readonly string[]>;
}

/**
 * Host idempotency contract consumed by mutation replay behavior.
 */
export interface EntrypointIdempotencyPort {
	/** Loads one idempotency record by scope key. */
	readonly load: (scopeKey: string) => Promise<IdempotencyRecord | null>;
	/** Saves one idempotency record with explicit TTL policy. */
	readonly save: (input: {
		readonly scopeKey: string;
		readonly record: IdempotencyRecord;
		readonly ttlSeconds: number;
	}) => Promise<void>;
}

/**
 * Host port set consumed by entrypoint runtime orchestration.
 */
export interface EntrypointHostPorts {
	/** Clock port used for invocation lifecycle timing. */
	readonly clock: HostClockPort;
	/** Identity port used for trace and invocation identifiers. */
	readonly identity: HostIdentityPort;
	/** Principal policy port used for policy gate evaluation. */
	readonly principal: EntrypointPrincipalPort;
	/** Optional idempotency port for replay and conflict semantics. */
	readonly idempotency?: EntrypointIdempotencyPort;
}

import type { EffectKind } from "@gooi/contracts-capability";
import type {
	CompiledEntrypoint,
	CompiledEntrypointKind,
} from "@gooi/spec-compiler/contracts";
import type { PrincipalContext, SignalEnvelope } from "../entrypoint-runtime-contracts/entrypoint-runtime.contracts";

/**
 * Input payload passed to query and mutation domain execution ports.
 */
export interface DomainExecutionInput {
	/** Entrypoint contract selected by runtime dispatcher. */
	readonly entrypoint: CompiledEntrypoint;
	/** Entrypoint kind resolved from binding. */
	readonly kind: CompiledEntrypointKind;
	/** Bound input payload validated by runtime policy gates. */
	readonly input: Readonly<Record<string, unknown>>;
	/** Principal context from invocation envelope. */
	readonly principal: PrincipalContext;
	/** Invocation-scoped timestamp and identifiers. */
	readonly ctx: {
		/** Invocation id for this execution. */
		readonly invocationId: string;
		/** Trace id for observability. */
		readonly traceId: string;
		/** Runtime clock timestamp. */
		readonly now: string;
	};
}

/**
 * Query or mutation execution result returned by domain runtime ports.
 */
export interface DomainExecutionResult {
	/** True when domain execution produced output payload. */
	readonly ok: boolean;
	/** Output payload when `ok` is true. */
	readonly output?: unknown;
	/** Domain error payload when `ok` is false. */
	readonly error?: unknown;
	/** Observed effects declared during execution. */
	readonly observedEffects: readonly EffectKind[];
	/** Signals emitted during mutation execution. */
	readonly emittedSignals?: readonly SignalEnvelope[];
}

/**
 * Port interface implemented by domain runtime adapters.
 */
export interface DomainRuntimePort {
	/** Executes a query entrypoint. */
	readonly executeQuery: (
		input: DomainExecutionInput,
	) => Promise<DomainExecutionResult>;
	/** Executes a mutation entrypoint. */
	readonly executeMutation: (
		input: DomainExecutionInput,
	) => Promise<DomainExecutionResult>;
}

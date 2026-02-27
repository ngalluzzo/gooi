import type { BindingPlan } from "@gooi/binding/binding-plan/contracts";
import type { DeploymentLockfile } from "@gooi/binding/lockfile/contracts";
import type { CapabilityBindingResolution } from "@gooi/binding/reachability/contracts";
import type {
	CapabilityPortContract,
	EffectKind,
} from "@gooi/capability-contracts/capability-port";
import type { ProviderManifest } from "@gooi/capability-contracts/provider-manifest";
import type { ProviderRuntimeHostPorts } from "../host";

/**
 * Runtime error categories for provider activation and invocation.
 */
export type RuntimeErrorKind =
	| "validation_error"
	| "compatibility_error"
	| "activation_error"
	| "invocation_error"
	| "timeout_error"
	| "effect_violation_error"
	| "capability_unreachable_error"
	| "capability_delegation_error";

/**
 * Structured runtime error payload.
 */
export interface RuntimeError {
	/** Error category for deterministic handling. */
	readonly kind: RuntimeErrorKind;
	/** Human-readable message. */
	readonly message: string;
	/** Optional structured details for diagnostics. */
	readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Result type used by runtime functions.
 */
export type RuntimeResult<T> =
	| { readonly ok: true; readonly value: T }
	| { readonly ok: false; readonly error: RuntimeError };

/**
 * Principal context attached to capability calls.
 */
export interface PrincipalContext {
	/** Unique subject id for authenticated principal. */
	readonly subject: string;
	/** Effective principal roles. */
	readonly roles: readonly string[];
}

/**
 * Invocation context attached to capability calls.
 */
export interface InvocationContext {
	/** Invocation id unique within runtime scope. */
	readonly id: string;
	/** Trace id for distributed observability. */
	readonly traceId: string;
	/** Current timestamp in ISO-8601 format. */
	readonly now: string;
}

/**
 * Capability invocation envelope sent to provider instances.
 */
export interface CapabilityCall {
	/** Capability port id. */
	readonly portId: string;
	/** Capability port version. */
	readonly portVersion: string;
	/** Input payload validated by boundary contract. */
	readonly input: unknown;
	/** Principal context for authorization and tenancy policies. */
	readonly principal: PrincipalContext;
	/** Runtime invocation context. */
	readonly ctx: InvocationContext;
}

/**
 * Provider response envelope for one capability invocation.
 */
export interface CapabilityResult {
	/** True when invocation completed with output payload. */
	readonly ok: boolean;
	/** Output payload when `ok` is true. */
	readonly output?: unknown;
	/** Error payload when `ok` is false. */
	readonly error?: unknown;
	/** Runtime-observed side effects. */
	readonly observedEffects: readonly EffectKind[];
	/** Invocation reachability mode resolved by runtime (`local` or `delegated`). */
	readonly reachabilityMode?: "local" | "delegated";
}

/**
 * Host activation context for provider modules.
 */
export interface ActivateContext {
	/** Host API version used for compatibility checks. */
	readonly hostApiVersion: string;
	/** Monotonic timestamp used for activation telemetry. */
	readonly activatedAt: string;
}

/**
 * Provider instance lifecycle contract.
 */
export interface ProviderInstance {
	/** Handles capability invocation envelopes. */
	readonly invoke: (call: CapabilityCall) => Promise<CapabilityResult>;
	/** Performs provider shutdown and cleanup. */
	readonly deactivate: () => Promise<void>;
}

/**
 * Provider module contract loaded via dynamic import.
 */
export interface ProviderModule {
	/** Static provider manifest used for compatibility checks. */
	readonly manifest: unknown;
	/** Activation entrypoint producing an invocation instance. */
	readonly activate: (context: ActivateContext) => Promise<ProviderInstance>;
}

/**
 * Activation arguments for provider runtime.
 */
export interface ActivateProviderInput {
	/** Untrusted provider module loaded from runtime. */
	readonly providerModule: ProviderModule;
	/** Host API version for compatibility checks. */
	readonly hostApiVersion: string;
	/** Capability contracts expected to be fulfilled by this activation. */
	readonly contracts: readonly CapabilityPortContract[];
	/** Optional resolved binding plan artifact for enforcement. */
	readonly bindingPlan?: BindingPlan;
	/** Optional lockfile artifact for deterministic provider resolution. */
	readonly lockfile?: DeploymentLockfile;
	/** Optional activation timestamp override. */
	readonly activatedAt?: string;
	/** Optional host ports for runtime orchestration and deferred extension boundaries. */
	readonly hostPorts?: ProviderRuntimeHostPorts;
}

/**
 * Shared provider-runtime defaults for orchestration calls.
 */
export interface CreateProviderRuntimeInput {
	/** Host API version for compatibility checks. */
	readonly hostApiVersion: string;
	/** Capability contracts expected for runtime invocations. */
	readonly contracts: readonly CapabilityPortContract[];
	/** Optional resolved binding plan artifact for enforcement. */
	readonly bindingPlan?: BindingPlan;
	/** Optional lockfile artifact for deterministic provider resolution. */
	readonly lockfile?: DeploymentLockfile;
	/** Optional host ports for runtime orchestration and deferred extension boundaries. */
	readonly hostPorts?: ProviderRuntimeHostPorts;
}

/**
 * Activation input for one provider module under runtime defaults.
 */
export interface ActivateProviderRuntimeInput {
	/** Untrusted provider module loaded from runtime. */
	readonly providerModule: ProviderModule;
	/** Optional host API version override. */
	readonly hostApiVersion?: string;
	/** Optional capability contract override. */
	readonly contracts?: readonly CapabilityPortContract[];
	/** Optional resolved binding plan artifact for enforcement. */
	readonly bindingPlan?: BindingPlan;
	/** Optional lockfile artifact for deterministic provider resolution. */
	readonly lockfile?: DeploymentLockfile;
	/** Optional activation timestamp override. */
	readonly activatedAt?: string;
	/** Optional host ports for runtime orchestration and deferred extension boundaries. */
	readonly hostPorts?: ProviderRuntimeHostPorts;
}

/**
 * One-shot activation/invocation input for runtime convenience execution.
 */
export interface RunProviderCapabilityInput
	extends ActivateProviderRuntimeInput {
	/** Capability invocation envelope sent to provider instances. */
	readonly call: CapabilityCall;
}

/**
 * Provider-runtime orchestration API for provider activation and invocation.
 */
export interface ProviderRuntime {
	/** Activates one provider module using runtime defaults and optional overrides. */
	readonly activate: (
		input: ActivateProviderRuntimeInput,
	) => Promise<RuntimeResult<ActivatedProvider>>;
	/** Invokes one capability on an activated provider. */
	readonly invoke: (
		activated: ActivatedProvider,
		call: CapabilityCall,
	) => Promise<RuntimeResult<CapabilityResult>>;
	/** Deactivates one activated provider instance. */
	readonly deactivate: (
		activated: ActivatedProvider,
	) => Promise<RuntimeResult<void>>;
	/** Runs activate -> invoke -> deactivate for one capability call. */
	readonly run: (
		input: RunProviderCapabilityInput,
	) => Promise<RuntimeResult<CapabilityResult>>;
}

/**
 * Activated provider state tracked by runtime host.
 */
export interface ActivatedProvider {
	/** Parsed provider manifest. */
	readonly manifest: ProviderManifest;
	/** Runtime provider instance. */
	readonly instance: ProviderInstance;
	/** Capability contracts indexed by `portId@portVersion`. */
	readonly contracts: ReadonlyMap<string, CapabilityPortContract>;
	/** Optional binding resolution map keyed by `portId@portVersion`. */
	readonly bindingResolutions?: ReadonlyMap<
		string,
		CapabilityBindingResolution
	>;
	/** Host ports used for invocation-time policy and delegation decisions. */
	readonly hostPorts: ProviderRuntimeHostPorts;
}

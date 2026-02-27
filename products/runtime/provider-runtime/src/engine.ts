import type { ProviderRuntimeHostPorts as SharedProviderRuntimeHostPorts } from "./host";
import { createProviderRuntime as createProviderRuntimeFeature } from "./runtime/create-provider-runtime";
import type {
	ActivateContext as SharedActivateContext,
	ActivatedProvider as SharedActivatedProvider,
	ActivateProviderInput as SharedActivateProviderInput,
	ActivateProviderRuntimeInput as SharedActivateProviderRuntimeInput,
	CapabilityCall as SharedCapabilityCall,
	CapabilityResult as SharedCapabilityResult,
	CreateProviderRuntimeInput as SharedCreateProviderRuntimeInput,
	InvocationContext as SharedInvocationContext,
	PrincipalContext as SharedPrincipalContext,
	ProviderInstance as SharedProviderInstance,
	ProviderModule as SharedProviderModule,
	ProviderRuntime as SharedProviderRuntime,
	RunProviderCapabilityInput as SharedRunProviderCapabilityInput,
	RuntimeError as SharedRuntimeError,
	RuntimeErrorKind as SharedRuntimeErrorKind,
	RuntimeResult as SharedRuntimeResult,
} from "./shared/types";

export type RuntimeErrorKind = SharedRuntimeErrorKind;
export type RuntimeError = SharedRuntimeError;
export type RuntimeResult<T> = SharedRuntimeResult<T>;
export type PrincipalContext = SharedPrincipalContext;
export type InvocationContext = SharedInvocationContext;
export type CapabilityCall = SharedCapabilityCall;
export type CapabilityResult = SharedCapabilityResult;
export type ActivateContext = SharedActivateContext;
export type ProviderInstance = SharedProviderInstance;
export type ProviderModule = SharedProviderModule;
export type ActivateProviderInput = SharedActivateProviderInput;
export type CreateProviderRuntimeInput = SharedCreateProviderRuntimeInput;
export type ActivateProviderRuntimeInput = SharedActivateProviderRuntimeInput;
export type RunProviderCapabilityInput = SharedRunProviderCapabilityInput;
export type ActivatedProvider = SharedActivatedProvider;
export type ProviderRuntime = SharedProviderRuntime;
export type ProviderRuntimeHostPorts = SharedProviderRuntimeHostPorts;

/**
 * Creates a cohesive provider-runtime API with defaults and one-shot execution.
 */
export const createProviderRuntime = createProviderRuntimeFeature;

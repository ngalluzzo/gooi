import { activateProvider } from "./features/activation/activation";
import { isHostApiCompatible } from "./features/compatibility/compatibility";
import { ensureObservedEffectsDeclared } from "./features/effects/effects";
import { invokeCapability } from "./features/invocation/invocation";
import { deactivateProvider } from "./features/lifecycle/lifecycle";
import type {
	ActivateContext,
	ActivatedProvider,
	ActivateProviderInput,
	CapabilityCall,
	CapabilityResult,
	InvocationContext,
	PrincipalContext,
	ProviderInstance,
	ProviderModule,
	RuntimeError,
	RuntimeErrorKind,
	RuntimeResult,
} from "./features/shared/types";

export type {
	RuntimeError,
	RuntimeErrorKind,
	RuntimeResult,
	PrincipalContext,
	InvocationContext,
	CapabilityCall,
	CapabilityResult,
	ActivateContext,
	ProviderInstance,
	ProviderModule,
	ActivateProviderInput,
	ActivatedProvider,
};

export {
	activateProvider,
	deactivateProvider,
	ensureObservedEffectsDeclared,
	isHostApiCompatible,
	invokeCapability,
};

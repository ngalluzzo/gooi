/**
 * Canonical boundary contract API.
 */
import * as resolve from "./resolve";

export type {
	ResolveProvidersDecision,
	ResolveProvidersInput,
	ResolveProvidersResult,
	ResolveProvidersSelection,
	ResolveProvidersStrategy,
} from "./resolve";

export const resolveContracts = Object.freeze({
	resolveTrustedProviders: resolve.resolveTrustedProviders,
});

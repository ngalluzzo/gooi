/**
 * Canonical provider resolution contract API.
 */
import * as resolution from "./resolution";

export type {
	ResolverDecision,
	ResolverSelection,
	ResolverStrategy,
	ResolveTrustedProvidersInput,
	ResolveTrustedProvidersResult,
} from "./resolution";

export const resolutionContracts = Object.freeze({
	resolverStrategySchema: resolution.resolverStrategySchema,
	resolveTrustedProvidersInputSchema:
		resolution.resolveTrustedProvidersInputSchema,
	resolverSelectionSchema: resolution.resolverSelectionSchema,
	resolverDecisionSchema: resolution.resolverDecisionSchema,
	resolveTrustedProvidersSuccessSchema:
		resolution.resolveTrustedProvidersSuccessSchema,
	resolveTrustedProvidersFailureSchema:
		resolution.resolveTrustedProvidersFailureSchema,
	resolveTrustedProvidersResultSchema:
		resolution.resolveTrustedProvidersResultSchema,
	resolveTrustedProviders: resolution.resolveTrustedProviders,
});

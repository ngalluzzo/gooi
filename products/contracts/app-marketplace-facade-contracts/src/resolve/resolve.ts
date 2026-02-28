import {
	type ResolverDecision,
	type ResolverSelection,
	type ResolverStrategy,
	type ResolveTrustedProvidersInput,
	type ResolveTrustedProvidersResult,
	resolutionContracts,
} from "@gooi/marketplace-contracts/resolution";

export type ResolveProvidersInput = ResolveTrustedProvidersInput;
export type ResolveProvidersResult = ResolveTrustedProvidersResult;
export type ResolveProvidersStrategy = ResolverStrategy;
export type ResolveProvidersDecision = ResolverDecision;
export type ResolveProvidersSelection = ResolverSelection;

export const resolveTrustedProviders =
	resolutionContracts.resolveTrustedProviders;

/**
 * Canonical provider resolution contract API.
 */
import * as model from "./model";
import * as resolution from "./resolution";

export type {
	ResolverCandidateScoreDiagnostic,
	ResolverDecision,
	ResolverEligibilityDiagnostic,
	ResolverEligibilityDiagnosticCode,
	ResolverExplainability,
	ResolverExplainabilityDiagnostics,
	ResolverExplainabilityMode,
	ResolverExplainabilitySummary,
	ResolverScore,
	ResolverScoreComponents,
	ResolverSelection,
	ResolverStage,
	ResolverStageName,
	ResolverStrategy,
	ResolveTrustedProvidersInput,
	ResolveTrustedProvidersResult,
} from "./model";

export const resolutionContracts = Object.freeze({
	resolverStrategySchema: model.resolverStrategySchema,
	resolverExplainabilityModeSchema: model.resolverExplainabilityModeSchema,
	resolveTrustedProvidersInputSchema: model.resolveTrustedProvidersInputSchema,
	resolverEligibilityDiagnosticCodeSchema:
		model.resolverEligibilityDiagnosticCodeSchema,
	resolverEligibilityDiagnosticSchema:
		model.resolverEligibilityDiagnosticSchema,
	resolverCandidateScoreDiagnosticSchema:
		model.resolverCandidateScoreDiagnosticSchema,
	resolverExplainabilitySummarySchema:
		model.resolverExplainabilitySummarySchema,
	resolverExplainabilityDiagnosticsSchema:
		model.resolverExplainabilityDiagnosticsSchema,
	resolverScoreComponentsSchema: model.resolverScoreComponentsSchema,
	resolverScoreSchema: model.resolverScoreSchema,
	resolverSelectionSchema: model.resolverSelectionSchema,
	resolverStageNameSchema: model.resolverStageNameSchema,
	resolverStageSchema: model.resolverStageSchema,
	resolverExplainabilitySchema: model.resolverExplainabilitySchema,
	resolverDecisionSchema: model.resolverDecisionSchema,
	resolveTrustedProvidersSuccessSchema:
		model.resolveTrustedProvidersSuccessSchema,
	resolveTrustedProvidersFailureSchema:
		model.resolveTrustedProvidersFailureSchema,
	resolveTrustedProvidersResultSchema:
		model.resolveTrustedProvidersResultSchema,
	resolveTrustedProviders: resolution.resolveTrustedProviders,
});

import { describe, expect, test } from "bun:test";
import { eligibilityContracts } from "../src/eligibility/contracts";
import { resolutionContracts } from "../src/resolution/contracts";
import {
	discoveryFixture,
	eligibilityFixture,
} from "./fixtures/resolution.fixture";

describe("resolution", () => {
	test("selects providers deterministically with explainable ranking", () => {
		expect(eligibilityFixture.ok).toBe(true);
		if (!eligibilityFixture.ok) {
			return;
		}
		const result = resolutionContracts.resolveTrustedProviders({
			report: eligibilityFixture.report,
			maxResults: 1,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.decision.selected[0]?.providerId).toBe(
			"gooi.providers.memory",
		);
		expect(result.decision.rejected[0]?.providerId).toBe("gooi.providers.http");
		expect(result.decision.rejected[0]?.reachability).toEqual({
			mode: "delegated",
			targetHost: "node",
			delegateRouteId: "route-node-1",
			delegateDescriptor: "https://gooi.dev/delegation/route-node-1",
		});
		expect(result.decision.selected[0]?.rank).toBe(1);
		expect(result.decision.rejected[0]?.rank).toBe(2);
		expect(result.decision.selected[0]?.score.total).toBeGreaterThan(0);
		expect(result.decision.stages.map((stage) => stage.stage)).toEqual([
			"filter",
			"eligibility",
			"scoring",
			"selection",
		]);
		expect(result.decision.explainability.mode).toBe("summary");
		expect(result.decision.explainability.summary.delegatedCandidates).toBe(1);
		expect(result.decision.explainability.summary.localCandidates).toBe(1);
		expect(result.decision.explainability.diagnostics).toBeUndefined();
	});

	test("fails with typed delegation error when delegated candidates miss route metadata", () => {
		expect(eligibilityFixture.ok).toBe(true);
		if (!eligibilityFixture.ok) {
			return;
		}
		const report = {
			...eligibilityFixture.report,
			providers: eligibilityFixture.report.providers.map((provider) => {
				if (provider.providerId === "gooi.providers.http") {
					return {
						...provider,
						reachability: {
							mode: "delegated" as const,
							targetHost: "node" as const,
						},
					};
				}
				return provider;
			}),
		};
		const result = resolutionContracts.resolveTrustedProviders({
			report,
			maxResults: 1,
		});

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.error.code).toBe("resolver_delegation_unavailable_error");
	});

	test("returns policy-rejection errors when trust or certification filters remove all candidates", () => {
		const restricted = eligibilityContracts.explainProviderEligibility({
			catalog: discoveryFixture,
			requiredCertifications: ["fips"],
		});
		expect(restricted.ok).toBe(true);
		if (!restricted.ok) {
			return;
		}

		const result = resolutionContracts.resolveTrustedProviders({
			report: restricted.report,
			maxResults: 1,
		});
		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.error.code).toBe("resolver_policy_rejection_error");
	});

	test("enforces global scoring profile baseline for 1.0.0", () => {
		expect(eligibilityFixture.ok).toBe(true);
		if (!eligibilityFixture.ok) {
			return;
		}

		const result = resolutionContracts.resolveTrustedProviders({
			report: eligibilityFixture.report,
			maxResults: 1,
			scoringProfile: {
				profileId: "tenant-1.0.0",
			},
		});

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.error.code).toBe("resolver_scoring_profile_error");
	});

	test("surfaces typed eligibility diagnostics for policy-filtered candidates", () => {
		expect(eligibilityFixture.ok).toBe(true);
		if (!eligibilityFixture.ok) {
			return;
		}

		const result = resolutionContracts.resolveTrustedProviders({
			report: eligibilityFixture.report,
			maxResults: 1,
			requireEligible: false,
			explainabilityMode: "diagnostics",
			policy: {
				denyProviderIds: ["gooi.providers.http"],
			},
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.decision.selected.map((item) => item.providerId)).toEqual([
			"gooi.providers.memory",
		]);
		expect(result.decision.explainability.mode).toBe("diagnostics");
		expect(
			result.decision.explainability.diagnostics?.eligibilityDiagnostics,
		).toContainEqual({
			providerId: "gooi.providers.http",
			providerVersion: "2.1.0",
			code: "resolver_eligibility_denylisted",
			message: "Provider is blocked by denyProviderIds policy.",
		});
		expect(
			result.decision.explainability.diagnostics?.candidateScores.length,
		).toBe(1);
		expect(
			result.decision.explainability.summary.policyRejectedCandidates,
		).toBe(1);
	});

	test("returns full per-candidate score diagnostics only in diagnostics mode", () => {
		expect(eligibilityFixture.ok).toBe(true);
		if (!eligibilityFixture.ok) {
			return;
		}

		const summaryResult = resolutionContracts.resolveTrustedProviders({
			report: eligibilityFixture.report,
			maxResults: 2,
			requireEligible: false,
		});
		const diagnosticsResult = resolutionContracts.resolveTrustedProviders({
			report: eligibilityFixture.report,
			maxResults: 2,
			requireEligible: false,
			explainabilityMode: "diagnostics",
		});

		expect(summaryResult.ok).toBe(true);
		expect(diagnosticsResult.ok).toBe(true);
		if (!summaryResult.ok || !diagnosticsResult.ok) {
			return;
		}

		expect(summaryResult.decision.explainability.mode).toBe("summary");
		expect(summaryResult.decision.explainability.diagnostics).toBeUndefined();
		expect(diagnosticsResult.decision.explainability.mode).toBe("diagnostics");
		expect(
			diagnosticsResult.decision.explainability.diagnostics?.candidateScores,
		).toEqual(
			diagnosticsResult.decision.selected
				.concat(diagnosticsResult.decision.rejected)
				.map((candidate) => ({
					rank: candidate.rank,
					providerId: candidate.providerId,
					providerVersion: candidate.providerVersion,
					totalScore: candidate.score.total,
					scoreComponents: candidate.score.components,
				})),
		);
	});

	test("returns policy rejection when trust and certification policy removes all candidates", () => {
		expect(eligibilityFixture.ok).toBe(true);
		if (!eligibilityFixture.ok) {
			return;
		}

		const result = resolutionContracts.resolveTrustedProviders({
			report: eligibilityFixture.report,
			maxResults: 1,
			requireEligible: false,
			policy: {
				minTrustTier: "trusted",
				requiredCertifications: ["fips"],
			},
		});

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.error.code).toBe("resolver_policy_rejection_error");
		expect(result.error.issues?.length).toBeGreaterThan(0);
		expect(
			result.error.issues?.some((issue) =>
				issue.message.includes("resolver_eligibility_trust_below_policy"),
			),
		).toBe(true);
		expect(
			result.error.issues?.some((issue) =>
				issue.message.includes("resolver_eligibility_certification_missing"),
			),
		).toBe(true);
	});

	test("returns canonical request-schema errors for invalid inputs", () => {
		const result = resolutionContracts.resolveTrustedProviders({
			report: {},
		});
		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.error.code).toBe("resolver_request_schema_error");
	});

	test("is deterministic for identical resolution input", () => {
		expect(eligibilityFixture.ok).toBe(true);
		if (!eligibilityFixture.ok) {
			return;
		}
		const input = {
			report: eligibilityFixture.report,
			maxResults: 1,
		};
		const first = resolutionContracts.resolveTrustedProviders(input);
		const second = resolutionContracts.resolveTrustedProviders(input);

		expect(first).toStrictEqual(second);
		expect(JSON.stringify(first)).toBe(JSON.stringify(second));
	});
});

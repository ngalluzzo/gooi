import { describe, expect, test } from "bun:test";
import { resolutionContracts } from "../src/resolution/contracts";
import { eligibilityFixture } from "./fixtures/resolution.fixture";

describe("resolution revocation integration", () => {
	test("filters revoked providers with typed diagnostics when revocation state is fresh", () => {
		expect(eligibilityFixture.ok).toBe(true);
		if (!eligibilityFixture.ok) {
			return;
		}

		const result = resolutionContracts.resolveTrustedProviders({
			report: eligibilityFixture.report,
			maxResults: 2,
			requireEligible: false,
			explainabilityMode: "diagnostics",
			revocation: {
				lastSyncedAt: "2026-02-28T12:00:00.000Z",
				evaluatedAt: "2026-02-28T12:01:00.000Z",
				maxStalenessSeconds: 120,
				revokedProviderRefs: ["gooi.providers.http@2.1.0"],
			},
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.decision.selected.map((item) => item.providerId)).toEqual([
			"gooi.providers.memory",
		]);
		expect(
			result.decision.explainability.diagnostics?.eligibilityDiagnostics,
		).toContainEqual({
			providerId: "gooi.providers.http",
			providerVersion: "2.1.0",
			code: "resolver_eligibility_revoked",
			message: "Provider release is revoked by trust revocation policy.",
		});
	});

	test("fails closed when revocation freshness window is stale", () => {
		expect(eligibilityFixture.ok).toBe(true);
		if (!eligibilityFixture.ok) {
			return;
		}

		const result = resolutionContracts.resolveTrustedProviders({
			report: eligibilityFixture.report,
			maxResults: 1,
			revocation: {
				lastSyncedAt: "2026-02-28T12:00:00.000Z",
				evaluatedAt: "2026-02-28T12:10:01.000Z",
				maxStalenessSeconds: 300,
				revokedProviderRefs: [],
			},
		});

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.error.code).toBe("resolver_policy_rejection_error");
		expect(result.error.issues?.[0]?.path).toEqual([
			"revocation",
			"lastSyncedAt",
		]);
	});
});

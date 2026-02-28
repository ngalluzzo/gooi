import type { RunMarketplaceResolutionConformanceInput } from "../../src/marketplace-resolution-conformance/contracts";

const eligibilityReport = {
	query: {
		portId: "notifications.send",
		portVersion: "1.0.0",
		hostApiVersion: "1.0.0",
	},
	requiredCertifications: ["soc2"],
	providers: [
		{
			providerId: "gooi.providers.memory",
			providerVersion: "1.2.3",
			integrity:
				"sha256:6a6f9c2f84fcb56af6dcaaf7af66c74d4d2e7070f951e8fbcf48f7cb13f12777",
			reachability: {
				mode: "local" as const,
				targetHost: "node" as const,
			},
			status: "eligible" as const,
			reasons: [],
			missingCertifications: [],
			compatibility: {
				requiredHostApiVersion: "1.0.0",
				actualHostApiVersion: "1.0.0",
				hostApiCompatible: true,
				capabilityCompatible: true,
				contractHashCompatible: true,
			},
			trust: {
				tier: "trusted" as const,
				certifications: ["soc2"],
				meetsMinimumTier: true,
			},
		},
		{
			providerId: "gooi.providers.http",
			providerVersion: "2.1.0",
			integrity:
				"sha256:fb0e8c460935d98d0e4045afe65c123ec9de42fb0a5d2d3f7ac7a7491229f00a",
			reachability: {
				mode: "delegated" as const,
				targetHost: "node" as const,
				delegateRouteId: "route-node-1",
				delegateDescriptor: "https://gooi.dev/delegation/route-node-1",
			},
			status: "eligible" as const,
			reasons: [],
			missingCertifications: [],
			compatibility: {
				requiredHostApiVersion: "1.0.0",
				actualHostApiVersion: "1.0.0",
				hostApiCompatible: true,
				capabilityCompatible: true,
				contractHashCompatible: true,
			},
			trust: {
				tier: "review" as const,
				certifications: ["soc2"],
				meetsMinimumTier: true,
			},
		},
	],
	summary: {
		totalProviders: 2,
		eligibleProviders: 2,
		ineligibleProviders: 0,
	},
};

const createInput = (): RunMarketplaceResolutionConformanceInput => ({
	deterministicInput: {
		report: eligibilityReport,
		maxResults: 1,
	},
	explainabilityInput: {
		report: eligibilityReport,
		maxResults: 2,
		requireEligible: false,
	},
	policyRejectedInput: {
		report: eligibilityReport,
		maxResults: 1,
		requireEligible: false,
		policy: {
			minTrustTier: "trusted",
			requiredCertifications: ["fips"],
		},
	},
	scoringProfileRejectedInput: {
		report: eligibilityReport,
		maxResults: 1,
		scoringProfile: {
			profileId: "tenant-1.0.0",
		},
	},
	delegatedMetadataGapInput: {
		report: {
			...eligibilityReport,
			providers: eligibilityReport.providers.map((provider) => {
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
		},
		maxResults: 1,
	},
});

export const createMarketplaceResolutionConformanceFixture = () =>
	createInput();

export const createMarketplaceResolutionConformancePolicyMismatchFixture =
	() => {
		const fixture = createInput();
		return {
			...fixture,
			scoringProfileRejectedInput: {
				report: eligibilityReport,
				maxResults: 1,
				scoringProfile: {
					profileId: "global-1.0.0",
				},
			},
		};
	};

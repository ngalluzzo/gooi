import type { DiscoverProvidersInput } from "@gooi/app-marketplace-facade-contracts/discover";

export const createDiscoveryInputFixture = (): DiscoverProvidersInput => ({
	lockfile: {
		appId: "chat-assistant",
		environment: "dev",
		hostApiVersion: "1.0.0",
		providers: [
			{
				providerId: "gooi.providers.memory",
				providerVersion: "1.2.3",
				integrity:
					"sha256:6a6f9c2f84fcb56af6dcaaf7af66c74d4d2e7070f951e8fbcf48f7cb13f12777",
				capabilities: [
					{
						portId: "notifications.send",
						portVersion: "1.0.0",
						contractHash:
							"0f8f7ea8a9d837f76f16fdb5bf8f95d727ec4fdd6d8f45f0c6bf3d9c7d17d2cf",
					},
				],
			},
			{
				providerId: "gooi.providers.http",
				providerVersion: "2.0.0",
				integrity:
					"sha256:fb0e8c460935d98d0e4045afe65c123ec9de42fb0a5d2d3f7ac7a7491229f00a",
				capabilities: [
					{
						portId: "notifications.send",
						portVersion: "1.0.0",
						contractHash:
							"1111111111111111111111111111111111111111111111111111111111111111",
					},
				],
			},
		],
	},
	query: {
		portId: "notifications.send",
		portVersion: "1.0.0",
		contractHash:
			"0f8f7ea8a9d837f76f16fdb5bf8f95d727ec4fdd6d8f45f0c6bf3d9c7d17d2cf",
		minTrustTier: "review",
	},
	trustIndex: {
		"gooi.providers.memory@1.2.3": {
			tier: "trusted",
			certifications: ["soc2", "iso27001"],
		},
		"gooi.providers.http@2.0.0": {
			tier: "review",
			certifications: ["self-attested"],
		},
	},
	reachabilityIndex: {
		"gooi.providers.memory@1.2.3": {
			mode: "local",
			targetHost: "node",
		},
		"gooi.providers.http@2.0.0": {
			mode: "delegated",
			targetHost: "node",
			delegateRouteId: "route-node-1",
			delegateDescriptor: "https://gooi.dev/delegation/route-node-1",
		},
	},
});

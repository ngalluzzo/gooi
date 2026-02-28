import { describe, expect, test } from "bun:test";
import { discoverContracts } from "../src/discover/contracts";

describe("app-marketplace-facade-contracts", () => {
	test("parses discovery input via canonical marketplace contracts", () => {
		const parsed = discoverContracts.parseDiscoverProvidersInput({
			lockfile: {
				appId: "demo-app",
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
								portId: "ids.generate",
								portVersion: "1.0.0",
								contractHash:
									"0f8f7ea8a9d837f76f16fdb5bf8f95d727ec4fdd6d8f45f0c6bf3d9c7d17d2cf",
							},
						],
					},
				],
			},
			query: {
				portId: "ids.generate",
				portVersion: "1.0.0",
			},
		});

		expect(parsed.query.portId).toBe("ids.generate");
		expect(parsed.lockfile.providers[0]?.providerId).toBe(
			"gooi.providers.memory",
		);
	});
});

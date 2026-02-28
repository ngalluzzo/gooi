import { describe, expect, test } from "bun:test";
import { catalogContracts } from "@gooi/marketplace-contracts/catalog";
import {
	exportMarketplaceCatalogSnapshot,
	getMarketplaceCatalogDetail,
	searchMarketplaceCatalog,
} from "../src/catalog/catalog";

const catalogState = {
	listings: [
		{
			providerNamespace: "gooi",
			providerId: "gooi.providers.memory",
			providerVersion: "1.1.0",
			contentHash:
				"fb0e8c460935d98d0e4045afe65c123ec9de42fb0a5d2d3f7ac7a7491229f00a",
			integrity:
				"sha256:fb0e8c460935d98d0e4045afe65c123ec9de42fb0a5d2d3f7ac7a7491229f00a",
			capabilities: [
				{
					portId: "notifications.send",
					portVersion: "1.0.0",
					contractHash:
						"0f8f7ea8a9d837f76f16fdb5bf8f95d727ec4fdd6d8f45f0c6bf3d9c7d17d2cf",
				},
			],
			metadata: {
				displayName: "Memory Notifications",
				tags: ["memory"],
			},
			status: "active" as const,
			publishedAt: "2026-02-28T10:00:00.000Z",
			updatedAt: "2026-02-28T10:00:00.000Z",
		},
	],
	auditLog: [
		{
			sequence: 1,
			occurredAt: "2026-02-28T10:00:00.000Z",
			actorId: "publisher:alice",
			action: "publish" as const,
			providerNamespace: "gooi",
			providerId: "gooi.providers.memory",
			providerVersion: "1.1.0",
		},
	],
};

describe("@gooi/app-marketplace catalog", () => {
	test("maintains semantic parity for search, detail, and snapshot flows", () => {
		const descriptorIndex =
			catalogContracts.catalogProviderExecutionDescriptorIndexSchema.parse({
				"gooi.providers.memory@1.1.0": {
					descriptorVersion: "1.0.0",
					requiredHostApiVersion: "1.0.0",
					supportedHosts: ["node"],
					capabilities: [
						{
							portId: "notifications.send",
							portVersion: "1.0.0",
							mode: "delegated",
							targetHost: "node",
							delegateRouteId: "route-node-1",
							delegateDescriptor: "https://gooi.dev/delegation/route-node-1",
						},
					],
					delegationRoutes: [
						{
							routeId: "route-node-1",
							targetHost: "node",
							descriptor: "https://gooi.dev/delegation/route-node-1",
						},
					],
				},
			});
		const searchInput = {
			state: catalogState,
			descriptorIndex,
			query: {
				providerNamespace: "gooi",
			},
		};
		const facadeSearch = searchMarketplaceCatalog(searchInput);
		const baselineSearch = catalogContracts.searchCatalog(searchInput);
		expect(JSON.stringify(facadeSearch)).toBe(JSON.stringify(baselineSearch));
		expect(facadeSearch.ok).toBe(true);
		if (!facadeSearch.ok) {
			return;
		}
		expect(
			facadeSearch.result.items[0]?.executionDescriptor?.descriptorVersion,
		).toBe("1.0.0");

		const detailInput = {
			state: catalogState,
			providerId: "gooi.providers.memory",
			providerVersion: "1.1.0",
		};
		const facadeDetail = getMarketplaceCatalogDetail(detailInput);
		const baselineDetail = catalogContracts.getCatalogDetail(detailInput);
		expect(JSON.stringify(facadeDetail)).toBe(JSON.stringify(baselineDetail));

		const snapshotInput = {
			state: catalogState,
			mirrorId: "enterprise-west",
			includeDeprecated: true,
		};
		const facadeSnapshot = exportMarketplaceCatalogSnapshot(snapshotInput);
		const baselineSnapshot =
			catalogContracts.exportCatalogSnapshot(snapshotInput);
		expect(JSON.stringify(facadeSnapshot)).toBe(
			JSON.stringify(baselineSnapshot),
		);
	});
});

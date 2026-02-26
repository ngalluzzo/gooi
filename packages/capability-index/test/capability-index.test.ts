import { describe, expect, test } from "bun:test";

import { buildCapabilityIndexSnapshot } from "../src/build-capability-index-snapshot";
import type { BuildCapabilityIndexSnapshotInput } from "../src/contracts";
import { parseCapabilityIndexSnapshot } from "../src/parse-capability-index-snapshot";
import { resolveCapability } from "../src/resolve-capability";
import { capabilityIndexBuildFixture } from "./fixtures/capability-index.fixture";
import capabilityIndexGolden from "./fixtures/capability-index.golden.json";

describe("capability-index", () => {
	test("builds deterministic snapshot artifact", () => {
		const snapshot = buildCapabilityIndexSnapshot(capabilityIndexBuildFixture);
		expect(snapshot).toEqual(
			parseCapabilityIndexSnapshot(capabilityIndexGolden),
		);
	});

	test("parses snapshot and enforces artifact hash integrity", () => {
		const parsed = parseCapabilityIndexSnapshot(capabilityIndexGolden);
		expect(parsed.artifactHash).toBe(capabilityIndexGolden.artifactHash);
		expect(() =>
			parseCapabilityIndexSnapshot({
				...capabilityIndexGolden,
				artifactHash: "0".repeat(64),
			}),
		).toThrow(
			"Capability index artifactHash does not match normalized snapshot content.",
		);
	});

	test("rejects canonical capability id collisions across local and catalog sources", () => {
		const firstCatalogCapability =
			capabilityIndexBuildFixture.catalogCapabilities[0];
		if (firstCatalogCapability === undefined) {
			throw new Error(
				"Test fixture must include at least one catalog capability.",
			);
		}

		const invalidFixture: BuildCapabilityIndexSnapshotInput = {
			...capabilityIndexBuildFixture,
			catalogCapabilities: [
				...capabilityIndexBuildFixture.catalogCapabilities,
				{
					...firstCatalogCapability,
					capabilityId: "message.is_allowed",
				},
			],
		};

		expect(() => buildCapabilityIndexSnapshot(invalidFixture)).toThrow(
			"Capability id collision detected across local-spec and catalog sources: message.is_allowed",
		);
	});

	test("resolves capability entries by id and optional version", () => {
		const snapshot = parseCapabilityIndexSnapshot(capabilityIndexGolden);
		expect(
			resolveCapability(snapshot, {
				capabilityId: "message.is_allowed",
			}),
		).toBeDefined();
		expect(
			resolveCapability(snapshot, {
				capabilityId: "gooi-marketplace-bun-sqlite.insert_message",
				capabilityVersion: "1.0.0",
			}),
		).toBeDefined();
		expect(
			resolveCapability(snapshot, {
				capabilityId: "does.not.exist",
			}),
		).toBeUndefined();
	});
});

import { describe, expect, test } from "bun:test";
import { discoveryContracts } from "@gooi/marketplace-contracts/discovery";
import { discoverProviders } from "../src/discover/discover-providers";
import { createDiscoveryInputFixture } from "./fixtures/discovery.fixture";

describe("@gooi/app-marketplace discover", () => {
	test("maintains semantic parity with raw discovery contracts", () => {
		const input = createDiscoveryInputFixture();
		const facadeResult = discoverProviders(input);
		const baseline = discoveryContracts.discoverProviders(
			discoveryContracts.parseProviderDiscoveryInput(input),
		);

		expect(JSON.stringify(facadeResult)).toBe(JSON.stringify(baseline));
	});

	test("surfaces compatibility and trust metadata needed for selection", () => {
		const result = discoverProviders(createDiscoveryInputFixture());
		expect(result.providers).toHaveLength(2);
		expect(result.providers[0]?.compatibility.hostApiCompatible).toBe(true);
		expect(result.providers[0]?.trust.tier).toBe("trusted");
		expect(result.providers[1]?.selection.reasons).toContain(
			"capability_contract_mismatch",
		);
	});
});

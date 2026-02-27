import { describe, expect, test } from "bun:test";
import {
	parseProviderManifestBase,
	safeParseProviderManifestBase,
} from "../src/base/base";

describe("provider-manifest", () => {
	test("parses valid provider manifest base", () => {
		const parsed = parseProviderManifestBase({
			providerId: "gooi.providers.memory",
			providerVersion: "1.0.0",
			hostApiRange: "^1.0.0",
		});

		expect(parsed.providerId).toBe("gooi.providers.memory");
	});

	test("safe parse reports invalid semver", () => {
		const parsed = safeParseProviderManifestBase({
			providerId: "gooi.providers.memory",
			providerVersion: "1",
			hostApiRange: "^1.0.0",
		});

		expect(parsed.success).toBe(false);
	});

	test("parses provider manifest base deterministically for identical input", () => {
		const input = {
			providerId: "gooi.providers.memory",
			providerVersion: "1.0.0",
			hostApiRange: "^1.0.0",
		};

		const first = parseProviderManifestBase(input);
		const second = parseProviderManifestBase(input);

		expect(first).toStrictEqual(second);
		expect(JSON.stringify(first)).toBe(JSON.stringify(second));
	});
});

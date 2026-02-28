import { describe, expect, test } from "bun:test";

import { parseExtensionSettings } from "../src/contracts/extension-settings";

describe("parseExtensionSettings", () => {
	test("applies defaults for omitted fields", () => {
		const settings = parseExtensionSettings({});

		expect(settings).toEqual({
			contextPath: ".gooi/authoring-context.json",
			diagnosticsMode: "push",
			enableCodeLens: true,
			telemetryEnabled: false,
		});
	});

	test("parses provided values", () => {
		const settings = parseExtensionSettings({
			contextPath: ".gooi/alt-context.json",
			diagnosticsMode: "pull",
			enableCodeLens: false,
			telemetryEnabled: true,
		});

		expect(settings).toEqual({
			contextPath: ".gooi/alt-context.json",
			diagnosticsMode: "pull",
			enableCodeLens: false,
			telemetryEnabled: true,
		});
	});
});

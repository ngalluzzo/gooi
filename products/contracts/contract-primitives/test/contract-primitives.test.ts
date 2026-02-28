import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { parseExtensionPayload } from "../src/extensions/contracts";
import { parseJsonObject, parseJsonValue } from "../src/json/contracts";

describe("contract-primitives", () => {
	test("parses recursive json values", () => {
		const parsed = parseJsonValue({
			enabled: true,
			items: [1, "two", { deep: null }],
		});
		expect(parsed).toEqual({
			enabled: true,
			items: [1, "two", { deep: null }],
		});
	});

	test("parses json object values", () => {
		const parsed = parseJsonObject({
			id: "demo",
			count: 2,
		});
		expect(parsed.id).toBe("demo");
	});

	test("parses extension payloads with explicit policy", () => {
		const parsed = parseExtensionPayload(
			{
				policy: "x-runtime-hook",
				payload: { retries: 3 },
			},
			z.literal("x-runtime-hook"),
		);
		expect(parsed.policy).toBe("x-runtime-hook");
	});
});

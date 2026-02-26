import { describe, expect, test } from "bun:test";
import {
	normalizeForStableJson,
	sha256,
	stableStringify,
} from "../src/stable-json/stable-json";

describe("stable-json", () => {
	test("sorts object keys recursively", () => {
		expect(stableStringify({ b: 1, a: { z: 2, y: 3 } })).toBe(
			'{"a":{"y":3,"z":2},"b":1}',
		);
	});

	test("produces deterministic sha256 hashes", () => {
		const input = { b: 1, a: [3, 2, 1] };
		const normalized = normalizeForStableJson(input);
		expect(sha256(stableStringify(normalized))).toBe(
			"3ce2bce0ad5f581d642ebf7b59c400e6f60fa4416e9fb08e3061bb0a35f6fb2b",
		);
	});
});

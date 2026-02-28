import { describe, expect, test } from "bun:test";

import {
	authoringClientDeviationCatalog,
	authoringClientDeviationCatalogSchema,
} from "../src/contracts/client-readiness-contracts";

describe("client readiness contracts", () => {
	test("keeps client deviation catalog deterministic and mitigation-backed", () => {
		const parsed = authoringClientDeviationCatalogSchema.parse(
			authoringClientDeviationCatalog,
		);
		const ids = parsed.map((entry) => entry.id);

		expect(ids).toEqual([
			"diagnostics_mode_transport",
			"runtime_lens_parity_gate",
			"workspace_root_resolution",
		]);
		expect(parsed.every((entry) => entry.mitigation.length > 0)).toBe(true);
	});
});

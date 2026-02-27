import { describe, expect, test } from "bun:test";
import { hostFail, hostOk } from "@gooi/host-contracts/result";

describe("host contracts - result model", () => {
	test("creates ok and error host port envelopes", () => {
		const ok = hostOk({ value: 1 });
		const fail = hostFail("bad_request", "Invalid input", { field: "id" });

		expect(ok.ok).toBe(true);
		expect(fail.ok).toBe(false);
		if (!fail.ok) {
			expect(fail.error.code).toBe("bad_request");
		}
	});
});

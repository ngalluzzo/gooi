import { describe, expect, test } from "bun:test";
import { parseCompiledSectionSnapshot } from "../src/compiled/compiled";
import { parseSpecDiagnostic } from "../src/diagnostics/diagnostics";
import { parseGooiAppSpec } from "../src/spec/spec";

describe("app-spec-contracts scaffold", () => {
	test("parses app spec", () => {
		const parsed = parseGooiAppSpec({ app: { id: "demo" } });
		expect(parsed.app.id).toBe("demo");
	});

	test("parses compiled section snapshot", () => {
		const parsed = parseCompiledSectionSnapshot({
			artifactVersion: "1.0.0",
			sections: { app: { id: "demo" } },
		});
		expect(parsed.artifactVersion).toBe("1.0.0");
	});

	test("parses diagnostic", () => {
		const parsed = parseSpecDiagnostic({
			severity: "error",
			code: "spec_error",
			path: "app.id",
			message: "invalid",
		});
		expect(parsed.severity).toBe("error");
	});
});

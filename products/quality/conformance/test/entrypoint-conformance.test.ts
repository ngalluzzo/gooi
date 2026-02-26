import { describe, expect, test } from "bun:test";
import { runEntrypointConformance } from "../src/entrypoint-conformance/run-entrypoint-conformance";
import { createEntrypointConformanceFixture } from "./fixtures/entrypoint-conformance.fixture";

describe("entrypoint conformance", () => {
	test("runs the RFC-0002 entrypoint conformance suite", async () => {
		const fixture = createEntrypointConformanceFixture();
		const report = await runEntrypointConformance(fixture);
		expect(report.passed).toBe(true);
		expect(report.checks.every((check) => check.passed)).toBe(true);
	});
});

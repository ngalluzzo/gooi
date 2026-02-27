import { describe, expect, test } from "bun:test";
import { compileEntrypointBundle } from "../../src/compile/compile-bundle";
import {
	createAmbiguousReachabilityRequirementsFixture,
	createInvalidReachabilityModeFixture,
	createUnknownReachabilityCapabilityIdFixture,
	createUnknownReachabilityCapabilityVersionFixture,
} from "../fixtures/composable-entrypoint-spec.fixture";

describe("spec-compiler reachability validation", () => {
	test("fails compilation for ambiguous reachability requirements", () => {
		const fixture = createAmbiguousReachabilityRequirementsFixture();
		const result = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.diagnostics.map((item) => item.code)).toContain(
				"reachability_requirement_ambiguous",
			);
		}
	});

	test("fails compilation with deterministic diagnostics for invalid reachability mode", () => {
		const fixture = createInvalidReachabilityModeFixture();
		const result = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.diagnostics[0]?.code).toBe("authoring_spec_invalid");
			expect(result.diagnostics[0]?.path).toBe(
				"wiring.requirements.capabilities.0.mode",
			);
		}
	});

	test("fails compilation when reachability references an unknown capability id", () => {
		const fixture = createUnknownReachabilityCapabilityIdFixture();
		const result = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.diagnostics[0]?.code).toBe(
				"spec_reference_not_found_error",
			);
			expect(result.diagnostics[0]?.path).toBe(
				"wiring.requirements.capabilities.0.portId",
			);
		}
	});

	test("fails compilation when reachability references an unknown capability version", () => {
		const fixture = createUnknownReachabilityCapabilityVersionFixture();
		const result = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.diagnostics[0]?.code).toBe(
				"spec_reference_not_found_error",
			);
			expect(result.diagnostics[0]?.path).toBe(
				"wiring.requirements.capabilities.0.portVersion",
			);
		}
	});
});

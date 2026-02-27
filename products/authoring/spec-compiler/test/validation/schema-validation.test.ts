import { describe, expect, test } from "bun:test";
import { compileEntrypointBundle } from "../../src/compile/compile-bundle";
import {
	createBindingFieldMismatchFixture,
	createUnsupportedScalarSpecFixture,
} from "../fixtures/composable-entrypoint-spec.fixture";

describe("spec-compiler validation", () => {
	test("fails compilation when unsupported scalar annotation is used", () => {
		const fixture = createUnsupportedScalarSpecFixture();
		const result = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.diagnostics.map((item) => item.code)).toContain(
				"unsupported_scalar_type",
			);
		}
	});

	test("fails compilation when binding references undeclared input field", () => {
		const fixture = createBindingFieldMismatchFixture();
		const result = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.diagnostics.map((item) => item.code)).toContain(
				"binding_field_not_declared",
			);
		}
	});
});

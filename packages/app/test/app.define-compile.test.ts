import { describe, expect, test } from "bun:test";
import { specContracts } from "@gooi/app-spec-contracts/spec";
import { compileEntrypointBundle } from "@gooi/spec-compiler";
import { compileApp } from "../src/compile/compile-app";
import { defineApp } from "../src/define/define-app";
import { createAppSpecFixture } from "./fixtures/app-spec.fixture";

describe("@gooi/app facade", () => {
	test("maintains semantic parity with compile primitives", () => {
		const spec = createAppSpecFixture();
		const defined = defineApp({ spec });
		expect(defined.ok).toBe(true);
		if (!defined.ok) {
			return;
		}

		const facadeResult = compileApp({
			definition: defined.definition,
			compilerVersion: "1.0.0",
		});
		const baseline = compileEntrypointBundle({
			spec,
			compilerVersion: "1.0.0",
		});
		expect(JSON.stringify(facadeResult)).toBe(JSON.stringify(baseline));
	});

	test("returns explicit deterministic facade diagnostics for invalid app input", () => {
		const invalidSpec = createAppSpecFixture();
		invalidSpec.app.id = "";

		const first = defineApp({ spec: invalidSpec });
		const second = defineApp({ spec: invalidSpec });
		expect(first).toEqual(second);
		expect(first.ok).toBe(false);
		if (first.ok) {
			return;
		}
		expect(first.diagnostics.at(0)).toEqual({
			code: "facade_input_error",
			path: "spec.app.id",
			message: "Too small: expected string to have >=1 characters",
		});
	});

	test("maps facade runtime configuration misuse to typed diagnostics", () => {
		const definition = defineApp({ spec: createAppSpecFixture() });
		expect(definition.ok).toBe(true);
		if (!definition.ok) {
			return;
		}

		const result = compileApp({
			definition: definition.definition,
			compilerVersion: "",
		});
		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.diagnostics.at(0)).toEqual(
			expect.objectContaining({
				severity: "error",
				code: "facade_configuration_error",
				path: "input.compilerVersion",
			}),
		);
	});

	test("matches low-level canonical parse path for define", () => {
		const spec = createAppSpecFixture();
		const defined = defineApp({ spec });
		expect(defined.ok).toBe(true);
		if (!defined.ok) {
			return;
		}
		const lowLevel = specContracts.parseGooiAppSpec(spec);
		expect(JSON.stringify(defined.definition.spec)).toBe(
			JSON.stringify(lowLevel),
		);
	});
});

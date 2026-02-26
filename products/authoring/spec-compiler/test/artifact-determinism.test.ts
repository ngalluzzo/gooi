import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { stableStringify } from "@gooi/stable-json";
import { compileEntrypointBundle } from "../src/compile/compile-bundle";
import { createComposableEntrypointSpecFixture } from "./fixtures/composable-entrypoint-spec.fixture";

describe("spec-compiler artifact determinism", () => {
	test("matches the committed golden compiled bundle artifact", () => {
		const fixture = createComposableEntrypointSpecFixture();
		const result = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		const fixturePath = join(
			import.meta.dir,
			"fixtures",
			"composable-entrypoint-bundle.golden.json",
		);
		const golden = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
		expect(stableStringify(result.bundle)).toBe(stableStringify(golden));
	});
});

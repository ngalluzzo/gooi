import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { unpackPackagedBundle } from "@gooi/artifact-model/bundle";
import { stableStringify } from "@gooi/stable-json";
import {
	compileEntrypointBundle,
	compilePackagedEntrypointBundle,
} from "../../src/compile/compile-bundle";
import { createComposableEntrypointSpecFixture } from "../fixtures/composable-entrypoint-spec.fixture";

describe("spec-compiler packaging", () => {
	test("builds optional packaged bundle that unpacks to canonical lane artifacts", () => {
		const fixture = createComposableEntrypointSpecFixture();
		const result = compilePackagedEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		const unpacked = unpackPackagedBundle({
			bundle: result.packagedBundle,
		});
		expect(unpacked.ok).toBe(true);
		if (unpacked.ok) {
			expect(unpacked.value.manifest.aggregateHash).toBe(
				result.bundle.artifactManifest.aggregateHash,
			);
			expect(Object.keys(unpacked.value.artifacts)).toEqual(
				Object.keys(result.bundle.laneArtifacts),
			);
		}
	});

	test("builds optional packaged bundle that matches canonical golden artifact", () => {
		const fixture = createComposableEntrypointSpecFixture();
		const result = compilePackagedEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		const compiled = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});
		expect(compiled.ok).toBe(true);
		if (!compiled.ok) {
			return;
		}

		expect(stableStringify(result.bundle)).toBe(
			stableStringify(compiled.bundle),
		);
	});

	test("builds deterministic packaged bundle for committed golden artifact", () => {
		const fixture = createComposableEntrypointSpecFixture();
		const result = compilePackagedEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		const fixturePath = join(
			import.meta.dir,
			"../fixtures",
			"composable-entrypoint-bundle.golden.json",
		);
		const golden = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
		expect(stableStringify(result.bundle)).toBe(stableStringify(golden));
	});
});

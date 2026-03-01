import { describe, expect, test } from "bun:test";
import { compileEntrypointBundle } from "../../src/compile/compile-bundle";

const loadDemoSpec = async (): Promise<unknown> => {
	const file = Bun.file(
		new URL("../../../../../docs/demo.yml", import.meta.url),
	);
	return Bun.YAML.parse(await file.text());
};

describe("spec-compiler canonical demo compile", () => {
	test("compiles docs/demo.yml with zero diagnostics", async () => {
		const spec = await loadDemoSpec();
		const result = compileEntrypointBundle({
			spec,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.diagnostics).toEqual([]);
	});

	test("emits deterministic bundle hash for docs/demo.yml", async () => {
		const spec = await loadDemoSpec();
		const first = compileEntrypointBundle({
			spec,
			compilerVersion: "1.0.0",
		});
		const second = compileEntrypointBundle({
			spec,
			compilerVersion: "1.0.0",
		});

		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		if (!first.ok || !second.ok) {
			return;
		}
		expect(first.bundle.artifactHash).toBe(second.bundle.artifactHash);
		expect(first.bundle.sourceSpecHash).toBe(second.bundle.sourceSpecHash);
	});
});

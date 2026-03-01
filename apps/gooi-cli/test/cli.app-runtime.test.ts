import { describe, expect, test } from "bun:test";
import { compileApp } from "@gooi/app/compile";
import { defineApp } from "@gooi/app/define";
import { runCli } from "../src/main";
import { createCliSpecFixture } from "./fixtures/spec.fixture";
import { createTestIo } from "./helpers/test-io";

describe("gooi cli app/runtime commands", () => {
	test("runs app define with JSON stdin input", async () => {
		const ioHarness = createTestIo({
			stdin: JSON.stringify(createCliSpecFixture()),
		});
		const result = await runCli({
			argv: ["app", "define", "--input", "-"],
			io: ioHarness.io,
		});
		expect(result.exitCode).toBe(0);
		expect(result.envelope.ok).toBe(true);
		if (!result.envelope.ok) {
			throw new Error("Expected app define envelope success.");
		}
		expect((result.envelope.result as { readonly ok: boolean }).ok).toBe(true);
	});

	test("runs app compile with explicit compiler version", async () => {
		const ioHarness = createTestIo({
			stdin: JSON.stringify(createCliSpecFixture()),
		});
		const result = await runCli({
			argv: [
				"app",
				"compile",
				"--input",
				"-",
				"--compiler-version",
				"cli-test",
			],
			io: ioHarness.io,
		});
		expect(result.exitCode).toBe(0);
		expect(result.envelope.ok).toBe(true);
		if (!result.envelope.ok) {
			throw new Error("Expected app compile envelope success.");
		}
		const compileResult = result.envelope.result as { readonly ok: boolean };
		expect(compileResult.ok).toBe(true);
	});

	test("runs runtime reachability against compiled bundle", async () => {
		const spec = createCliSpecFixture();
		const defined = defineApp({ spec });
		if (!defined.ok) {
			throw new Error("Fixture must define successfully.");
		}
		const compiled = compileApp({
			definition: defined.definition,
			compilerVersion: "cli-test",
		});
		if (!compiled.ok) {
			throw new Error("Fixture must compile successfully.");
		}

		const ioHarness = createTestIo({
			stdin: JSON.stringify({
				bundle: compiled.bundle,
				query: {
					portId: "notifications.send",
					portVersion: "1.0.0",
				},
			}),
		});
		const result = await runCli({
			argv: ["runtime", "reachability", "--input", "-"],
			io: ioHarness.io,
		});
		expect(result.exitCode).toBe(0);
		expect(result.envelope.ok).toBe(true);
		if (!result.envelope.ok) {
			throw new Error("Expected runtime reachability envelope success.");
		}
		const reachability = result.envelope.result as {
			readonly mode: string;
			readonly source: string;
		};
		expect(reachability.mode).toBe("local");
		expect(reachability.source).toBe("requirements");
	});

	test("runs runtime command and returns runtime envelope payload", async () => {
		const spec = createCliSpecFixture();
		const defined = defineApp({ spec });
		if (!defined.ok) {
			throw new Error("Fixture must define successfully.");
		}
		const compiled = compileApp({
			definition: defined.definition,
			compilerVersion: "cli-test",
		});
		if (!compiled.ok) {
			throw new Error("Fixture must compile successfully.");
		}

		const ioHarness = createTestIo({
			stdin: JSON.stringify({
				bundle: compiled.bundle,
				invocation: {
					surfaceId: "http",
					entrypointKind: "query",
					entrypointId: "list_messages",
					payload: {},
					principal: {
						subject: "user_1",
						claims: {},
						tags: [],
					},
				},
			}),
		});
		const result = await runCli({
			argv: ["runtime", "run", "--input", "-"],
			io: ioHarness.io,
		});
		expect(result.exitCode).toBe(0);
		expect(result.envelope.ok).toBe(true);
		if (!result.envelope.ok) {
			throw new Error("Expected runtime run envelope success.");
		}
		const runtimeResult = result.envelope.result as { readonly ok: boolean };
		expect(typeof runtimeResult.ok).toBe("boolean");
	});
});

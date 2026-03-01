import { describe, expect, test } from "bun:test";
import { runCli } from "../src/main";
import { createTestIo } from "./helpers/test-io";

describe("gooi cli authoring/marketplace/help commands", () => {
	test("returns help output when requested", async () => {
		const ioHarness = createTestIo({
			isStdinTTY: true,
		});
		const result = await runCli({
			argv: ["--help"],
			io: ioHarness.io,
		});
		expect(result.exitCode).toBe(0);
		expect(result.envelope.ok).toBe(true);
		if (!result.envelope.ok) {
			throw new Error("Expected help envelope success.");
		}
		const help = result.envelope.result as {
			readonly commands: readonly unknown[];
		};
		expect(help.commands.length).toBeGreaterThan(0);
	});

	test("routes authoring diagnose to CLI authoring envelope executor", async () => {
		const ioHarness = createTestIo({
			stdin: JSON.stringify({}),
		});
		const result = await runCli({
			argv: ["authoring", "diagnose", "--input", "-"],
			io: ioHarness.io,
		});
		expect(result.exitCode).toBe(0);
		expect(result.envelope.ok).toBe(true);
		if (!result.envelope.ok) {
			throw new Error("Expected authoring command envelope success.");
		}
		const nested = result.envelope.result as { readonly ok: boolean };
		expect(typeof nested.ok).toBe("boolean");
	});

	test("routes marketplace discover command and never falls back to usage error", async () => {
		const ioHarness = createTestIo({
			stdin: JSON.stringify({}),
		});
		const result = await runCli({
			argv: ["marketplace", "discover", "--input", "-"],
			io: ioHarness.io,
		});
		expect(result.envelope.command).toBe("marketplace discover");
		if (!result.envelope.ok) {
			expect(result.envelope.error.code).not.toBe("usage_error");
		}
	});
});

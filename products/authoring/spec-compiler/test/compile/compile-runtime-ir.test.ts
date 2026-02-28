import { describe, expect, test } from "bun:test";
import { compileEntrypointBundle } from "../../src/compile/compile-bundle";
import { createComposableEntrypointSpecFixture } from "../fixtures/composable-entrypoint-spec.fixture";

describe("spec-compiler runtime IR", () => {
	test("compiles domain runtime IR with mutation/action mappings", () => {
		const fixture = createComposableEntrypointSpecFixture();
		const result = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		expect(result.bundle.domainRuntimeIR.artifactVersion).toBe("1.0.0");
		expect(result.bundle.domainRuntimeIR.mutations.submit_message).toEqual(
			expect.objectContaining({
				entrypointId: "submit_message",
				actionId: "guestbook.submit",
			}),
		);
		expect(result.bundle.domainRuntimeIR.flows.rejection_followup).toEqual({
			flowId: "rejection_followup",
		});
	});

	test("fails compile when session defaults reference undeclared fields", () => {
		const fixture = createComposableEntrypointSpecFixture();
		(
			fixture.session as unknown as {
				fields: Record<string, unknown>;
				defaults?: Record<string, unknown>;
			}
		).defaults = {
			ghost_field: "value",
		};
		const result = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.diagnostics.map((item) => item.code)).toContain(
				"session_ir_invalid_error",
			);
			expect(result.diagnostics.map((item) => item.path)).toContain(
				"session.defaults.ghost_field",
			);
		}
	});

	test("expands authored composite scenario steps into canonical scenario IR step sequence", () => {
		const fixture = createComposableEntrypointSpecFixture();
		const result = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		const compiledScenario =
			result.bundle.scenarioIR.scenarios.happy_path_message_submission;
		expect(compiledScenario).toBeDefined();
		if (compiledScenario === undefined) {
			return;
		}
		expect(
			compiledScenario.steps.map(
				(step: (typeof compiledScenario.steps)[number]) => step.kind,
			),
		).toEqual(["trigger", "expect", "expect", "expect"]);
	});
});

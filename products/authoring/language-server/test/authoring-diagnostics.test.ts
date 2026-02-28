import { describe, expect, test } from "bun:test";

import { publishAuthoringDiagnostics } from "../src/features/diagnostics/publish-authoring-diagnostics";
import {
	createCompiledBundleMismatchLockfile,
	createMultiParityMismatchLockfile,
	invalidGuardScenarioSourceSpec,
	invalidReachabilitySourceSpec,
} from "./fixtures/authoring-diagnostics.fixture";
import { authoringReadFixture } from "./fixtures/authoring-read.fixture";

describe("lsp diagnostics", () => {
	test("emits catalog mismatch diagnostics in degraded mode", () => {
		const diagnostics = publishAuthoringDiagnostics({
			context: {
				...authoringReadFixture,
				lockfile: authoringReadFixture.staleCatalogLockfile,
			},
			generatedAt: "2026-02-26T00:00:00.000Z",
		});

		expect(diagnostics.parity.status).toBe("mismatch");
		expect(diagnostics.diagnostics).toHaveLength(1);
		expect(diagnostics.diagnostics[0]).toEqual(
			expect.objectContaining({
				code: "catalog_mismatch_error",
				severity: "error",
				path: "lockfile.catalogSnapshot.catalogHash",
				staleArtifacts: true,
			}),
		);
		expect(diagnostics.diagnostics[0]?.message).toContain("expected=");
		expect(diagnostics.diagnostics[0]?.message).toContain("actual=");
	});

	test("emits typed reachability diagnostics with quick-fix contracts", () => {
		const diagnostics = publishAuthoringDiagnostics({
			context: {
				...authoringReadFixture,
				sourceSpec: invalidReachabilitySourceSpec,
			},
			generatedAt: "2026-02-26T00:00:00.000Z",
		});

		const reachabilityCodes = diagnostics.diagnostics
			.filter((entry) => entry.code.startsWith("reachability_"))
			.map((entry) => entry.code);
		expect(reachabilityCodes).toEqual([
			"reachability_mode_invalid",
			"reachability_capability_unknown",
			"reachability_delegate_route_unknown",
			"reachability_capability_version_unknown",
		]);
		expect(
			diagnostics.diagnostics.find(
				(entry) => entry.code === "reachability_mode_invalid",
			)?.quickFixes?.[0],
		).toEqual(
			expect.objectContaining({
				contractRef: "CapabilityReachabilityRequirement@1.0.0",
			}),
		);
	});

	test("emits typed guard and scenario diagnostics with quick-fix contracts", () => {
		const diagnostics = publishAuthoringDiagnostics({
			context: {
				...authoringReadFixture,
				sourceSpec: invalidGuardScenarioSourceSpec,
			},
			generatedAt: "2026-02-26T00:00:00.000Z",
		});

		expect(
			diagnostics.diagnostics
				.map((entry) => entry.code)
				.filter((code) =>
					[
						"guard_signal_unknown",
						"guard_flow_unknown",
						"guard_policy_invalid",
						"invariant_policy_invalid",
						"scenario_persona_unknown",
						"scenario_capture_source_invalid",
						"scenario_capture_path_invalid",
						"scenario_reference_unknown",
					].includes(code),
				),
		).toEqual([
			"guard_flow_unknown",
			"guard_policy_invalid",
			"guard_signal_unknown",
			"invariant_policy_invalid",
			"scenario_persona_unknown",
			"scenario_capture_path_invalid",
			"scenario_capture_source_invalid",
			"scenario_reference_unknown",
			"scenario_reference_unknown",
		]);
		expect(
			diagnostics.diagnostics.find(
				(entry) => entry.code === "guard_policy_invalid",
			)?.quickFixes?.[0],
		).toEqual(
			expect.objectContaining({
				contractRef: "@gooi/guard-contracts/plans/CompiledGuardDefinition",
			}),
		);
	});

	test("emits deterministic mismatch ordering when multiple parity violations exist", () => {
		const diagnostics = publishAuthoringDiagnostics({
			context: {
				...authoringReadFixture,
				lockfile: createMultiParityMismatchLockfile(),
			},
			generatedAt: "2026-02-26T00:00:00.000Z",
		});

		expect(
			diagnostics.diagnostics.map(
				(entry: { readonly path: string }) => entry.path,
			),
		).toEqual([
			"lockfile.catalogSnapshot.catalogHash",
			"lockfile.requiredArtifacts.capabilityIndexSnapshot.artifactHash",
			"lockfile.requiredArtifacts.symbolGraphSnapshot.artifactHash",
		]);
		expect(
			diagnostics.diagnostics.every((entry) => entry.staleArtifacts === true),
		).toBe(true);
	});

	test("emits compiled bundle identity mismatch diagnostics in degraded mode", () => {
		const diagnostics = publishAuthoringDiagnostics({
			context: {
				...authoringReadFixture,
				lockfile: createCompiledBundleMismatchLockfile(),
			},
			generatedAt: "2026-02-26T00:00:00.000Z",
		});

		expect(diagnostics.parity.status).toBe("mismatch");
		expect(diagnostics.diagnostics).toEqual([
			expect.objectContaining({
				code: "artifact_mismatch_error",
				path: "lockfile.requiredArtifacts.compiledEntrypointBundle.artifactHash",
			}),
		]);
	});
});

import { describe, expect, test } from "bun:test";

import { lockfileContracts } from "@gooi/authoring-contracts/lockfile";
import { authoringCompletionListSchema } from "../src/contracts/completion-contracts";
import { listAuthoringCompletionItems } from "../src/features/completion/list-authoring-completion-items";
import { resolveAuthoringCompletionItem } from "../src/features/completion/resolve-authoring-completion-item";
import { publishAuthoringDiagnostics } from "../src/features/diagnostics/publish-authoring-diagnostics";
import { authoringReadFixture } from "./fixtures/authoring-read.fixture";
import completionDoGolden from "./fixtures/completion-do.golden.json";

const { createAuthoringLockfile } = lockfileContracts;

const positionForToken = (
	documentText: string,
	token: string,
	fallback: { line: number; character: number },
) => {
	const lines = documentText.split(/\r?\n/u);
	for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
		const line = lines[lineIndex] ?? "";
		const character = line.indexOf(token);
		if (character >= 0) {
			return { line: lineIndex, character: character + token.length };
		}
	}
	return fallback;
};

const invalidReachabilitySourceSpec = {
	...(authoringReadFixture.sourceSpec as Record<string, unknown>),
	wiring: {
		requirements: {
			capabilities: [
				{
					portId: "missing.capability",
					portVersion: "9.9.9",
					mode: "remote",
				},
				{
					portId: "message.is_allowed",
					portVersion: "1.0.0",
					mode: "delegated",
					delegateRouteId: "missing_route",
				},
				{
					portId: "message.is_allowed",
					portVersion: "9.9.9",
					mode: "local",
				},
			],
		},
	},
};

const invalidGuardScenarioSourceSpec = {
	...(authoringReadFixture.sourceSpec as Record<string, unknown>),
	domain: {
		...((authoringReadFixture.sourceSpec as { domain?: unknown })
			.domain as Record<string, unknown>),
		actions: {
			"guestbook.submit": {
				signalGuards: [
					{
						signalId: "message.deleted",
						definition: { onFail: "panic" },
					},
				],
				flowGuards: [
					{
						flowId: "flow.missing",
						definition: { onFail: "abort" },
					},
				],
				steps: [
					{
						invariants: [
							{
								onFail: "fail_action",
							},
						],
					},
				],
			},
		},
	},
	scenarios: {
		broken: {
			context: { persona: "unknown_persona" },
			steps: [
				{
					trigger: { mutation: "unknown.mutation" },
					expect: { signal: "unknown.signal" },
					capture: [
						{
							captureId: "bad_capture",
							source: "not_valid",
						},
					],
				},
			],
		},
	},
};

describe("lsp completion and diagnostics", () => {
	test("lists deterministic capability completions in do blocks", () => {
		const result = listAuthoringCompletionItems({
			context: authoringReadFixture,
			position: { line: 3, character: 10 },
		});

		expect(result.parity.status).toBe("matched");
		expect(result).toEqual(
			authoringCompletionListSchema.parse(completionDoGolden),
		);
	});

	test("lists signal completions in refresh_on_signals blocks", () => {
		const result = listAuthoringCompletionItems({
			context: authoringReadFixture,
			position: { line: 10, character: 10 },
		});

		expect(result.items.map((item) => item.label)).toEqual(["message.created"]);
		expect(result.items[0]?.kind).toBe("signal");
	});

	test("lists context-aware guard policy completions", () => {
		const result = listAuthoringCompletionItems({
			context: authoringReadFixture,
			position: positionForToken(authoringReadFixture.documentText, "onFail:", {
				line: 14,
				character: 10,
			}),
		});

		expect(result.items.map((item) => item.label)).toEqual([
			"abort",
			"emit_violation",
			"fail_action",
			"log_and_continue",
		]);
		expect(result.items.every((item) => item.kind === "guard_policy")).toBe(
			true,
		);
	});

	test("lists context-aware scenario persona completions", () => {
		const result = listAuthoringCompletionItems({
			context: authoringReadFixture,
			position: positionForToken(
				authoringReadFixture.documentText,
				"persona:",
				{
					line: 18,
					character: 12,
				},
			),
		});

		expect(result.items).toEqual([
			expect.objectContaining({
				label: "moderator",
				kind: "persona",
			}),
		]);
	});

	test("resolves completion details from capability index metadata", () => {
		const base = listAuthoringCompletionItems({
			context: authoringReadFixture,
			position: { line: 3, character: 10 },
		});
		const unresolved = base.items.find(
			(item) => item.label === "message.is_allowed",
		);
		if (unresolved === undefined) {
			throw new Error("Fixture completion must include message.is_allowed.");
		}

		const resolved = resolveAuthoringCompletionItem({
			context: authoringReadFixture,
			item: unresolved,
		});

		expect(resolved.parity.status).toBe("matched");
		expect(resolved.item.detail).toContain("local-spec");
		expect(resolved.item.detail).toContain("uncertified/unknown");
		expect(resolved.item.documentation).toContain("certification: uncertified");
		expect(resolved.item.documentation).toContain("trust tier: unknown");
		expect(resolved.item.documentation).toContain("last verified at: unknown");
		expect(resolved.item.documentation).toContain("schema://local");
	});

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
				lockfile: createAuthoringLockfile({
					...authoringReadFixture.lockfile,
					requiredArtifacts: {
						...authoringReadFixture.lockfile.requiredArtifacts,
						capabilityIndexSnapshot: {
							...authoringReadFixture.lockfile.requiredArtifacts
								.capabilityIndexSnapshot,
							artifactHash: "8".repeat(64),
						},
						symbolGraphSnapshot: {
							...authoringReadFixture.lockfile.requiredArtifacts
								.symbolGraphSnapshot,
							artifactHash: "7".repeat(64),
						},
					},
					catalogSnapshot: {
						...authoringReadFixture.lockfile.catalogSnapshot,
						catalogHash: "9".repeat(64),
					},
				}),
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
				lockfile: createAuthoringLockfile({
					...authoringReadFixture.lockfile,
					requiredArtifacts: {
						...authoringReadFixture.lockfile.requiredArtifacts,
						compiledEntrypointBundle: {
							...authoringReadFixture.lockfile.requiredArtifacts
								.compiledEntrypointBundle,
							artifactHash: "6".repeat(64),
						},
					},
				}),
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

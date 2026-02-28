import { describe, expect, test } from "bun:test";

import { lockfileContracts } from "@gooi/authoring-contracts/lockfile";
import { authoringCompletionListSchema } from "../src/contracts/completion-contracts";
import { listAuthoringCompletionItems } from "../src/features/completion/list-authoring-completion-items";
import { resolveAuthoringCompletionItem } from "../src/features/completion/resolve-authoring-completion-item";
import { publishAuthoringDiagnostics } from "../src/features/diagnostics/publish-authoring-diagnostics";
import { authoringReadFixture } from "./fixtures/authoring-read.fixture";
import completionDoGolden from "./fixtures/completion-do.golden.json";

const { createAuthoringLockfile } = lockfileContracts;

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

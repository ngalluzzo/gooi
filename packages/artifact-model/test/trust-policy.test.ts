import { describe, expect, test } from "bun:test";
import {
	buildArtifactManifestFromArtifacts,
	buildLaneArtifact,
} from "../src/manifest/manifest";
import { validateManifestSignaturesForPolicy } from "../src/trust-policy/manifest-signature-policy";

describe("artifact-model trust-policy signature validation", () => {
	test("does not require signatures for development by default", () => {
		const runtimeArtifact = buildLaneArtifact({
			artifactId: "CompiledRuntimeEntrypoints",
			artifactVersion: "1.0.0",
			lane: "runtime",
			payload: { entrypoints: ["query:list_messages"] },
		});
		const manifest = buildArtifactManifestFromArtifacts({
			artifacts: { "runtime.entrypoints": runtimeArtifact },
		});

		const validation = validateManifestSignaturesForPolicy({
			manifest,
			policy: { profile: "development" },
		});

		expect(validation.ok).toBe(true);
	});

	test("requires signatures for production by default", () => {
		const runtimeArtifact = buildLaneArtifact({
			artifactId: "CompiledRuntimeEntrypoints",
			artifactVersion: "1.0.0",
			lane: "runtime",
			payload: { entrypoints: ["query:list_messages"] },
		});
		const manifest = buildArtifactManifestFromArtifacts({
			artifacts: { "runtime.entrypoints": runtimeArtifact },
		});

		const validation = validateManifestSignaturesForPolicy({
			manifest,
			policy: { profile: "production" },
		});

		expect(validation.ok).toBe(false);
		if (!validation.ok) {
			expect(validation.diagnostics).toEqual([
				expect.objectContaining({
					code: "manifest_signature_missing_error",
					path: "signatures",
				}),
			]);
		}
	});

	test("enforces required signer ids deterministically", () => {
		const runtimeArtifact = buildLaneArtifact({
			artifactId: "CompiledRuntimeEntrypoints",
			artifactVersion: "1.0.0",
			lane: "runtime",
			payload: { entrypoints: ["query:list_messages"] },
		});
		const manifest = buildArtifactManifestFromArtifacts({
			artifacts: { "runtime.entrypoints": runtimeArtifact },
			signatures: { cosign: "sig_1" },
		});

		const validation = validateManifestSignaturesForPolicy({
			manifest,
			policy: {
				profile: "production",
				requiredSignerIds: ["sigstore", "cosign"],
			},
		});

		expect(validation.ok).toBe(false);
		if (!validation.ok) {
			expect(
				validation.diagnostics.map((diagnostic) => diagnostic.path),
			).toEqual(["signatures.sigstore"]);
		}
	});
});

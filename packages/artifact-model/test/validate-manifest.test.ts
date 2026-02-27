import { describe, expect, test } from "bun:test";
import {
	buildArtifactManifestFromArtifacts,
	buildLaneArtifact,
} from "../src/manifest/manifest";
import { validateArtifactManifest } from "../src/validation/validate-manifest";

describe("artifact-model manifest validation", () => {
	test("returns ok for valid deterministic manifest", () => {
		const runtimeArtifact = buildLaneArtifact({
			artifactId: "CompiledRuntimeEntrypoints",
			artifactVersion: "1.0.0",
			lane: "runtime",
			payload: {
				entrypoints: ["query:list_messages"],
			},
		});
		const manifest = buildArtifactManifestFromArtifacts({
			artifacts: {
				"runtime.entrypoints": runtimeArtifact,
			},
		});

		const validation = validateArtifactManifest({
			manifest,
			requiredArtifacts: {
				"runtime.entrypoints": {
					lane: "runtime",
					artifactId: "CompiledRuntimeEntrypoints",
					artifactVersion: "1.0.0",
					artifactHash: runtimeArtifact.artifactHash,
					hashAlgorithm: "sha256",
				},
			},
		});

		expect(validation.ok).toBe(true);
	});

	test("returns typed mismatch diagnostics for aggregate hash and required refs", () => {
		const runtimeArtifact = buildLaneArtifact({
			artifactId: "CompiledRuntimeEntrypoints",
			artifactVersion: "1.0.0",
			lane: "runtime",
			payload: {
				entrypoints: ["query:list_messages"],
			},
		});
		const manifest = buildArtifactManifestFromArtifacts({
			artifacts: {
				"runtime.entrypoints": runtimeArtifact,
			},
		});
		const invalidManifest = {
			...manifest,
			aggregateHash: "invalid_hash",
		};

		const validation = validateArtifactManifest({
			manifest: invalidManifest,
			requiredArtifacts: {
				"quality.seed": {
					lane: "quality",
				},
			},
		});

		expect(validation.ok).toBe(false);
		if (!validation.ok) {
			expect(
				validation.diagnostics.map((diagnostic) => diagnostic.code),
			).toEqual(["artifact_mismatch_error", "artifact_missing_error"]);
		}
	});

	test("keeps manifest signatures optional when no trust policy is provided", () => {
		const runtimeArtifact = buildLaneArtifact({
			artifactId: "CompiledRuntimeEntrypoints",
			artifactVersion: "1.0.0",
			lane: "runtime",
			payload: {
				entrypoints: ["query:list_messages"],
			},
		});
		const manifest = buildArtifactManifestFromArtifacts({
			artifacts: {
				"runtime.entrypoints": runtimeArtifact,
			},
		});

		const validation = validateArtifactManifest({
			manifest,
		});

		expect(validation.ok).toBe(true);
	});

	test("enforces required signatures for certified and production trust profiles", () => {
		const runtimeArtifact = buildLaneArtifact({
			artifactId: "CompiledRuntimeEntrypoints",
			artifactVersion: "1.0.0",
			lane: "runtime",
			payload: {
				entrypoints: ["query:list_messages"],
			},
		});
		const manifest = buildArtifactManifestFromArtifacts({
			artifacts: {
				"runtime.entrypoints": runtimeArtifact,
			},
		});

		const certifiedValidation = validateArtifactManifest({
			manifest,
			signaturePolicy: { profile: "certified" },
		});
		expect(certifiedValidation.ok).toBe(false);
		if (!certifiedValidation.ok) {
			expect(certifiedValidation.diagnostics).toEqual([
				expect.objectContaining({
					code: "manifest_signature_missing_error",
					path: "signatures",
				}),
			]);
		}

		const productionValidation = validateArtifactManifest({
			manifest,
			signaturePolicy: { profile: "production" },
		});
		expect(productionValidation.ok).toBe(false);
		if (!productionValidation.ok) {
			expect(productionValidation.diagnostics).toEqual([
				expect.objectContaining({
					code: "manifest_signature_missing_error",
					path: "signatures",
				}),
			]);
		}
	});

	test("enforces required signer identities through trust policy", () => {
		const runtimeArtifact = buildLaneArtifact({
			artifactId: "CompiledRuntimeEntrypoints",
			artifactVersion: "1.0.0",
			lane: "runtime",
			payload: {
				entrypoints: ["query:list_messages"],
			},
		});
		const manifest = buildArtifactManifestFromArtifacts({
			artifacts: {
				"runtime.entrypoints": runtimeArtifact,
			},
			signatures: {
				cosign: "sig_value",
			},
		});

		const validation = validateArtifactManifest({
			manifest,
			signaturePolicy: {
				profile: "production",
				requiredSignerIds: ["cosign", "sigstore"],
			},
		});

		expect(validation.ok).toBe(false);
		if (!validation.ok) {
			expect(validation.diagnostics).toEqual([
				expect.objectContaining({
					code: "manifest_signature_missing_error",
					path: "signatures.sigstore",
				}),
			]);
		}
	});
});

import { describe, expect, test } from "bun:test";
import {
	buildArtifactManifest,
	buildArtifactManifestFromArtifacts,
	buildLaneArtifact,
	safeParseCompiledArtifactManifest,
} from "../src/manifest/manifest";

describe("artifact-model manifest", () => {
	test("builds deterministic lane artifacts and manifest references", () => {
		const runtimeArtifact = buildLaneArtifact({
			artifactId: "CompiledRuntimeEntrypoints",
			artifactVersion: "1.0.0",
			lane: "runtime",
			payload: {
				entrypoints: ["query:list_messages"],
			},
		});
		const qualityArtifact = buildLaneArtifact({
			artifactId: "CompiledQualitySeed",
			artifactVersion: "1.0.0",
			lane: "quality",
			payload: {
				queryIds: ["list_messages"],
			},
		});

		const first = buildArtifactManifestFromArtifacts({
			artifacts: {
				"runtime.entrypoints": runtimeArtifact,
				"quality.seed": qualityArtifact,
			},
		});
		const second = buildArtifactManifestFromArtifacts({
			artifacts: {
				"quality.seed": qualityArtifact,
				"runtime.entrypoints": runtimeArtifact,
			},
		});

		expect(first.aggregateHash).toBe(second.aggregateHash);
		expect(Object.keys(first.artifacts)).toEqual([
			"quality.seed",
			"runtime.entrypoints",
		]);
		expect(first.artifacts["runtime.entrypoints"]?.artifactHash).toBe(
			runtimeArtifact.artifactHash,
		);
	});

	test("safe-parse reports structured issues for invalid manifests", () => {
		const parsed = safeParseCompiledArtifactManifest({
			artifactVersion: "2.0.0",
			hashAlgorithm: "sha256",
			artifacts: {
				runtime: {
					refVersion: "1.0.0",
					lane: "runtime",
					artifactId: "CompiledRuntimeEntrypoints",
					artifactVersion: "1.0.0",
					artifactHash: "abc123",
					hashAlgorithm: "sha256",
				},
			},
		});
		expect(parsed.success).toBe(false);
		if (!parsed.success) {
			expect(parsed.error.issues[0]?.path).toEqual(["aggregateHash"]);
		}
	});

	test("buildArtifactManifest keeps explicit references deterministic", () => {
		const first = buildArtifactManifest({
			artifacts: {
				"runtime.entrypoints": {
					refVersion: "1.0.0",
					lane: "runtime",
					artifactId: "CompiledRuntimeEntrypoints",
					artifactVersion: "1.0.0",
					artifactHash: "hash_a",
					hashAlgorithm: "sha256",
				},
				"quality.seed": {
					refVersion: "1.0.0",
					lane: "quality",
					artifactId: "CompiledQualitySeed",
					artifactVersion: "1.0.0",
					artifactHash: "hash_b",
					hashAlgorithm: "sha256",
				},
			},
		});
		const second = buildArtifactManifest({
			artifacts: {
				"quality.seed": {
					refVersion: "1.0.0",
					lane: "quality",
					artifactId: "CompiledQualitySeed",
					artifactVersion: "1.0.0",
					artifactHash: "hash_b",
					hashAlgorithm: "sha256",
				},
				"runtime.entrypoints": {
					refVersion: "1.0.0",
					lane: "runtime",
					artifactId: "CompiledRuntimeEntrypoints",
					artifactVersion: "1.0.0",
					artifactHash: "hash_a",
					hashAlgorithm: "sha256",
				},
			},
		});

		expect(first.aggregateHash).toBe(second.aggregateHash);
	});

	test("keeps signatures optional and deterministic when provided", () => {
		const withoutSignatures = buildArtifactManifest({
			artifacts: {
				"runtime.entrypoints": {
					refVersion: "1.0.0",
					lane: "runtime",
					artifactId: "CompiledRuntimeEntrypoints",
					artifactVersion: "1.0.0",
					artifactHash: "hash_a",
					hashAlgorithm: "sha256",
				},
			},
		});
		expect(withoutSignatures.signatures).toBeUndefined();

		const firstWithSignatures = buildArtifactManifest({
			artifacts: withoutSignatures.artifacts,
			signatures: {
				sigstore: "sig_2",
				cosign: "sig_1",
			},
		});
		const secondWithSignatures = buildArtifactManifest({
			artifacts: withoutSignatures.artifacts,
			signatures: {
				cosign: "sig_1",
				sigstore: "sig_2",
			},
		});
		expect(firstWithSignatures.aggregateHash).toBe(
			secondWithSignatures.aggregateHash,
		);
		expect(Object.keys(firstWithSignatures.signatures ?? {})).toEqual([
			"cosign",
			"sigstore",
		]);
	});
});

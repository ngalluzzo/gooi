import { describe, expect, test } from "bun:test";
import {
	buildPackagedBundle,
	unpackPackagedBundle,
} from "../src/bundle/bundle";
import {
	buildArtifactManifestFromArtifacts,
	buildLaneArtifact,
} from "../src/manifest/manifest";

describe("artifact-model packaged bundle", () => {
	test("builds and unpacks deterministic packaged bundle payloads", () => {
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

		const first = buildPackagedBundle({
			manifest,
			artifacts: {
				"runtime.entrypoints": runtimeArtifact,
			},
		});
		const second = buildPackagedBundle({
			manifest,
			artifacts: {
				"runtime.entrypoints": runtimeArtifact,
			},
		});
		expect(first.bundleHash).toBe(second.bundleHash);

		const unpacked = unpackPackagedBundle({ bundle: first });
		expect(unpacked.ok).toBe(true);
		if (unpacked.ok) {
			expect(unpacked.value.manifest.aggregateHash).toBe(
				manifest.aggregateHash,
			);
			expect(unpacked.value.artifacts["runtime.entrypoints"]).toEqual(
				runtimeArtifact,
			);
		}
	});

	test("returns typed error when bundle payload is corrupted", () => {
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
		const bundle = buildPackagedBundle({
			manifest,
			artifacts: {
				"runtime.entrypoints": runtimeArtifact,
			},
		});

		const corrupted = {
			...bundle,
			artifacts: {
				...bundle.artifacts,
				"runtime.entrypoints": {
					encoding: "base64",
					payload: "%%%%not-base64%%%%",
				},
			},
		};

		const unpacked = unpackPackagedBundle({ bundle: corrupted });
		expect(unpacked.ok).toBe(false);
		if (!unpacked.ok) {
			expect(unpacked.diagnostics[0]?.code).toBe("artifact_mismatch_error");
			expect(
				unpacked.diagnostics.some(
					(diagnostic) => diagnostic.code === "bundle_unpack_error",
				),
			).toBe(true);
			expect(
				unpacked.diagnostics.some(
					(diagnostic) => diagnostic.code === "artifact_mismatch_error",
				),
			).toBe(true);
		}
	});
});

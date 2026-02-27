import { describe, expect, test } from "bun:test";
import { runEntrypoint } from "../../../src/engine";
import {
	createQueryValidationBundle,
	withInvalidArtifactManifest,
} from "./query-validation.fixture";

describe("entrypoint-runtime manifest validation", () => {
	test("fails with typed diagnostics when compiled artifact manifest integrity is invalid", async () => {
		const fixture = withInvalidArtifactManifest(createQueryValidationBundle());
		const result = await runEntrypoint({
			bundle: fixture.bundle,
			binding: fixture.binding,
			request: { query: { page: 1 } },
			principal: {
				subject: "user_1",
				claims: {},
				tags: ["authenticated"],
			},
			domainRuntime: {
				executeQuery: async () => ({
					ok: true,
					output: { ok: true },
					observedEffects: ["read"],
				}),
				executeMutation: async () => ({
					ok: false,
					error: { message: "not used" },
					observedEffects: [],
				}),
			},
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			const runtimeArtifact =
				fixture.bundle.laneArtifacts.runtimeEntrypointContracts;
			const bindingRequirementsArtifact =
				fixture.bundle.laneArtifacts.bindingRequirements;
			expect(runtimeArtifact).toBeDefined();
			expect(bindingRequirementsArtifact).toBeDefined();
			if (
				runtimeArtifact === undefined ||
				bindingRequirementsArtifact === undefined
			) {
				return;
			}

			expect(result.error?.code).toBe("validation_error");
			expect(result.error?.details).toEqual(
				expect.objectContaining({
					code: "manifest_validation_error",
					diagnostics: expect.arrayContaining([
						expect.objectContaining({
							code: "artifact_mismatch_error",
							path: "aggregateHash",
						}),
					]),
					activation: expect.objectContaining({
						status: "mismatch",
						bundleIdentity: expect.objectContaining({
							artifactHash: fixture.bundle.artifactHash,
							artifactVersion: fixture.bundle.artifactVersion,
						}),
						manifestIdentity: expect.objectContaining({
							aggregateHash: fixture.bundle.artifactManifest.aggregateHash,
							artifactVersion: fixture.bundle.artifactManifest.artifactVersion,
						}),
						requiredArtifacts: expect.arrayContaining([
							expect.objectContaining({
								artifactKey: "runtimeEntrypointContracts",
								artifactId: runtimeArtifact.artifactId,
								artifactVersion: runtimeArtifact.artifactVersion,
							}),
							expect.objectContaining({
								artifactKey: "bindingRequirements",
								artifactId: bindingRequirementsArtifact.artifactId,
								artifactVersion: bindingRequirementsArtifact.artifactVersion,
							}),
						]),
					}),
				}),
			);
		}
	});
});

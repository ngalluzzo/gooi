import { describe, expect, test } from "bun:test";
import { compileEntrypointBundle } from "@gooi/spec-compiler";
import { runEntrypoint } from "../../src/engine";

describe("entrypoint-runtime", () => {
	test("rejects payloads that violate compiled input schema before domain execution", async () => {
		const compiled = compileEntrypointBundle({
			compilerVersion: "1.0.0",
			spec: {
				app: {
					id: "validation_fixture_app",
					name: "Validation Fixture App",
					tz: "UTC",
				},
				domain: {
					projections: {
						latest_messages: {},
					},
				},
				session: {
					fields: {},
				},
				access: {
					default_policy: "deny",
					roles: { authenticated: {} },
				},
				queries: [
					{
						id: "typed_query",
						access: { roles: ["authenticated"] },
						in: { page: "int!" },
						returns: { projection: "latest_messages" },
					},
				],
				mutations: [],
				routes: [],
				personas: {},
				scenarios: {},
				wiring: {
					surfaces: {
						http: {
							queries: {
								typed_query: {
									bind: { page: "query.page" },
								},
							},
						},
					},
				},
				views: {
					nodes: [],
					screens: [],
				},
			},
		});
		expect(compiled.ok).toBe(true);
		if (!compiled.ok) {
			return;
		}

		const binding = compiled.bundle.bindings["http:query:typed_query"];
		expect(binding).toBeDefined();
		if (binding === undefined) {
			return;
		}

		const calls = { query: 0 };
		const result = await runEntrypoint({
			bundle: compiled.bundle,
			binding,
			request: { query: { page: true } },
			principal: {
				subject: "user_1",
				claims: {},
				tags: ["authenticated"],
			},
			domainRuntime: {
				executeQuery: async () => {
					calls.query += 1;
					return {
						ok: true,
						output: { ok: true },
						observedEffects: ["read"],
					};
				},
				executeMutation: async () => ({
					ok: false,
					error: { message: "not used" },
					observedEffects: [],
				}),
			},
		});

		expect(result.ok).toBe(false);
		expect(calls.query).toBe(0);
		if (!result.ok) {
			expect(result.error?.code).toBe("validation_error");
		}
	});

	test("fails with typed diagnostics when compiled schema profile does not match pinned profile", async () => {
		const compiled = compileEntrypointBundle({
			compilerVersion: "1.0.0",
			spec: {
				app: {
					id: "schema_profile_fixture_app",
					name: "Schema Profile Fixture App",
					tz: "UTC",
				},
				domain: {
					projections: {
						latest_messages: {},
					},
				},
				session: {
					fields: {},
				},
				access: {
					default_policy: "deny",
					roles: { authenticated: {} },
				},
				queries: [
					{
						id: "typed_query",
						access: { roles: ["authenticated"] },
						in: { page: "int!" },
						returns: { projection: "latest_messages" },
					},
				],
				mutations: [],
				routes: [],
				personas: {},
				scenarios: {},
				wiring: {
					surfaces: {
						http: {
							queries: {
								typed_query: {
									bind: { page: "query.page" },
								},
							},
						},
					},
				},
				views: {
					nodes: [],
					screens: [],
				},
			},
		});
		expect(compiled.ok).toBe(true);
		if (!compiled.ok) {
			return;
		}

		const schemaKey = "entrypoint.query.typed_query.input";
		const originalSchemaArtifact = compiled.bundle.schemaArtifacts[schemaKey];
		expect(originalSchemaArtifact).toBeDefined();
		if (originalSchemaArtifact === undefined) {
			return;
		}

		const mismatchBundle = {
			...compiled.bundle,
			schemaArtifacts: {
				...compiled.bundle.schemaArtifacts,
				[schemaKey]: {
					...originalSchemaArtifact,
					target: "draft-7" as unknown,
				},
			},
		} as typeof compiled.bundle;

		const binding = mismatchBundle.bindings["http:query:typed_query"];
		expect(binding).toBeDefined();
		if (binding === undefined) {
			return;
		}

		const result = await runEntrypoint({
			bundle: mismatchBundle,
			binding,
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
			expect(result.error?.code).toBe("validation_error");
			expect(result.error?.details).toEqual(
				expect.objectContaining({
					code: "schema_profile_mismatch",
					expectedSchemaProfile: "draft-2020-12",
					actualSchemaProfile: "draft-7",
				}),
			);
		}
	});

	test("fails with typed diagnostics when compiled artifact manifest integrity is invalid", async () => {
		const compiled = compileEntrypointBundle({
			compilerVersion: "1.0.0",
			spec: {
				app: {
					id: "manifest_validation_fixture_app",
					name: "Manifest Validation Fixture App",
					tz: "UTC",
				},
				domain: {
					projections: {
						latest_messages: {},
					},
				},
				session: {
					fields: {},
				},
				access: {
					default_policy: "deny",
					roles: { authenticated: {} },
				},
				queries: [
					{
						id: "typed_query",
						access: { roles: ["authenticated"] },
						in: { page: "int!" },
						returns: { projection: "latest_messages" },
					},
				],
				mutations: [],
				routes: [],
				personas: {},
				scenarios: {},
				wiring: {
					surfaces: {
						http: {
							queries: {
								typed_query: {
									bind: { page: "query.page" },
								},
							},
						},
					},
				},
				views: {
					nodes: [],
					screens: [],
				},
			},
		});
		expect(compiled.ok).toBe(true);
		if (!compiled.ok) {
			return;
		}

		const binding = compiled.bundle.bindings["http:query:typed_query"];
		expect(binding).toBeDefined();
		if (binding === undefined) {
			return;
		}

		const invalidManifestBundle = {
			...compiled.bundle,
			artifactManifest: {
				...compiled.bundle.artifactManifest,
				aggregateHash: "invalid_hash",
			},
		};

		const result = await runEntrypoint({
			bundle: invalidManifestBundle,
			binding,
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
				invalidManifestBundle.laneArtifacts.runtimeEntrypointContracts;
			const bindingRequirementsArtifact =
				invalidManifestBundle.laneArtifacts.bindingRequirements;
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
							artifactHash: invalidManifestBundle.artifactHash,
							artifactVersion: invalidManifestBundle.artifactVersion,
						}),
						manifestIdentity: expect.objectContaining({
							aggregateHash:
								invalidManifestBundle.artifactManifest.aggregateHash,
							artifactVersion:
								invalidManifestBundle.artifactManifest.artifactVersion,
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

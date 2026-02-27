import { describe, expect, test } from "bun:test";
import { compileEntrypointBundle } from "@gooi/spec-compiler";
import { runEntrypoint } from "../../src/engine";
import type { HostPortSet } from "../../src/host";
import { createDefaultHostPorts } from "../../src/host";

const createInvalidHostPorts = (
	missingPath:
		| "clock.nowIso"
		| "identity.newTraceId"
		| "identity.newInvocationId"
		| "principal.validatePrincipal"
		| "capabilityDelegation.invokeDelegated",
): HostPortSet => {
	const base = createDefaultHostPorts();

	switch (missingPath) {
		case "clock.nowIso":
			return {
				...base,
				clock: {},
			} as never;
		case "identity.newTraceId":
			return {
				...base,
				identity: {
					newInvocationId: base.identity.newInvocationId,
				},
			} as never;
		case "identity.newInvocationId":
			return {
				...base,
				identity: {
					newTraceId: base.identity.newTraceId,
				},
			} as never;
		case "principal.validatePrincipal":
			return {
				...base,
				principal: {},
			} as never;
		case "capabilityDelegation.invokeDelegated":
			return {
				...base,
				capabilityDelegation: {},
			} as never;
	}
};

describe("entrypoint-runtime host port set", () => {
	test("fails fast with typed diagnostics when required host-port members are missing", async () => {
		const compiled = compileEntrypointBundle({
			compilerVersion: "1.0.0",
			spec: {
				app: {
					id: "host_ports_fixture_app",
					name: "Host Ports Fixture App",
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

		const missingCases = [
			"clock.nowIso",
			"identity.newTraceId",
			"identity.newInvocationId",
			"principal.validatePrincipal",
			"capabilityDelegation.invokeDelegated",
		] as const;
		let queryCalls = 0;

		for (const missingPath of missingCases) {
			const result = await runEntrypoint({
				bundle: compiled.bundle,
				binding,
				request: { query: { page: 1 } },
				principal: {
					subject: "user_1",
					claims: {},
					tags: ["authenticated"],
				},
				domainRuntime: {
					executeQuery: async () => {
						queryCalls += 1;
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
				hostPorts: createInvalidHostPorts(missingPath),
				now: "2026-02-27T00:00:00.000Z",
			});

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error?.code).toBe("validation_error");
				expect(result.error?.details).toEqual(
					expect.objectContaining({
						code: "host_port_missing",
						missingHostPortMembers: expect.arrayContaining([
							expect.objectContaining({
								path: missingPath,
								expected: "function",
							}),
						]),
					}),
				);
			}
		}

		expect(queryCalls).toBe(0);
	});
});

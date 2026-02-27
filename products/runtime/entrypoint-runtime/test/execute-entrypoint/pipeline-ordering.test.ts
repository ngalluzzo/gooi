import { describe, expect, test } from "bun:test";
import type { PrincipalContext } from "@gooi/host-contracts/principal";
import { createHostPrincipalPort } from "@gooi/host-contracts/principal";
import { hostOk } from "@gooi/host-contracts/result";
import { compileEntrypointBundle } from "@gooi/spec-compiler";
import type { CompiledAccessPlan } from "@gooi/spec-compiler/contracts";
import { runEntrypoint } from "../../src/engine";
import { createDefaultHostPorts } from "../../src/host";

const createCompiledQueryFixture = () => {
	const compiled = compileEntrypointBundle({
		compilerVersion: "1.0.0",
		spec: {
			app: {
				id: "pipeline_order_fixture_app",
				name: "Pipeline Order Fixture App",
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
	if (!compiled.ok) {
		throw new Error(
			`Fixture compile failed: ${compiled.diagnostics.map((item) => item.code).join(",")}`,
		);
	}

	const binding = compiled.bundle.bindings["http:query:typed_query"];
	if (binding === undefined) {
		throw new Error("Missing fixture binding for typed_query.");
	}

	return { bundle: compiled.bundle, binding };
};

describe("entrypoint-runtime canonical pipeline ordering", () => {
	test("runs binding and input validation before policy-gate principal evaluation", async () => {
		const fixture = createCompiledQueryFixture();
		let validatePrincipalCalls = 0;
		let deriveRolesCalls = 0;
		let queryCalls = 0;
		const hostPorts = {
			...createDefaultHostPorts(),
			principal: createHostPrincipalPort<PrincipalContext, CompiledAccessPlan>({
				validatePrincipal: (value) => {
					validatePrincipalCalls += 1;
					return hostOk(value as PrincipalContext);
				},
				deriveRoles: () => {
					deriveRolesCalls += 1;
					return hostOk(["authenticated"]);
				},
			}),
		};

		const result = await runEntrypoint({
			bundle: fixture.bundle,
			binding: fixture.binding,
			request: { query: { page: true } },
			principal: { subject: null, claims: {}, tags: [] },
			hostPorts,
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
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error?.code).toBe("validation_error");
		}
		expect(validatePrincipalCalls).toBe(0);
		expect(deriveRolesCalls).toBe(0);
		expect(queryCalls).toBe(0);
	});

	test("evaluates principal policy gate before domain execution for valid input", async () => {
		const fixture = createCompiledQueryFixture();
		const callOrder: string[] = [];
		const hostPorts = {
			...createDefaultHostPorts(),
			principal: createHostPrincipalPort<PrincipalContext, CompiledAccessPlan>({
				validatePrincipal: () => {
					callOrder.push("principal.validate");
					return hostOk({
						subject: "normalized_user",
						claims: {},
						tags: ["authenticated"],
					});
				},
				deriveRoles: ({ principal }) => {
					callOrder.push("principal.derive");
					expect(principal.subject).toBe("normalized_user");
					return hostOk(["authenticated"]);
				},
			}),
		};

		const result = await runEntrypoint({
			bundle: fixture.bundle,
			binding: fixture.binding,
			request: { query: { page: "1" } },
			principal: { subject: "raw_user", claims: {}, tags: [] },
			hostPorts,
			domainRuntime: {
				executeQuery: async (input) => {
					callOrder.push("domain.executeQuery");
					expect(input.principal.subject).toBe("normalized_user");
					return {
						ok: true,
						output: { page: input.input.page },
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

		expect(result.ok).toBe(true);
		expect(callOrder).toEqual([
			"principal.validate",
			"principal.derive",
			"domain.executeQuery",
		]);
	});
});

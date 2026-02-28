import type { KernelSemanticRuntimePort } from "@gooi/kernel-contracts/semantic-engine";
import { compileEntrypointBundle } from "@gooi/spec-compiler";
import type { RunDispatchRenderConformanceInput } from "../../src/dispatch-render-conformance/contracts";

/**
 * Builds dispatch-to-render conformance fixture input.
 */
export const createDispatchRenderConformanceFixture =
	(): RunDispatchRenderConformanceInput => {
		const compiled = compileEntrypointBundle({
			spec: {
				app: {
					id: "dispatch_render_conformance_app",
					name: "Dispatch Render Conformance App",
					tz: "UTC",
				},
				domain: {
					actions: {},
					projections: {
						latest_messages: {
							strategy: "from_collection",
							collectionId: "messages",
							fields: [{ source: "id", as: "id" }],
							sort: [{ field: "id", direction: "asc" as const }],
							pagination: {
								mode: "page" as const,
								pageArg: "page",
								pageSizeArg: "page_size",
								defaultPage: 1,
								defaultPageSize: 10,
								maxPageSize: 50,
							},
						},
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
						id: "list_messages",
						access: { roles: ["authenticated"] },
						in: { page: "int" },
						defaults: { page: 1 },
						returns: { projection: "latest_messages" },
					},
				],
				mutations: [],
				routes: [],
				personas: {},
				scenarios: {},
				wiring: {
					surfaces: {
						web: {
							queries: {
								list_messages: {
									route: "messages.list",
									bind: { page: "query.page" },
								},
							},
						},
					},
				},
				views: {
					nodes: [
						{
							id: "messages_list",
							type: "list",
						},
					],
					screens: [
						{
							id: "home",
							data: {
								messages: {
									query: "list_messages",
									refresh_on_signals: [],
								},
							},
						},
					],
				},
			},
			compilerVersion: "1.0.0",
		});
		if (!compiled.ok) {
			throw new Error(
				`Fixture compile failed: ${compiled.diagnostics.map((item) => item.code).join(",")}`,
			);
		}

		const domainRuntime: KernelSemanticRuntimePort = {
			executeQuery: async (input) => ({
				ok: true,
				output: {
					rows: [
						{
							page: input.input.page ?? 1,
							text: "hello",
						},
					],
				},
				observedEffects: ["read"],
			}),
			executeMutation: async () => ({
				ok: false,
				error: {
					code: "unsupported_mutation_in_fixture",
					message: "Mutation execution is not used by this fixture.",
				},
				observedEffects: [],
			}),
		};

		return {
			bundle: compiled.bundle,
			domainRuntime,
			authorizedPrincipal: {
				subject: "user_1",
				claims: {},
				tags: ["authenticated"],
			},
			unauthorizedPrincipal: {
				subject: null,
				claims: {},
				tags: [],
			},
			surfaceId: "web",
			screenId: "home",
			routeIngress: {
				routeId: "messages.list",
				query: { page: "2" },
			},
			malformedIngress: {
				query: { page: "2" },
			},
		};
	};

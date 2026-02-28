import { compileEntrypointBundle } from "@gooi/spec-compiler";
import type { SurfaceAdapter } from "@gooi/surface-runtime";
import type { RunSurfaceExtensionConformanceInput } from "../../src/surface-extension-conformance/contracts";

/**
 * Reusable template fixture for validating a new surface adapter.
 */
export const createSurfaceExtensionConformanceTemplateFixture =
	(): RunSurfaceExtensionConformanceInput => {
		const compiled = compileEntrypointBundle({
			spec: {
				app: {
					id: "surface_extension_template_app",
					name: "Surface Extension Template App",
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
						in: { page: "int", q: "text" },
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
						chat: {
							queries: {
								list_messages: {
									route: "messages.list",
									bind: {
										page: "args.page",
										q: "args.q",
									},
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
			compilerVersion: "1.0.0",
		});
		if (!compiled.ok) {
			throw new Error(
				`Fixture compile failed: ${compiled.diagnostics.map((item) => item.code).join(",")}`,
			);
		}

		const extensionAdapter: SurfaceAdapter = {
			surfaceType: "chat",
			normalize: (ingress) => {
				const record =
					ingress !== null && typeof ingress === "object"
						? (ingress as Readonly<Record<string, unknown>>)
						: null;
				if (record === null || typeof record.intent !== "string") {
					return {
						ok: false as const,
						error: {
							code: "dispatch_transport_error" as const,
							message: "Chat ingress requires intent.",
						},
					};
				}

				const args =
					record.args !== null && typeof record.args === "object"
						? (record.args as Readonly<Record<string, unknown>>)
						: undefined;
				return {
					ok: true as const,
					value: {
						surfaceType: "chat",
						invocationHost: "node" as const,
						attributes: { routeId: record.intent },
						...(args === undefined ? {} : { payload: { args } }),
					},
				};
			},
		};

		return {
			surfaceId: "chat",
			dispatchPlans: compiled.bundle.dispatchPlans,
			entrypoints: compiled.bundle.entrypoints,
			bindings: compiled.bundle.bindings,
			extensionAdapter,
			successIngress: {
				intent: "messages.list",
				args: { page: "2", q: "plugin" },
			},
			malformedIngress: {
				args: { page: "2", q: "plugin" },
			},
			expectedBoundInput: {
				page: 2,
				q: "plugin",
			},
			expectedEntrypointKind: "query",
			expectedEntrypointId: "list_messages",
		};
	};

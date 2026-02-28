import type { KernelSemanticRuntimePort } from "@gooi/kernel-contracts/semantic-engine";
import { compileEntrypointBundle } from "@gooi/spec-compiler";
import { sha256, stableStringify } from "@gooi/stable-json";

/**
 * Builds a multi-surface fixture used to assert transport consistency.
 */
export const createSurfaceTransportConsistencyFixture = () => {
	const compiled = compileEntrypointBundle({
		spec: {
			app: {
				id: "surface_transport_consistency_app",
				name: "Surface Transport Consistency App",
				tz: "UTC",
			},
			domain: {
				actions: {
					"guestbook.submit": {},
				},
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
					id: "list_messages",
					access: { roles: ["authenticated"] },
					in: { page: "int" },
					defaults: { page: 1 },
					returns: { projection: "latest_messages" },
				},
			],
			mutations: [
				{
					id: "submit_message",
					access: { roles: ["authenticated"] },
					in: { message: "text!" },
					run: {
						actionId: "guestbook.submit",
						input: { message: { $expr: { var: "input.message" } } },
					},
				},
			],
			routes: [],
			personas: {},
			scenarios: {},
			wiring: {
				surfaces: {
					http: {
						queries: {
							list_messages: {
								method: "GET",
								path: "/messages",
								bind: { page: "query.page" },
							},
						},
						mutations: {
							submit_message: {
								method: "POST",
								path: "/messages",
								bind: { message: "body.message" },
							},
						},
					},
					web: {
						queries: {
							list_messages: {
								route: "messages.list",
								bind: { page: "query.page" },
							},
						},
						mutations: {
							submit_message: {
								route: "messages.submit",
								bind: { message: "body.message" },
							},
						},
					},
					cli: {
						queries: {
							list_messages: {
								command: {
									path: "messages list",
									when: { flags: { scope: "all" } },
								},
								bind: { page: "args.page" },
							},
						},
						mutations: {
							submit_message: {
								command: {
									path: "messages submit",
									when: { flags: { scope: "all" } },
								},
								bind: { message: "args.message" },
							},
						},
					},
					webhook: {
						queries: {
							list_messages: {
								source: "messages.source",
								method: "POST",
								path: "/messages/hooks/query",
								bind: { page: "body.page" },
							},
						},
						mutations: {
							submit_message: {
								source: "messages.source",
								method: "POST",
								path: "/messages/hooks/mutation",
								bind: { message: "body.message" },
							},
						},
					},
				},
			},
			views: {
				nodes: [],
				screens: [
					{
						id: "home",
						data: {
							messages: {
								query: "list_messages",
								refresh_on_signals: ["message.created"],
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
			output: { rows: [{ input: input.input }] },
			observedEffects: ["read"],
		}),
		executeMutation: async (input) => {
			const payload = { message: input.input.message ?? "" };
			const signal = {
				envelopeVersion: "1.0.0",
				signalId: "message.created",
				signalVersion: 1,
				payload,
				payloadHash: sha256(stableStringify(payload)),
				emittedAt: input.ctx.now,
			} as const;
			return {
				ok: true,
				output: { accepted: true },
				observedEffects: ["emit", "write"],
				emittedSignals: [signal],
			};
		},
	};

	return {
		bundle: compiled.bundle,
		domainRuntime,
		principal: {
			subject: "user_1",
			claims: {},
			tags: ["authenticated"],
		},
		queryIngressBySurface: {
			http: {
				method: "GET",
				path: "/messages",
				query: { page: "2" },
			},
			web: {
				routeId: "messages.list",
				query: { page: "2" },
			},
			cli: {
				command: "messages list",
				flags: { scope: "all" },
				args: { page: "2" },
			},
			webhook: {
				verified: true,
				sourceId: "messages.source",
				method: "POST",
				path: "/messages/hooks/query",
				body: { page: "2" },
			},
		},
		mutationIngressBySurface: {
			http: {
				method: "POST",
				path: "/messages",
				body: { message: "hello" },
			},
			web: {
				routeId: "messages.submit",
				body: { message: "hello" },
			},
			cli: {
				command: "messages submit",
				flags: { scope: "all" },
				args: { message: "hello" },
			},
			webhook: {
				verified: true,
				sourceId: "messages.source",
				method: "POST",
				path: "/messages/hooks/mutation",
				body: { message: "hello" },
			},
		},
	};
};

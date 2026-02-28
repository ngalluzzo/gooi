import type { KernelSemanticRuntimePort } from "@gooi/kernel-contracts/semantic-engine";
import { compileEntrypointBundle } from "@gooi/spec-compiler";
import { sha256, stableStringify } from "@gooi/stable-json";

/**
 * Builds entrypoint conformance fixture input.
 */
export const createEntrypointConformanceFixture = () => {
	const compiled = compileEntrypointBundle({
		spec: {
			app: {
				id: "conformance_fixture_app",
				name: "Conformance Fixture App",
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
				roles: { anonymous: {}, authenticated: {}, admin: {} },
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
	const queryBinding = compiled.bundle.bindings["http:query:list_messages"];
	const mutationBinding =
		compiled.bundle.bindings["http:mutation:submit_message"];
	if (queryBinding === undefined || mutationBinding === undefined) {
		throw new Error(
			"Fixture bindings are missing compiled query or mutation entries.",
		);
	}
	const runtime: KernelSemanticRuntimePort = {
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
		queryBinding,
		mutationBinding,
		domainRuntime: runtime,
		authorizedPrincipal: {
			subject: "user_1",
			claims: {},
			tags: ["authenticated"],
		},
		unauthorizedPrincipal: { subject: null, claims: {}, tags: [] },
		queryRequest: { query: { page: "2" } },
		mutationRequest: { body: { message: "hello" } },
		mutationConflictRequest: { body: { message: "different" } },
	};
};

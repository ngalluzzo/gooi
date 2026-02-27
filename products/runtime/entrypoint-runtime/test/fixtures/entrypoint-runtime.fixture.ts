import type { CompiledSurfaceBinding } from "@gooi/app-spec-contracts/compiled";
import { compileEntrypointBundle } from "@gooi/spec-compiler";
import { sha256, stableStringify } from "@gooi/stable-json";
import type { SignalEnvelope } from "@gooi/surface-contracts/signal-envelope";
import type { DomainRuntimePort } from "../../src/domain";

/**
 * Domain runtime fixture with call counters for query and mutation ports.
 */
export interface RuntimeHarness {
	/** Runtime port implementation wired into entrypoint runtime. */
	readonly runtime: DomainRuntimePort;
	/** Number of query executions performed by the fixture. */
	readonly queryCalls: { count: number };
	/** Number of mutation executions performed by the fixture. */
	readonly mutationCalls: { count: number };
}

/**
 * Builds a compiled bundle fixture and frequently-used binding references.
 */
export const createCompiledRuntimeFixture = () => {
	const compiled = compileEntrypointBundle({
		spec: {
			app: {
				id: "runtime_fixture_app",
				name: "Runtime Fixture App",
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
					in: { page: "int", page_size: "int" },
					defaults: { page: 1, page_size: 10 },
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
								bind: { page: "query.page", page_size: "query.page_size" },
							},
						},
						mutations: {
							submit_message: { bind: { message: "body.message" } },
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
	return {
		bundle: compiled.bundle,
		queryBinding: compiled.bundle.bindings[
			"http:query:list_messages"
		] as CompiledSurfaceBinding,
		mutationBinding: compiled.bundle.bindings[
			"http:mutation:submit_message"
		] as CompiledSurfaceBinding,
	};
};

/**
 * Builds a domain runtime fixture that echoes payload and emits one mutation signal.
 */
export const createRuntimeHarness = (): RuntimeHarness => {
	const queryCalls = { count: 0 };
	const mutationCalls = { count: 0 };
	const runtime: DomainRuntimePort = {
		executeQuery: async (input) => {
			queryCalls.count += 1;
			return {
				ok: true,
				output: { rows: [{ input: input.input }] },
				observedEffects: ["read"],
			};
		},
		executeMutation: async (input) => {
			mutationCalls.count += 1;
			const payload = { message: input.input.message ?? "" };
			const signal: SignalEnvelope = {
				envelopeVersion: "1.0.0",
				signalId: "message.created",
				signalVersion: 1,
				payload,
				payloadHash: sha256(stableStringify(payload)),
				emittedAt: input.ctx.now,
			};
			return {
				ok: true,
				output: { accepted: true, input: input.input },
				observedEffects: ["emit", "write"],
				emittedSignals: [signal],
			};
		},
	};
	return { runtime, queryCalls, mutationCalls };
};

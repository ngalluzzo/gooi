import type { DelegatedCapabilityInvocationInput } from "@gooi/host-contracts/delegation";
import type { HostPortSet } from "@gooi/host-contracts/portset";
import { hostFail, hostOk } from "@gooi/host-contracts/result";
import type { KernelSemanticRuntimePort } from "@gooi/kernel-contracts/semantic-engine";
import type { ResultEnvelope } from "@gooi/surface-contracts/envelope";

export const createRuntimeSpecFixture = () => ({
	app: {
		id: "app_runtime_demo",
		name: "App Runtime Demo",
		tz: "UTC",
	},
	domain: {
		collections: {},
		signals: {},
		capabilities: {
			"notifications.send": { version: "1.0.0" },
		},
		actions: {},
		flows: {},
		projections: {
			latest_messages: {
				strategy: "from_collection",
				collectionId: "messages",
				fields: [{ source: "id", as: "id" }],
				sort: [{ field: "created_at", direction: "desc" as const }],
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
	session: { fields: {} },
	access: {
		default_policy: "deny" as const,
		roles: { authenticated: {} },
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
	mutations: [],
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
						bind: { page: "query.page", page_size: "query.page_size" },
					},
				},
				mutations: {},
				routes: {},
			},
		},
		requirements: {
			capabilities: [
				{
					portId: "notifications.send",
					portVersion: "1.0.0",
					mode: "delegated" as const,
				},
			],
		},
	},
	views: {
		nodes: [{ id: "messages_list", type: "list" }],
		screens: [{ id: "home", data: { messages: { query: "list_messages" } } }],
	},
});

export const createHostPortSetFixture = (): HostPortSet<
	{
		subject: string | null;
		claims: Readonly<Record<string, unknown>>;
		tags: readonly string[];
	},
	ResultEnvelope<unknown, unknown>
> => {
	let traceCounter = 0;
	let invocationCounter = 0;

	return {
		clock: {
			nowIso: () => "2026-02-28T00:00:00.000Z",
		},
		identity: {
			newTraceId: () => `trace_${++traceCounter}`,
			newInvocationId: () => `invocation_${++invocationCounter}`,
		},
		principal: {
			validatePrincipal: (value) =>
				hostOk(
					(value as {
						subject: string | null;
						claims: Readonly<Record<string, unknown>>;
						tags: readonly string[];
					}) ?? {
						subject: null,
						claims: {},
						tags: [],
					},
				),
		},
		capabilityDelegation: {
			invokeDelegated: async (input: DelegatedCapabilityInvocationInput) =>
				hostFail(
					"capability_delegation_error",
					"Delegation route is not configured.",
					{
						routeId: input.routeId,
					},
				),
		},
	};
};

export const createDomainRuntimePortFixture =
	(): KernelSemanticRuntimePort => ({
		executeQuery: async (input) => ({
			ok: true,
			output: {
				queryId: input.entrypoint.id,
				echo: input.input,
			},
			observedEffects: ["read"],
			emittedSignals: [],
		}),
	});

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

export const createHostPortSetFixture = () => {
	return {
		clock: {
			nowIso: () => "2026-02-28T00:00:00.000Z",
		},
		identity: {
			newTraceId: () => "trace_fixture",
			newInvocationId: () => "invocation_fixture",
		},
		principal: {
			validatePrincipal: (value: unknown) => ({
				ok: true as const,
				value: (value as {
					subject: string | null;
					claims: Readonly<Record<string, unknown>>;
					tags: readonly string[];
				}) ?? {
					subject: null,
					claims: {},
					tags: [],
				},
			}),
		},
		capabilityDelegation: {
			invokeDelegated: async (input: { routeId: string }) => ({
				ok: false as const,
				error: {
					code: "capability_delegation_error",
					message: "Delegation route is not configured.",
					details: { routeId: input.routeId },
				},
			}),
		},
	};
};

export const createDomainRuntimePortFixture = () => ({
	executeQuery: async (input: {
		entrypoint: { id: string };
		input: unknown;
	}) => ({
		ok: true as const,
		output: {
			queryId: input.entrypoint.id,
			echo: input.input,
		},
		observedEffects: ["read"] as const,
		emittedSignals: [] as const,
	}),
});

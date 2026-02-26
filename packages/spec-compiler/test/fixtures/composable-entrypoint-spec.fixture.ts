/**
 * Returns a valid composable entrypoint authoring spec fixture.
 */
export const createComposableEntrypointSpecFixture = () => ({
	access: {
		default_policy: "deny" as const,
		roles: {
			anonymous: {},
			authenticated: {},
			admin: {},
		},
	},
	queries: [
		{
			id: "list_messages",
			access: { roles: ["authenticated"] },
			in: {
				page: "int",
				page_size: "int",
				q: "text",
			},
			defaults: {
				page: 1,
				page_size: 10,
			},
			returns: {
				projection: "latest_messages",
			},
		},
	],
	mutations: [
		{
			id: "submit_message",
			access: { roles: ["authenticated"] },
			in: {
				message: "text!",
			},
			run: {
				actionId: "guestbook.submit",
				input: {
					message: {
						$expr: { var: "input.message" },
					},
				},
			},
		},
	],
	wiring: {
		surfaces: {
			http: {
				queries: {
					list_messages: {
						bind: {
							page: "query.page",
							page_size: "query.page_size",
							q: "query.q",
						},
					},
				},
				mutations: {
					submit_message: {
						bind: {
							message: "body.message",
						},
					},
				},
			},
		},
	},
	views: {
		screens: [
			{
				id: "home",
				data: {
					messages: {
						query: "list_messages",
						refresh_on_signals: ["message.created", "message.deleted"],
					},
				},
			},
		],
	},
});

/**
 * Returns an invalid fixture with unsupported scalar type annotation.
 */
export const createUnsupportedScalarSpecFixture = () => {
	const fixture = createComposableEntrypointSpecFixture();
	const query = fixture.queries[0];
	if (query !== undefined) {
		query.in.page = "float";
	}
	return fixture;
};

/**
 * Returns an invalid fixture with a binding field missing from query input.
 */
export const createBindingFieldMismatchFixture = () => {
	const fixture = createComposableEntrypointSpecFixture();
	const bindMap = fixture.wiring.surfaces.http.queries.list_messages
		.bind as Record<string, string>;
	bindMap.not_declared = "query.not_declared";
	return fixture;
};

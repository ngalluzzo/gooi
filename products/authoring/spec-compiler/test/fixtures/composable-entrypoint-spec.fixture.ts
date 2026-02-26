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
		requirements: {
			capabilities: [
				{
					portId: "notifications.send",
					portVersion: "1.0.0",
					mode: "delegated" as const,
				},
				{
					portId: "ids.generate",
					portVersion: "1.0.0",
					mode: "local" as const,
				},
				{
					portId: "legacy.audit",
					portVersion: "1.0.0",
					mode: "unreachable" as const,
				},
			],
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

/**
 * Returns an invalid fixture with conflicting reachability declarations.
 */
export const createAmbiguousReachabilityRequirementsFixture = () => {
	const fixture = createComposableEntrypointSpecFixture();
	const requirements = fixture.wiring.requirements?.capabilities;
	if (requirements !== undefined) {
		requirements.push({
			portId: "ids.generate",
			portVersion: "1.0.0",
			mode: "delegated",
		});
	}
	return fixture;
};

/**
 * Returns an invalid fixture with unsupported reachability mode.
 */
export const createInvalidReachabilityModeFixture = () => {
	const fixture = createComposableEntrypointSpecFixture();
	const requirements = fixture.wiring.requirements?.capabilities;
	if (requirements !== undefined) {
		const first = requirements[0];
		if (first === undefined) {
			return fixture;
		}
		requirements[0] = {
			...first,
			mode: "remote",
		} as unknown as (typeof requirements)[number];
	}
	return fixture;
};

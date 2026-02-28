/**
 * Returns a valid composable entrypoint authoring spec fixture.
 */
export const createComposableEntrypointSpecFixture = () => ({
	app: {
		id: "hello_world_demo",
		name: "Hello World Demo",
		tz: "UTC",
	},
	domain: {
		collections: {},
		signals: {
			"message.created": {},
			"message.deleted": {},
		},
		capabilities: {
			"notifications.send": { version: "1.0.0" },
			"ids.generate": { version: "1.0.0" },
			"legacy.audit": { version: "1.0.0" },
		},
		actions: {
			"guestbook.submit": {},
		},
		flows: {
			rejection_followup: {},
		},
		projections: {
			latest_messages: {
				strategy: "from_collection",
				collectionId: "messages",
				fields: [
					{ source: "id", as: "id" },
					{ source: "message", as: "message" },
				],
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
			messages_with_authors: {
				strategy: "from_collection",
				collectionId: "messages",
				fields: [
					{ source: "id", as: "id" },
					{ source: "author_name", as: "author_name" },
				],
				sort: [{ field: "author_name", direction: "asc" as const }],
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
	routes: [
		{
			id: "home_route",
			access: { roles: ["authenticated"] },
			renders: "home",
		},
	],
	personas: {
		frustrated_enterprise_buyer: {
			description:
				"Senior ops manager with low patience who expects direct answers.",
		},
	},
	scenarios: {
		happy_path_message_submission: {
			context: {
				persona: "frustrated_enterprise_buyer",
			},
			steps: [
				{
					trigger: {
						mutation: "submit_message",
					},
					expect: {
						query: "list_messages",
						projection: "latest_messages",
						flow_completed: "rejection_followup",
					},
				},
			],
		},
	},
	wiring: {
		surfaces: {
			http: {
				queries: {
					list_messages: {
						method: "GET",
						path: "/messages",
						bind: {
							page: "query.page",
							page_size: "query.page_size",
							q: "query.q",
						},
					},
				},
				mutations: {
					submit_message: {
						method: "POST",
						path: "/messages",
						bind: {
							message: "body.message",
						},
					},
				},
				routes: {
					home_route: {
						bind: {},
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

/**
 * Returns an invalid fixture with unknown capability id reference.
 */
export const createUnknownReachabilityCapabilityIdFixture = () => {
	const fixture = createComposableEntrypointSpecFixture();
	const requirements = fixture.wiring.requirements?.capabilities;
	if (requirements !== undefined) {
		const first = requirements[0];
		if (first === undefined) {
			return fixture;
		}
		requirements[0] = {
			...first,
			portId: "ids.unknown",
		};
	}
	return fixture;
};

/**
 * Returns an invalid fixture with unknown capability version reference.
 */
export const createUnknownReachabilityCapabilityVersionFixture = () => {
	const fixture = createComposableEntrypointSpecFixture();
	const requirements = fixture.wiring.requirements?.capabilities;
	if (requirements !== undefined) {
		const first = requirements[0];
		if (first === undefined) {
			return fixture;
		}
		requirements[0] = {
			...first,
			portVersion: "9.9.9",
		};
	}
	return fixture;
};

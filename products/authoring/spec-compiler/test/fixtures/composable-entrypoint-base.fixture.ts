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

import { describe, expect, test } from "bun:test";
import { compileContracts } from "../src/compile/contracts";
import { defineContracts } from "../src/define/contracts";

const createAppSpecFixture = () => ({
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
		},
		actions: {
			"guestbook.submit": {},
		},
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
		roles: { anonymous: {}, authenticated: {} },
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
	routes: [
		{ id: "home_route", access: { roles: ["authenticated"] }, renders: "home" },
	],
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
				mutations: {
					submit_message: {
						method: "POST",
						path: "/messages",
						bind: { message: "body.message" },
					},
				},
				routes: {
					home_route: { bind: {} },
				},
			},
		},
		requirements: {
			capabilities: [
				{
					portId: "notifications.send",
					portVersion: "1.0.0",
					mode: "local" as const,
				},
			],
		},
	},
	views: {
		nodes: [{ id: "messages_list", type: "list" }],
		screens: [{ id: "home", data: { messages: { query: "list_messages" } } }],
	},
});

describe("app-facade-contracts", () => {
	test("parses define input and app definition", () => {
		const defineInput = defineContracts.parseDefineAppInput({
			spec: createAppSpecFixture(),
		});
		const definition = defineContracts.parseAppDefinition({
			spec: defineInput.spec,
		});
		expect(definition.spec.app.id).toBe("hello_world_demo");
	});

	test("parses compile input", () => {
		const parsed = compileContracts.parseCompileAppInput({
			definition: { spec: createAppSpecFixture() },
			compilerVersion: "1.0.0",
		});
		expect(parsed.compilerVersion).toBe("1.0.0");
	});
});

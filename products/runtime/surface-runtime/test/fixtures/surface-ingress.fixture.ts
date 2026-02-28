import type {
	CompiledEntrypoint,
	CompiledSurfaceBinding,
} from "@gooi/app-spec-contracts/compiled";
import type {
	CompiledDispatchHandler,
	CompiledSurfaceDispatchPlanSet,
} from "@gooi/surface-contracts/dispatch";
import {
	listMessagesBindingFixture,
	listMessagesEntrypointFixture,
} from "./surface-binding.fixture";

const httpListMessagesHandler: CompiledDispatchHandler = {
	handlerId: "http:query:list_messages",
	surfaceId: "http",
	matcher: {
		surfaceType: "http",
		clauses: [
			{ key: "method", op: "eq", value: "GET" },
			{ key: "path", op: "path_template", value: "/messages" },
		],
	},
	specificity: 300,
	target: {
		entrypointKind: "query",
		entrypointId: "list_messages",
		fieldBindings: listMessagesBindingFixture.fieldBindings,
	},
};

const webListMessagesHandler: CompiledDispatchHandler = {
	handlerId: "web:query:list_messages",
	surfaceId: "web",
	matcher: {
		surfaceType: "web",
		clauses: [{ key: "routeId", op: "eq", value: "messages_list" }],
	},
	specificity: 280,
	target: {
		entrypointKind: "query",
		entrypointId: "list_messages",
		fieldBindings: {},
	},
};

const cliListMessagesHandler: CompiledDispatchHandler = {
	handlerId: "cli:query:list_messages",
	surfaceId: "cli",
	matcher: {
		surfaceType: "cli",
		clauses: [
			{ key: "command.path", op: "eq", value: "messages list" },
			{ key: "flags.scope", op: "eq", value: "all" },
		],
	},
	specificity: 260,
	target: {
		entrypointKind: "query",
		entrypointId: "list_messages",
		fieldBindings: {},
	},
};

const webhookListMessagesHandler: CompiledDispatchHandler = {
	handlerId: "webhook:query:list_messages",
	surfaceId: "webhook",
	matcher: {
		surfaceType: "webhook",
		clauses: [
			{ key: "sourceId", op: "eq", value: "messages.source" },
			{ key: "method", op: "eq", value: "POST" },
			{ key: "path", op: "path_template", value: "/messages/hooks" },
		],
	},
	specificity: 280,
	target: {
		entrypointKind: "query",
		entrypointId: "list_messages",
		fieldBindings: {},
	},
};

export const createSurfaceIngressDispatchPlansFixture =
	(): CompiledSurfaceDispatchPlanSet => ({
		artifactVersion: "1.0.0",
		plans: {
			http: {
				surfaceId: "http",
				handlers: [httpListMessagesHandler],
			},
			web: {
				surfaceId: "web",
				handlers: [webListMessagesHandler],
			},
			cli: {
				surfaceId: "cli",
				handlers: [cliListMessagesHandler],
			},
			webhook: {
				surfaceId: "webhook",
				handlers: [webhookListMessagesHandler],
			},
		},
	});

export const surfaceIngressEntrypointsFixture: Readonly<
	Record<string, CompiledEntrypoint>
> = {
	"query:list_messages": listMessagesEntrypointFixture,
};

export const surfaceIngressBindingsFixture: Readonly<
	Record<string, CompiledSurfaceBinding>
> = {
	"http:query:list_messages": {
		surfaceId: "http",
		entrypointKind: "query",
		entrypointId: "list_messages",
		fieldBindings: {
			page: "query.page",
			q: "query.q",
		},
	},
	"web:query:list_messages": {
		surfaceId: "web",
		entrypointKind: "query",
		entrypointId: "list_messages",
		fieldBindings: {
			page: "query.page",
			q: "query.q",
		},
	},
	"cli:query:list_messages": {
		surfaceId: "cli",
		entrypointKind: "query",
		entrypointId: "list_messages",
		fieldBindings: {
			page: "args.page",
			q: "args.q",
		},
	},
	"webhook:query:list_messages": {
		surfaceId: "webhook",
		entrypointKind: "query",
		entrypointId: "list_messages",
		fieldBindings: {
			page: "body.page",
			q: "body.q",
		},
	},
};

export const surfaceIngressFixtureBySurface: Readonly<Record<string, unknown>> =
	{
		http: {
			method: "GET",
			path: "/messages",
			query: { page: "2", q: "hello" },
			principal: {
				subject: "user_1",
				claims: {},
				tags: ["authenticated"],
			},
			authContext: {
				provider: "fixture",
			},
		},
		web: {
			routeId: "messages_list",
			query: { page: "2", q: "hello" },
			principal: {
				subject: "user_1",
				claims: {},
				tags: ["authenticated"],
			},
			authContext: {
				provider: "fixture",
			},
		},
		cli: {
			command: "messages list",
			flags: { scope: "all" },
			args: { page: "2", q: "hello" },
			principal: {
				subject: "user_1",
				claims: {},
				tags: ["authenticated"],
			},
			authContext: {
				provider: "fixture",
			},
		},
		webhook: {
			verified: true,
			sourceId: "messages.source",
			method: "POST",
			path: "/messages/hooks",
			body: { page: "2", q: "hello" },
			principal: {
				subject: "user_1",
				claims: {},
				tags: ["authenticated"],
			},
			authContext: {
				provider: "fixture",
			},
		},
	};

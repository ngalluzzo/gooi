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
	listMessagesRequestFixture,
} from "./surface-binding.fixture";

const listMessagesHandler: CompiledDispatchHandler = {
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

const genericMessagesHandler: CompiledDispatchHandler = {
	handlerId: "http:route:messages_fallback",
	surfaceId: "http",
	matcher: {
		surfaceType: "http",
		clauses: [
			{ key: "method", op: "eq", value: "GET" },
			{ key: "path", op: "path_template", value: "/:resource" },
		],
	},
	specificity: 120,
	target: {
		entrypointKind: "route",
		entrypointId: "messages_fallback",
		fieldBindings: {},
	},
};

export const dispatchRequestFixture = {
	surfaceId: "http",
	surfaceType: "http",
	attributes: {
		method: "GET",
		path: "/messages",
	},
	payload: listMessagesRequestFixture,
} as const;

export const createDispatchPlanFixture =
	(): CompiledSurfaceDispatchPlanSet => ({
		artifactVersion: "1.0.0",
		plans: {
			http: {
				surfaceId: "http",
				handlers: [genericMessagesHandler, listMessagesHandler],
			},
		},
	});

export const createAmbiguousDispatchPlanFixture =
	(): CompiledSurfaceDispatchPlanSet => ({
		artifactVersion: "1.0.0",
		plans: {
			http: {
				surfaceId: "http",
				handlers: [
					listMessagesHandler,
					{
						...listMessagesHandler,
						handlerId: "http:query:list_messages_alias",
					},
				],
			},
		},
	});

export const dispatchEntrypointsFixture: Readonly<
	Record<string, CompiledEntrypoint>
> = {
	"query:list_messages": listMessagesEntrypointFixture,
};

export const dispatchBindingsFixture: Readonly<
	Record<string, CompiledSurfaceBinding>
> = {
	"http:query:list_messages": listMessagesBindingFixture,
};

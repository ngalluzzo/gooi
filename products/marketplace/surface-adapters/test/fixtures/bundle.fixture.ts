import type {
	CompiledEntrypoint,
	CompiledSurfaceBinding,
} from "@gooi/app-spec-contracts/compiled";
import type { CompiledSurfaceDispatchPlanSet } from "@gooi/surface-contracts/dispatch";

const queryEntrypointFixture: CompiledEntrypoint = {
	id: "list_messages",
	kind: "query",
	inputFields: {
		page: { scalarType: "int", required: false },
		q: { scalarType: "text", required: false },
		page_size: { scalarType: "int", required: false },
	},
	defaultInput: {
		page_size: 10,
	},
	accessRoles: ["authenticated"],
	schemaArtifactKey: "entrypoint.query.list_messages.input",
};

export interface SurfaceAdapterBundleFixture {
	readonly dispatchPlans: CompiledSurfaceDispatchPlanSet;
	readonly entrypoints: Readonly<Record<string, CompiledEntrypoint>>;
	readonly bindings: Readonly<Record<string, CompiledSurfaceBinding>>;
}

export const createBundleFixture = (): SurfaceAdapterBundleFixture => ({
	dispatchPlans: {
		artifactVersion: "1.0.0",
		plans: {
			http: {
				surfaceId: "http",
				handlers: [
					{
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
							fieldBindings: { page: "query.page", q: "query.q" },
						},
					},
				],
			},
			web: {
				surfaceId: "web",
				handlers: [
					{
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
							fieldBindings: { page: "query.page", q: "query.q" },
						},
					},
				],
			},
			cli: {
				surfaceId: "cli",
				handlers: [
					{
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
							fieldBindings: { page: "args.page", q: "args.q" },
						},
					},
				],
			},
			webhook: {
				surfaceId: "webhook",
				handlers: [
					{
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
							fieldBindings: { page: "body.page", q: "body.q" },
						},
					},
				],
			},
		},
	},
	entrypoints: {
		"query:list_messages": queryEntrypointFixture,
	},
	bindings: {
		"http:query:list_messages": {
			surfaceId: "http",
			entrypointKind: "query",
			entrypointId: "list_messages",
			fieldBindings: { page: "query.page", q: "query.q" },
		},
		"web:query:list_messages": {
			surfaceId: "web",
			entrypointKind: "query",
			entrypointId: "list_messages",
			fieldBindings: { page: "query.page", q: "query.q" },
		},
		"cli:query:list_messages": {
			surfaceId: "cli",
			entrypointKind: "query",
			entrypointId: "list_messages",
			fieldBindings: { page: "args.page", q: "args.q" },
		},
		"webhook:query:list_messages": {
			surfaceId: "webhook",
			entrypointKind: "query",
			entrypointId: "list_messages",
			fieldBindings: { page: "body.page", q: "body.q" },
		},
	},
});

export const createRouteOnlyBundleFixture =
	(): SurfaceAdapterBundleFixture => ({
		dispatchPlans: {
			artifactVersion: "1.0.0",
			plans: {
				http: {
					surfaceId: "http",
					handlers: [
						{
							handlerId: "http:route:messages_router",
							surfaceId: "http",
							matcher: {
								surfaceType: "http",
								clauses: [
									{ key: "method", op: "eq", value: "GET" },
									{
										key: "path",
										op: "path_template",
										value: "/routes/messages",
									},
								],
							},
							specificity: 220,
							target: {
								entrypointKind: "route",
								entrypointId: "messages_router",
								fieldBindings: { mode: "query.mode" },
							},
						},
					],
				},
			},
		},
		entrypoints: {},
		bindings: {},
	});

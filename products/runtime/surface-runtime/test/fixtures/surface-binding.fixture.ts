import type {
	CompiledEntrypoint,
	CompiledSurfaceBinding,
} from "@gooi/spec-compiler/contracts";

/**
 * Compiled query entrypoint fixture used for binding tests.
 */
export const listMessagesEntrypointFixture: CompiledEntrypoint = {
	id: "list_messages",
	kind: "query",
	inputFields: {
		page: { scalarType: "int", required: false },
		page_size: { scalarType: "int", required: false },
		q: { scalarType: "text", required: false },
		as_of: { scalarType: "timestamp", required: false },
		show_deleted: { scalarType: "bool", required: false },
	},
	defaultInput: {
		page: 1,
		page_size: 10,
		show_deleted: false,
	},
	accessRoles: ["authenticated"],
	schemaArtifactKey: "entrypoint.query.list_messages.input",
};

/**
 * Compiled query binding fixture used for binding tests.
 */
export const listMessagesBindingFixture: CompiledSurfaceBinding = {
	surfaceId: "http",
	entrypointKind: "query",
	entrypointId: "list_messages",
	fieldBindings: {
		page: "query.page",
		page_size: "query.page_size",
		q: "query.q",
		as_of: "query.as_of",
		show_deleted: "query.show_deleted",
	},
};

/**
 * Native HTTP-like request fixture for successful binding.
 */
export const listMessagesRequestFixture = {
	query: {
		page: "2",
		q: "hello",
		as_of: "2026-02-26T00:00:00.000Z",
		show_deleted: "true",
	},
};

import { z } from "zod";

import { authoringCodeLensSchema } from "./code-lens-contracts";
import { authoringCompletionItemSchema } from "./completion-contracts";
import { authoringPositionSchema } from "./positions";

/**
 * Supported protocol methods for authoring protocol test server.
 */
export const authoringProtocolMethodSchema = z.enum([
	"textDocument/didOpen",
	"textDocument/didChange",
	"gooi/pullDiagnostics",
	"textDocument/completion",
	"completionItem/resolve",
	"textDocument/codeLens",
	"codeLens/resolve",
	"textDocument/prepareRename",
	"textDocument/rename",
	"textDocument/hover",
	"textDocument/definition",
	"textDocument/references",
	"workspace/symbol",
]);

/**
 * Protocol request envelope used by authoring protocol handlers.
 */
export const authoringProtocolRequestSchema = z.object({
	id: z.union([z.string().min(1), z.number().int().nonnegative()]).nullable(),
	method: authoringProtocolMethodSchema,
	params: z.unknown(),
});

/**
 * Parsed protocol request.
 */
export type AuthoringProtocolRequest = z.infer<
	typeof authoringProtocolRequestSchema
>;

/**
 * Protocol response envelope used by authoring protocol handlers.
 */
export const authoringProtocolResponseSchema = z.object({
	id: z.union([z.string().min(1), z.number().int().nonnegative()]).nullable(),
	result: z.unknown().optional(),
	error: z
		.object({
			message: z.string().min(1),
		})
		.optional(),
});

/**
 * Parsed protocol response.
 */
export type AuthoringProtocolResponse = z.infer<
	typeof authoringProtocolResponseSchema
>;

/**
 * Protocol params for completion.
 */
export const authoringProtocolCompletionParamsSchema = z.object({
	position: authoringPositionSchema,
});

/**
 * Protocol params for completion resolve.
 */
export const authoringProtocolCompletionResolveParamsSchema = z.object({
	item: authoringCompletionItemSchema,
});

/**
 * Protocol params for code lens resolve.
 */
export const authoringProtocolCodeLensResolveParamsSchema = z.object({
	lens: authoringCodeLensSchema,
});

/**
 * Protocol params for position-based queries.
 */
export const authoringProtocolPositionParamsSchema = z.object({
	position: authoringPositionSchema,
});

/**
 * Protocol params for references.
 */
export const authoringProtocolReferencesParamsSchema =
	authoringProtocolPositionParamsSchema.extend({
		includeDeclaration: z.boolean().optional(),
	});

/**
 * Protocol params for rename.
 */
export const authoringProtocolRenameParamsSchema =
	authoringProtocolPositionParamsSchema.extend({
		newName: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
	});

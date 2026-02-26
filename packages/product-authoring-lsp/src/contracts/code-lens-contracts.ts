import { z } from "zod";

import { authoringParityStateSchema } from "./parity";
import { authoringRangeSchema } from "./positions";
import { authoringReadContextSchema } from "./read-context";

/**
 * Code lens action kinds emitted by authoring action handlers.
 */
export const authoringCodeLensKindSchema = z.enum([
	"run_query_or_mutation",
	"show_providers_for_capability",
	"show_affected_queries_for_signal",
]);

const authoringCodeLensCommandSchema = z.object({
	id: z.string().min(1),
	title: z.string().min(1),
	arguments: z.array(z.unknown()).optional(),
});

/**
 * Code lens payload used by list/resolve handlers.
 */
export const authoringCodeLensSchema = z.object({
	kind: authoringCodeLensKindSchema,
	symbolId: z.string().min(1),
	range: authoringRangeSchema,
	data: z.record(z.string(), z.unknown()).optional(),
	command: authoringCodeLensCommandSchema.optional(),
});

/**
 * Parsed authoring code lens.
 */
export type AuthoringCodeLens = z.infer<typeof authoringCodeLensSchema>;

/**
 * Code lens list request.
 */
export const authoringCodeLensListRequestSchema = z.object({
	context: authoringReadContextSchema,
});

/**
 * Parsed code lens list request.
 */
export type AuthoringCodeLensListRequest = z.infer<
	typeof authoringCodeLensListRequestSchema
>;

/**
 * Code lens resolve request.
 */
export const authoringCodeLensResolveRequestSchema = z.object({
	context: authoringReadContextSchema,
	lens: authoringCodeLensSchema,
});

/**
 * Parsed code lens resolve request.
 */
export type AuthoringCodeLensResolveRequest = z.infer<
	typeof authoringCodeLensResolveRequestSchema
>;

/**
 * Code lens list result.
 */
export const authoringCodeLensListResultSchema = z.object({
	parity: authoringParityStateSchema,
	lenses: z.array(authoringCodeLensSchema),
});

/**
 * Parsed code lens list result.
 */
export type AuthoringCodeLensListResult = z.infer<
	typeof authoringCodeLensListResultSchema
>;

/**
 * Code lens resolve result.
 */
export const authoringCodeLensResolveResultSchema = z.object({
	parity: authoringParityStateSchema,
	lens: authoringCodeLensSchema,
});

/**
 * Parsed code lens resolve result.
 */
export type AuthoringCodeLensResolveResult = z.infer<
	typeof authoringCodeLensResolveResultSchema
>;

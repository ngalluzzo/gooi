import { z } from "zod";

import { authoringPositionSchema, authoringRangeSchema } from "./positions";
import { authoringReadContextSchema } from "./read-context";

/**
 * Symbol location in an authoring document.
 */
export const authoringLocationSchema = z.object({
	documentUri: z.string().min(1),
	documentPath: z.string().min(1),
	range: authoringRangeSchema,
	symbolId: z.string().min(1),
});

/**
 * Parsed authoring symbol location.
 */
export type AuthoringLocation = z.infer<typeof authoringLocationSchema>;

/**
 * Hover payload resolved for one symbol.
 */
export const authoringHoverSchema = z.object({
	symbolId: z.string().min(1),
	contents: z.string().min(1),
	range: authoringRangeSchema,
});

/**
 * Parsed hover payload.
 */
export type AuthoringHover = z.infer<typeof authoringHoverSchema>;

/**
 * Document symbol exposed by `textDocument/documentSymbol`.
 */
export const authoringDocumentSymbolSchema = z.object({
	symbolId: z.string().min(1),
	name: z.string().min(1),
	kind: z.string().min(1),
	range: authoringRangeSchema,
});

/**
 * Parsed document symbol payload.
 */
export type AuthoringDocumentSymbol = z.infer<
	typeof authoringDocumentSymbolSchema
>;

/**
 * Workspace symbol exposed by `workspace/symbol`.
 */
export const authoringWorkspaceSymbolSchema = z.object({
	symbolId: z.string().min(1),
	name: z.string().min(1),
	kind: z.string().min(1),
	documentUri: z.string().min(1),
	documentPath: z.string().min(1),
	range: authoringRangeSchema,
});

/**
 * Parsed workspace symbol payload.
 */
export type AuthoringWorkspaceSymbol = z.infer<
	typeof authoringWorkspaceSymbolSchema
>;

/**
 * Shared request for position-based navigation handlers.
 */
export const authoringNavigationRequestSchema = z.object({
	context: authoringReadContextSchema,
	position: authoringPositionSchema,
});

/**
 * Parsed position-based navigation request.
 */
export type AuthoringNavigationRequest = z.infer<
	typeof authoringNavigationRequestSchema
>;

/**
 * Request for `textDocument/documentSymbol`.
 */
export const authoringDocumentSymbolRequestSchema = z.object({
	context: authoringReadContextSchema,
});

/**
 * Parsed document symbol request.
 */
export type AuthoringDocumentSymbolRequest = z.infer<
	typeof authoringDocumentSymbolRequestSchema
>;

/**
 * References request for `textDocument/references`.
 */
export const authoringReferencesRequestSchema =
	authoringNavigationRequestSchema.extend({
		includeDeclaration: z.boolean().optional(),
	});

/**
 * Parsed references request.
 */
export type AuthoringReferencesRequest = z.infer<
	typeof authoringReferencesRequestSchema
>;

/**
 * Workspace symbol search request.
 */
export const authoringWorkspaceSymbolRequestSchema = z.object({
	context: authoringReadContextSchema,
	query: z.string(),
});

/**
 * Parsed workspace symbol search request.
 */
export type AuthoringWorkspaceSymbolRequest = z.infer<
	typeof authoringWorkspaceSymbolRequestSchema
>;

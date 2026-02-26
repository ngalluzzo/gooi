import { z } from "zod";

import { authoringParityStateSchema } from "./parity";
import { authoringPositionSchema } from "./positions";
import { authoringReadContextSchema } from "./read-context";

/**
 * Completion item kinds produced by Gooi authoring read-path handlers.
 */
export const authoringCompletionItemKindSchema = z.enum([
	"capability",
	"signal",
	"entrypoint",
	"step_binding",
	"expression_variable",
	"ambient_symbol",
]);

const completionItemDataSchema = z.object({
	capabilityId: z.string().min(1).optional(),
	capabilityVersion: z.string().min(1).optional(),
	symbolId: z.string().min(1).optional(),
});

/**
 * One completion item exposed by read-path completion handlers.
 */
export const authoringCompletionItemSchema = z.object({
	label: z.string().min(1),
	kind: authoringCompletionItemKindSchema,
	insertText: z.string().min(1),
	detail: z.string().min(1).optional(),
	documentation: z.string().min(1).optional(),
	deprecated: z.boolean().optional(),
	data: completionItemDataSchema.optional(),
});

/**
 * Parsed completion item.
 */
export type AuthoringCompletionItem = z.infer<
	typeof authoringCompletionItemSchema
>;

/**
 * Completion request contract used by `textDocument/completion` handlers.
 */
export const authoringCompletionRequestSchema = z.object({
	context: authoringReadContextSchema,
	position: authoringPositionSchema,
});

/**
 * Parsed completion request.
 */
export type AuthoringCompletionRequest = z.infer<
	typeof authoringCompletionRequestSchema
>;

/**
 * Completion list result payload.
 */
export const authoringCompletionListSchema = z.object({
	parity: authoringParityStateSchema,
	items: z.array(authoringCompletionItemSchema),
});

/**
 * Parsed completion list result.
 */
export type AuthoringCompletionList = z.infer<
	typeof authoringCompletionListSchema
>;

/**
 * Completion resolve request contract used by `completionItem/resolve` handlers.
 */
export const authoringCompletionResolveRequestSchema = z.object({
	context: authoringReadContextSchema,
	item: authoringCompletionItemSchema,
});

/**
 * Parsed completion resolve request.
 */
export type AuthoringCompletionResolveRequest = z.infer<
	typeof authoringCompletionResolveRequestSchema
>;

/**
 * Completion resolve result payload.
 */
export const authoringCompletionResolveResultSchema = z.object({
	parity: authoringParityStateSchema,
	item: authoringCompletionItemSchema,
});

/**
 * Parsed completion resolve result.
 */
export type AuthoringCompletionResolveResult = z.infer<
	typeof authoringCompletionResolveResultSchema
>;

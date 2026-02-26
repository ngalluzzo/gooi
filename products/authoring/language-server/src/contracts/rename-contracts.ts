import { z } from "zod";

import { authoringParityStateSchema } from "./parity";
import { authoringPositionSchema, authoringRangeSchema } from "./positions";
import { authoringReadContextSchema } from "./read-context";

const renameFailureSchema = z.object({
	code: z.enum(["rename_conflict_error", "authoring_symbol_error"]),
	message: z.string().min(1),
});

const symbolSelectorSchema = z.object({
	symbolId: z.string().min(1),
});

const workspaceEditChangeSchema = z.object({
	documentUri: z.string().min(1),
	documentPath: z.string().min(1),
	symbolId: z.string().min(1),
	range: authoringRangeSchema,
	newText: z.string().min(1),
});

/**
 * Workspace edit payload produced by authoring rename handlers.
 */
export const authoringWorkspaceEditSchema = z.object({
	changes: z.array(workspaceEditChangeSchema),
});

/**
 * Parsed workspace edit payload.
 */
export type AuthoringWorkspaceEdit = z.infer<
	typeof authoringWorkspaceEditSchema
>;

/**
 * Prepare rename request.
 */
export const authoringPrepareRenameRequestSchema = z.object({
	context: authoringReadContextSchema,
	position: authoringPositionSchema,
	symbolRef: symbolSelectorSchema.optional(),
});

/**
 * Parsed prepare rename request.
 */
export type AuthoringPrepareRenameRequest = z.infer<
	typeof authoringPrepareRenameRequestSchema
>;

/**
 * Rename request.
 */
export const authoringRenameRequestSchema = z.object({
	context: authoringReadContextSchema,
	position: authoringPositionSchema,
	newName: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
	symbolRef: symbolSelectorSchema.optional(),
});

/**
 * Parsed rename request.
 */
export type AuthoringRenameRequest = z.infer<
	typeof authoringRenameRequestSchema
>;

/**
 * Prepare rename result.
 */
export const authoringPrepareRenameResultSchema = z.union([
	z.object({
		ok: z.literal(true),
		parity: authoringParityStateSchema,
		symbolId: z.string().min(1),
		placeholder: z.string().min(1),
		range: authoringRangeSchema,
	}),
	z.object({
		ok: z.literal(false),
		parity: authoringParityStateSchema,
		error: renameFailureSchema,
	}),
]);

/**
 * Parsed prepare rename result.
 */
export type AuthoringPrepareRenameResult = z.infer<
	typeof authoringPrepareRenameResultSchema
>;

/**
 * Rename result.
 */
export const authoringRenameResultSchema = z.union([
	z.object({
		ok: z.literal(true),
		parity: authoringParityStateSchema,
		edit: authoringWorkspaceEditSchema,
	}),
	z.object({
		ok: z.literal(false),
		parity: authoringParityStateSchema,
		error: renameFailureSchema,
	}),
]);

/**
 * Parsed rename result.
 */
export type AuthoringRenameResult = z.infer<typeof authoringRenameResultSchema>;

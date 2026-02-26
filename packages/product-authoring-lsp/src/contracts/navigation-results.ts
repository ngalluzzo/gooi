import { z } from "zod";
import {
	authoringDocumentSymbolSchema,
	authoringHoverSchema,
	authoringLocationSchema,
	authoringWorkspaceSymbolSchema,
} from "./navigation-contracts";
import { authoringParityStateSchema } from "./parity";

/**
 * Generic read-path list result wrapper.
 */
export const authoringNavigationListResultSchema = <TSchema extends z.ZodType>(
	itemSchema: TSchema,
) =>
	z.object({
		parity: authoringParityStateSchema,
		items: z.array(itemSchema),
	});

/**
 * Hover read-path result.
 */
export const authoringHoverResultSchema = z.object({
	parity: authoringParityStateSchema,
	hover: authoringHoverSchema.nullable(),
});

/**
 * Parsed hover result.
 */
export type AuthoringHoverResult = z.infer<typeof authoringHoverResultSchema>;

/**
 * Definition read-path result.
 */
export const authoringDefinitionResultSchema = z.object({
	parity: authoringParityStateSchema,
	location: authoringLocationSchema.nullable(),
});

/**
 * Parsed definition result.
 */
export type AuthoringDefinitionResult = z.infer<
	typeof authoringDefinitionResultSchema
>;

/**
 * References read-path result.
 */
export const authoringReferencesResultSchema =
	authoringNavigationListResultSchema(authoringLocationSchema);

/**
 * Parsed references result.
 */
export type AuthoringReferencesResult = z.infer<
	typeof authoringReferencesResultSchema
>;

/**
 * Document symbols read-path result.
 */
export const authoringDocumentSymbolResultSchema =
	authoringNavigationListResultSchema(authoringDocumentSymbolSchema);

/**
 * Parsed document symbols result.
 */
export type AuthoringDocumentSymbolResult = z.infer<
	typeof authoringDocumentSymbolResultSchema
>;

/**
 * Workspace symbols read-path result.
 */
export const authoringWorkspaceSymbolResultSchema =
	authoringNavigationListResultSchema(authoringWorkspaceSymbolSchema);

/**
 * Parsed workspace symbols result.
 */
export type AuthoringWorkspaceSymbolResult = z.infer<
	typeof authoringWorkspaceSymbolResultSchema
>;

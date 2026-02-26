import { z } from "zod";

import { authoringPositionSchema } from "./positions";
import { authoringReadContextSchema } from "./read-context";

/**
 * Document lifecycle event used by authoring sessions.
 */
export const authoringDocumentLifecycleEventSchema = z.object({
	version: z.number().int().nonnegative(),
	documentText: z.string(),
});

/**
 * Parsed document lifecycle event.
 */
export type AuthoringDocumentLifecycleEvent = z.infer<
	typeof authoringDocumentLifecycleEventSchema
>;

/**
 * Session create request.
 */
export const createAuthoringSessionRequestSchema = z.object({
	context: authoringReadContextSchema,
	initialVersion: z.number().int().nonnegative().default(1),
});

/**
 * Parsed session create request.
 */
export type CreateAuthoringSessionRequest = z.infer<
	typeof createAuthoringSessionRequestSchema
>;

/**
 * Completion request routed through session state.
 */
export const authoringSessionCompletionRequestSchema = z.object({
	position: authoringPositionSchema,
});

/**
 * Parsed session completion request.
 */
export type AuthoringSessionCompletionRequest = z.infer<
	typeof authoringSessionCompletionRequestSchema
>;

/**
 * Workspace symbol request routed through session state.
 */
export const authoringSessionWorkspaceSymbolRequestSchema = z.object({
	query: z.string(),
});

/**
 * Parsed session workspace symbol request.
 */
export type AuthoringSessionWorkspaceSymbolRequest = z.infer<
	typeof authoringSessionWorkspaceSymbolRequestSchema
>;

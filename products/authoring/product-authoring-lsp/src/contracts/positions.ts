import { z } from "zod";

/**
 * Zero-based line/character position in a Gooi authoring document.
 */
export const authoringPositionSchema = z.object({
	line: z.number().int().nonnegative(),
	character: z.number().int().nonnegative(),
});

/**
 * Parsed authoring document position.
 */
export type AuthoringPosition = z.infer<typeof authoringPositionSchema>;

/**
 * Range in a Gooi authoring document.
 */
export const authoringRangeSchema = z.object({
	start: authoringPositionSchema,
	end: authoringPositionSchema,
});

/**
 * Parsed authoring document range.
 */
export type AuthoringRange = z.infer<typeof authoringRangeSchema>;

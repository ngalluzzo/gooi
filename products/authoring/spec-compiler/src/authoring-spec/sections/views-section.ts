import { z } from "zod";
import { strictObjectWithExtensions } from "../schema-utils";

const screenDataQuerySchema = strictObjectWithExtensions({
	query: z.string().min(1),
	refresh_on_signals: z.array(z.string().min(1)).optional(),
});

const screenSchema = strictObjectWithExtensions({
	id: z.string().min(1),
	data: z.record(z.string(), screenDataQuerySchema).optional(),
});

const viewNodeSchema = strictObjectWithExtensions({
	id: z.string().min(1),
	type: z.string().min(1),
});

/**
 * `views` section authoring contract.
 */
export const viewsSectionSchema = strictObjectWithExtensions({
	nodes: z.array(viewNodeSchema),
	screens: z.array(screenSchema),
});

/**
 * Parsed `views` section type.
 */
export type ViewsSection = z.infer<typeof viewsSectionSchema>;

import { z } from "zod";
import { strictObjectWithExtensions } from "../schema-utils";

const screenDataQuerySchema = strictObjectWithExtensions({
	/** Identifier of the query entrypoint that populates this data slot when the screen is rendered. Must reference a declared query. */
	query: z.string().min(1),
	/** Optional list of signal IDs that trigger a data refresh for this slot when emitted during a mutation. Must reference declared signals. */
	refresh_on_signals: z.array(z.string().min(1)).optional(),
	/** Optional argument map forwarded to the bound query when this screen slot is resolved. */
	args: z.record(z.string(), z.unknown()).optional(),
});

const screenSchema = strictObjectWithExtensions({
	/** Unique identifier for this screen, referenced by routes and compiled view contracts. */
	id: z.string().min(1),
	/** Optional map of named data slots bound to query entrypoints, keyed by slot name. Each slot is refreshed independently when its signals fire. */
	data: z.record(z.string(), screenDataQuerySchema).optional(),
	/** Optional root node ids rendered for this screen in declared order. */
	root_nodes: z.array(z.string().min(1)).optional(),
});

const viewNodeSchema = strictObjectWithExtensions({
	/** Unique identifier for this view node within the views tree. */
	id: z.string().min(1),
	/** Renderer-registered node type key used by the renderer adapter to resolve the concrete component at runtime. */
	type: z.string().min(1),
	/** Optional node property bag forwarded to render IR for adapter interpretation. */
	props: z.record(z.string(), z.unknown()).optional(),
	/** Optional ordered child node ids rendered beneath this node. */
	children: z.array(z.string().min(1)).optional(),
});

/**
 * `views` section authoring contract.
 */
export const viewsSectionSchema = strictObjectWithExtensions({
	/** Ordered list of reusable view nodes available to screens. Author order is preserved in compiled artifacts. */
	nodes: z.array(viewNodeSchema),
	/** Ordered list of named screen definitions. Author order is preserved in compiled artifacts. Each screen is reachable via a route. */
	screens: z.array(screenSchema),
});

/**
 * Parsed `views` section type.
 */
export type ViewsSection = z.infer<typeof viewsSectionSchema>;

import { z } from "zod";
import { strictObjectWithExtensions } from "../schema-utils";

// Scalar type annotation pattern: lowercase letters and underscores, with an optional `!` suffix
// marking the field as required (non-nullable). Valid base types include: text, id, int, number,
// bool, timestamp. Example: `text`, `id!`, `int`.
const typedFieldSchema = z.string().regex(/^[a-z_]+!?$/);

// Freeform default value map. Keys are input field names; values are any JSON-serializable default.
const defaultsSchema = z.record(z.string(), z.unknown());

const accessSchema = strictObjectWithExtensions({
	/** Non-empty list of role IDs permitted to invoke this entrypoint. At least one role must be declared. */
	roles: z.array(z.string().min(1)).min(1),
});

/**
 * `queries` section item schema.
 */
export const querySchema = strictObjectWithExtensions({
	/** Unique identifier for this query entrypoint, referenced in wiring bind maps and compiled artifacts. */
	id: z.string().min(1),
	/** Role-based access control policy for this query. */
	access: accessSchema,
	/** Optional filter expression evaluated against caller session or principal context before execution. Shape is deferred to the section compiler. */
	where: z.unknown().optional(),
	/** Typed input field map. Each key is a field name; each value is a scalar type annotation (e.g., `text`, `id!`, `int`). */
	in: z.record(z.string(), typedFieldSchema),
	/** Optional default values applied to input fields when the caller omits them. Defaults are applied before validation. */
	defaults: defaultsSchema.optional(),
	/** Named output field map returned by this query. Shape is deferred to the section compiler. */
	returns: z.record(z.string(), z.unknown()),
});

/**
 * `mutations` section item schema.
 */
export const mutationSchema = strictObjectWithExtensions({
	/** Unique identifier for this mutation entrypoint, referenced in wiring bind maps and compiled artifacts. */
	id: z.string().min(1),
	/** Role-based access control policy for this mutation. */
	access: accessSchema,
	/** Typed input field map. Each key is a field name; each value is a scalar type annotation (e.g., `text`, `id!`, `int`). */
	in: z.record(z.string(), typedFieldSchema),
	/** The domain action this mutation delegates to, including its input binding map. */
	run: strictObjectWithExtensions({
		/** Identifier of the domain action to execute when this mutation is invoked. Must reference a declared action in the `domain` section. */
		actionId: z.string().min(1),
		/** Static or dynamic input binding map forwarded to the action at runtime. Keys are action input field names; values are binding expressions or literals. */
		input: z.record(z.string(), z.unknown()),
	}),
});

/**
 * `routes` section item schema.
 */
export const routeSchema = strictObjectWithExtensions({
	/** Unique identifier for this route entrypoint, used in wiring bind maps and compiled navigation contracts. */
	id: z.string().min(1),
	/** Role-based access control policy for this route. */
	access: accessSchema,
	/** Optional typed path or query parameter map for this route. Each key is a parameter name; each value is a scalar type annotation. */
	in: z.record(z.string(), typedFieldSchema).optional(),
	/** Optional default values for route input parameters when not provided by the surface. Defaults are applied before validation. */
	defaults: defaultsSchema.optional(),
	/** Identifier of the view screen this route renders when dispatched. Must reference a declared screen in the `views` section. */
	renders: z.string().min(1),
});

import { z } from "zod";

const typedFieldSchema = z.string().regex(/^[a-z_]+!?$/);
const defaultsSchema = z.record(z.string(), z.unknown());
const bindMapSchema = z.record(z.string(), z.string().min(1));

const accessSchema = z.object({
	roles: z.array(z.string().min(1)).min(1),
});

const querySchema = z.object({
	id: z.string().min(1),
	access: accessSchema,
	in: z.record(z.string(), typedFieldSchema),
	defaults: defaultsSchema.optional(),
	returns: z.record(z.string(), z.unknown()),
});

const mutationSchema = z.object({
	id: z.string().min(1),
	access: accessSchema,
	in: z.record(z.string(), typedFieldSchema),
	run: z.object({
		actionId: z.string().min(1),
		input: z.record(z.string(), z.unknown()),
	}),
});

const wiredQuerySchema = z.object({
	bind: bindMapSchema,
});

const wiredMutationSchema = z.object({
	bind: bindMapSchema,
});

const surfaceSchema = z
	.object({
		queries: z.record(z.string(), wiredQuerySchema).optional(),
		mutations: z.record(z.string(), wiredMutationSchema).optional(),
	})
	.catchall(z.unknown());

const screenDataQuerySchema = z.object({
	query: z.string().min(1),
	refresh_on_signals: z.array(z.string().min(1)).optional(),
});

const screenSchema = z.object({
	id: z.string().min(1),
	data: z.record(z.string(), screenDataQuerySchema).optional(),
});

/**
 * Authoring spec subset accepted by RFC-0002 phase 1 compiler.
 */
export const authoringEntrypointSpecSchema = z.object({
	access: z.object({
		default_policy: z.enum(["allow", "deny"]),
		roles: z.record(z.string(), z.unknown()),
	}),
	queries: z.array(querySchema),
	mutations: z.array(mutationSchema),
	wiring: z.object({
		surfaces: z.record(z.string(), surfaceSchema),
	}),
	views: z
		.object({
			screens: z.array(screenSchema),
		})
		.optional(),
});

/**
 * Parsed authoring spec type used by compilation helpers.
 */
export type AuthoringEntrypointSpec = z.infer<
	typeof authoringEntrypointSpecSchema
>;

/**
 * Parses and validates authoring spec input.
 *
 * @param value - Untrusted authoring spec input.
 * @returns Parsed authoring spec subset.
 *
 * @example
 * const parsed = parseAuthoringEntrypointSpec(rawSpec);
 */
export const parseAuthoringEntrypointSpec = (
	value: unknown,
): AuthoringEntrypointSpec => authoringEntrypointSpecSchema.parse(value);

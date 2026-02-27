import { z } from "zod";
import { strictObjectWithExtensions } from "../schema-utils";

const typedFieldSchema = z.string().regex(/^[a-z_]+!?$/);
const defaultsSchema = z.record(z.string(), z.unknown());

const accessSchema = strictObjectWithExtensions({
	roles: z.array(z.string().min(1)).min(1),
});

/**
 * `queries` section item schema.
 */
export const querySchema = strictObjectWithExtensions({
	id: z.string().min(1),
	access: accessSchema,
	where: z.unknown().optional(),
	in: z.record(z.string(), typedFieldSchema),
	defaults: defaultsSchema.optional(),
	returns: z.record(z.string(), z.unknown()),
});

/**
 * `mutations` section item schema.
 */
export const mutationSchema = strictObjectWithExtensions({
	id: z.string().min(1),
	access: accessSchema,
	in: z.record(z.string(), typedFieldSchema),
	run: strictObjectWithExtensions({
		actionId: z.string().min(1),
		input: z.record(z.string(), z.unknown()),
	}),
});

/**
 * `routes` section item schema.
 */
export const routeSchema = strictObjectWithExtensions({
	id: z.string().min(1),
	access: accessSchema,
	in: z.record(z.string(), typedFieldSchema).optional(),
	defaults: defaultsSchema.optional(),
	renders: z.string().min(1),
});

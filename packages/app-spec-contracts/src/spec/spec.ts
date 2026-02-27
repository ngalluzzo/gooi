import { z } from "zod";

/**
 * Canonical app-spec contract version.
 */
export const gooiAppSpecVersionSchema = z.literal("1.0.0");

/**
 * Minimal scaffold schema; expanded in follow-up migration.
 */
export const gooiAppSpecSchema = z.object({
	app: z.object({
		id: z.string().min(1),
	}),
});

/**
 * Parsed app-spec contract.
 */
export type GooiAppSpec = z.infer<typeof gooiAppSpecSchema>;

/**
 * Parses and validates one app-spec payload.
 */
export const parseGooiAppSpec = (value: unknown): GooiAppSpec =>
	gooiAppSpecSchema.parse(value);

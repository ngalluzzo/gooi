import { z } from "zod";
import { dispatchMatcherSchema } from "./matchers";
import { compiledDispatchTargetSchema } from "./target";

/**
 * Runtime schema for one compiled dispatch handler.
 */
export const compiledDispatchHandlerSchema = z
	.object({
		handlerId: z.string().min(1),
		surfaceId: z.string().min(1),
		matcher: dispatchMatcherSchema,
		specificity: z.number().int().nonnegative(),
		target: compiledDispatchTargetSchema,
	})
	.strict();

/**
 * One canonical dispatch handler.
 */
export type CompiledDispatchHandler = z.infer<
	typeof compiledDispatchHandlerSchema
>;

/**
 * Runtime schema for one surface dispatch plan.
 */
export const compiledSurfaceDispatchPlanSchema = z
	.object({
		surfaceId: z.string().min(1),
		handlers: z.array(compiledDispatchHandlerSchema),
	})
	.strict();

/**
 * One canonical per-surface dispatch plan.
 */
export type CompiledSurfaceDispatchPlan = z.infer<
	typeof compiledSurfaceDispatchPlanSchema
>;

/**
 * Version identifier for compiled surface dispatch plans.
 */
export const compiledSurfaceDispatchPlanVersionSchema = z.literal("1.0.0");

/**
 * Version identifier of compiled surface dispatch plans.
 */
export type CompiledSurfaceDispatchPlanVersion = z.infer<
	typeof compiledSurfaceDispatchPlanVersionSchema
>;

/**
 * Runtime schema for all compiled surface dispatch plans.
 */
export const compiledSurfaceDispatchPlanSetSchema = z
	.object({
		artifactVersion: compiledSurfaceDispatchPlanVersionSchema,
		plans: z.record(z.string(), compiledSurfaceDispatchPlanSchema),
	})
	.strict();

/**
 * Canonical compiled dispatch plans keyed by surface id.
 */
export type CompiledSurfaceDispatchPlanSet = z.infer<
	typeof compiledSurfaceDispatchPlanSetSchema
>;

/**
 * Parses one untrusted compiled dispatch plan set.
 */
export const parseCompiledSurfaceDispatchPlanSet = (
	value: unknown,
): CompiledSurfaceDispatchPlanSet =>
	compiledSurfaceDispatchPlanSetSchema.parse(value);

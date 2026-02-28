import { z } from "zod";
import { surfaceBindMapSchema } from "../../binding/contracts";

/**
 * Entrypoint kinds that can be selected by dispatch.
 */
export const dispatchEntrypointKindSchema = z.enum([
	"query",
	"mutation",
	"route",
]);

/**
 * Entrypoint kind selected by one dispatch handler.
 */
export type DispatchEntrypointKind = z.infer<
	typeof dispatchEntrypointKindSchema
>;

/**
 * Runtime schema for one dispatch target.
 */
export const compiledDispatchTargetSchema = z
	.object({
		entrypointKind: dispatchEntrypointKindSchema,
		entrypointId: z.string().min(1),
		fieldBindings: surfaceBindMapSchema,
	})
	.strict();

/**
 * One canonical dispatch target.
 */
export type CompiledDispatchTarget = z.infer<
	typeof compiledDispatchTargetSchema
>;

import { z } from "zod";

/**
 * Command payload for runtime-backed entrypoint execution.
 */
export const runEntrypointCommandPayloadSchema = z.object({
	symbolId: z.string().min(1),
});

/**
 * Command payload for provider visibility lookups.
 */
export const showProvidersCommandPayloadSchema = z.object({
	capabilityId: z.string().min(1),
});

/**
 * Command payload for signal impact lookups.
 */
export const showAffectedQueriesCommandPayloadSchema = z.object({
	signalSymbolId: z.string().min(1),
	querySymbolIds: z.array(z.string().min(1)),
});

/**
 * Command payload for lockfile mismatch warnings.
 */
export const lockfileMismatchCommandPayloadSchema = z.object({
	symbolId: z.string().min(1),
});

/**
 * Parses the first command argument against the provided schema.
 *
 * @param schema - Payload schema for the command.
 * @param args - Raw command argument array.
 * @returns Parsed payload object.
 *
 * @example
 * const payload = parseFirstCommandArgument(runEntrypointCommandPayloadSchema, [{ symbolId: "entrypoint:home" }]);
 */
export const parseFirstCommandArgument = <TSchema extends z.ZodType>(
	schema: TSchema,
	args: readonly unknown[],
): z.infer<TSchema> => schema.parse(args[0] ?? {});

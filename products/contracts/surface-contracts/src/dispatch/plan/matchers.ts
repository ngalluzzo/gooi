import { jsonValueSchema } from "@gooi/contract-primitives/json";
import { z } from "zod";

/**
 * Supported dispatch clause operators.
 */
export const dispatchClauseOperatorSchema = z.enum([
	"eq",
	"path_template",
	"prefix",
	"exists",
]);

/**
 * One matcher clause operation.
 */
export type DispatchClauseOperator = z.infer<
	typeof dispatchClauseOperatorSchema
>;

/**
 * Runtime schema for one dispatch matcher clause.
 */
export const dispatchClauseSchema = z
	.object({
		key: z.string().min(1),
		op: dispatchClauseOperatorSchema,
		value: jsonValueSchema.optional(),
	})
	.strict()
	.superRefine((value, context) => {
		if (value.op === "exists") {
			return;
		}
		if (value.value !== undefined) {
			return;
		}
		context.addIssue({
			code: "custom",
			message: `Dispatch clause operator \`${value.op}\` requires a value.`,
			path: ["value"],
		});
	});

/**
 * One matcher clause.
 */
export type DispatchClause = z.infer<typeof dispatchClauseSchema>;

/**
 * Runtime schema for one surface-agnostic dispatch matcher.
 */
export const dispatchMatcherSchema = z
	.object({
		surfaceType: z.string().min(1),
		clauses: z.array(dispatchClauseSchema).min(1),
		priorityBias: z.number().int().optional(),
	})
	.strict();

/**
 * One dispatch matcher variant.
 */
export type DispatchMatcher = z.infer<typeof dispatchMatcherSchema>;

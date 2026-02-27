import { z } from "zod";

const extensionKeyPrefix = "x-";

/**
 * Builds an object schema that rejects unknown keys unless they use `x-*`.
 *
 * @param shape - Declared object shape.
 * @returns Zod schema with extension-key enforcement.
 */
export const strictObjectWithExtensions = <TShape extends z.ZodRawShape>(
	shape: TShape,
) => {
	const allowedKeys = new Set(Object.keys(shape));
	return z
		.object(shape)
		.catchall(z.unknown())
		.superRefine((value, context) => {
			for (const key of Object.keys(value)) {
				if (allowedKeys.has(key) || key.startsWith(extensionKeyPrefix)) {
					continue;
				}
				context.addIssue({
					code: "custom",
					message: `Unknown key \`${key}\` is not allowed.`,
					path: [key],
					params: {
						diagnosticCode: "spec_unknown_key_error",
					},
				});
			}
		});
};

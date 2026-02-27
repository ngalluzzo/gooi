/**
 * Compile-time exhaustiveness helper.
 */
export const assertNever = (value: never): never => {
	throw new Error(`Unexpected projection strategy variant: ${String(value)}`);
};

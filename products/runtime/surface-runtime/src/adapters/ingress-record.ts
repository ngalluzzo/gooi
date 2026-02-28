export const asRecord = (
	value: unknown,
): Readonly<Record<string, unknown>> | undefined => {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return undefined;
	}
	return value as Readonly<Record<string, unknown>>;
};

export const asString = (value: unknown): string | undefined =>
	typeof value === "string" ? value : undefined;

export const asTrimmedString = (value: unknown): string | undefined => {
	const parsed = asString(value)?.trim();
	return parsed === undefined || parsed.length === 0 ? undefined : parsed;
};

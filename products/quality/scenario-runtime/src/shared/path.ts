const unsafePathSegments = new Set(["__proto__", "prototype", "constructor"]);

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
	typeof value === "object" && value !== null;

export const readPathValue = (
	input: Readonly<Record<string, unknown>>,
	path: string,
): unknown => {
	const segments = path.split(".").filter((segment) => segment.length > 0);
	if (
		segments.length === 0 ||
		segments.some((segment) => unsafePathSegments.has(segment))
	) {
		return undefined;
	}

	let cursor: unknown = input;
	for (const segment of segments) {
		if (!isRecord(cursor)) {
			return undefined;
		}
		const descriptor = Object.getOwnPropertyDescriptor(cursor, segment);
		if (descriptor === undefined) {
			return undefined;
		}
		cursor = descriptor.value;
	}
	return cursor;
};

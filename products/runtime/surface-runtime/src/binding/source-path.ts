import type { SurfaceRequestPayload } from "@gooi/surface-contracts/request";

/**
 * Reads one value from a bucketed request payload path (`query.page`, `body.id`, etc.).
 */
export const readSourceValue = (
	request: SurfaceRequestPayload,
	sourcePath: string,
): unknown => {
	const [bucket, ...segments] = sourcePath.split(".");
	if (bucket === undefined || segments.length === 0) {
		return undefined;
	}

	const root = request[bucket as keyof SurfaceRequestPayload];
	if (root === undefined) {
		return undefined;
	}

	let cursor: unknown = root;
	for (const segment of segments) {
		if (cursor === null || typeof cursor !== "object") {
			return undefined;
		}
		const record = cursor as Readonly<Record<string, unknown>>;
		cursor = record[segment];
	}

	return cursor;
};

import type { SurfaceRequestPayload } from "../bind/contracts";

/**
 * Reads a value from a dotted source path (for example `query.page`).
 *
 * @param request - Native request payload buckets.
 * @param sourcePath - Dotted source path.
 * @returns Resolved value or undefined when path does not exist.
 *
 * @example
 * const value = readSourceValue(request, "body.message");
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

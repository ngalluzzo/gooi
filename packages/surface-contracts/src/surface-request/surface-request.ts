import { z } from "zod";

const requestBucketSchema = z.record(z.string(), z.unknown());

/**
 * Runtime schema for native surface request payload buckets.
 */
export const surfaceRequestPayloadSchema = z
	.object({
		path: requestBucketSchema.optional(),
		query: requestBucketSchema.optional(),
		body: requestBucketSchema.optional(),
		args: requestBucketSchema.optional(),
		flags: requestBucketSchema.optional(),
	})
	.strict();

/**
 * Native surface request payload buckets consumed by binding contracts.
 */
export type SurfaceRequestPayload = z.infer<typeof surfaceRequestPayloadSchema>;

/**
 * Parses one untrusted surface request payload.
 */
export const parseSurfaceRequestPayload = (
	value: unknown,
): SurfaceRequestPayload => surfaceRequestPayloadSchema.parse(value);

/**
 * Canonical request contract API.
 */
import {
	parseSurfaceRequestPayload,
	surfaceRequestPayloadSchema,
} from "./request";

export { parseSurfaceRequestPayload, surfaceRequestPayloadSchema };
export type { SurfaceRequestPayload } from "./request";

export const request = Object.freeze({
	surfaceRequestPayloadSchema,
	parseSurfaceRequestPayload,
});

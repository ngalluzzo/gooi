/**
 * Canonical boundary contract API.
 */
import * as projection_result_envelope from "./projection-result-envelope";

export type {
	ProjectionGuardMeta,
	ProjectionPageMeta,
	ProjectionResultEnvelope,
	ProjectionResultMeta,
	ProjectionTimelineMeta,
} from "./projection-result-envelope";

export const envelopesContracts = Object.freeze({
	projectionResultEnvelopeVersion:
		projection_result_envelope.projectionResultEnvelopeVersion,
});

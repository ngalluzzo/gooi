/**
 * Canonical envelope contract API.
 */
import {
	parseSurfaceEnvelopeVersion,
	surfaceEnvelopeVersion,
	surfaceEnvelopeVersionSchema,
} from "./envelope-version";
import {
	invocationEnvelopeSchema,
	parseInvocationEnvelope,
} from "./invocation-envelope";
import {
	parseResultEnvelope,
	parseTypedErrorEnvelope,
	resultEnvelopeSchema,
	typedErrorEnvelopeSchema,
} from "./result-envelope";
import {
	parseRefreshTrigger,
	parseSignalEnvelope,
	refreshTriggerSchema,
	signalEnvelopeSchema,
} from "./signal-envelope";

export {
	invocationEnvelopeSchema,
	parseInvocationEnvelope,
	parseRefreshTrigger,
	parseResultEnvelope,
	parseSignalEnvelope,
	parseSurfaceEnvelopeVersion,
	parseTypedErrorEnvelope,
	refreshTriggerSchema,
	resultEnvelopeSchema,
	signalEnvelopeSchema,
	surfaceEnvelopeVersion,
	surfaceEnvelopeVersionSchema,
	typedErrorEnvelopeSchema,
};
export type { SurfaceEnvelopeVersion } from "./envelope-version";
export type { InvocationEnvelope } from "./invocation-envelope";
export type { ResultEnvelope, TypedErrorEnvelope } from "./result-envelope";
export type { RefreshTrigger, SignalEnvelope } from "./signal-envelope";

export const envelope = Object.freeze({
	surfaceEnvelopeVersion,
	surfaceEnvelopeVersionSchema,
	parseSurfaceEnvelopeVersion,
	invocationEnvelopeSchema,
	parseInvocationEnvelope,
	typedErrorEnvelopeSchema,
	resultEnvelopeSchema,
	parseTypedErrorEnvelope,
	parseResultEnvelope,
	signalEnvelopeSchema,
	parseSignalEnvelope,
	refreshTriggerSchema,
	parseRefreshTrigger,
});

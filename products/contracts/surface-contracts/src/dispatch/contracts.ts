/**
 * Canonical dispatch contract API.
 */
import {
	dispatchErrorCodeSchema,
	dispatchErrorSchema,
	parseDispatchError,
} from "./error/contracts";
import {
	dispatchClauseOperatorSchema,
	dispatchClauseSchema,
	dispatchMatcherSchema,
} from "./plan/matchers";
import {
	compiledDispatchHandlerSchema,
	compiledSurfaceDispatchPlanSchema,
	compiledSurfaceDispatchPlanSetSchema,
	compiledSurfaceDispatchPlanVersionSchema,
	parseCompiledSurfaceDispatchPlanSet,
} from "./plan/plans";
import { dispatchRequestSchema, parseDispatchRequest } from "./plan/request";
import {
	compiledDispatchTargetSchema,
	dispatchEntrypointKindSchema,
} from "./plan/target";
import {
	dispatchTraceDecisionSchema,
	dispatchTraceEnvelopeSchema,
	dispatchTraceStepSchema,
	parseDispatchTraceEnvelope,
} from "./trace/dispatch-trace";

export {
	compiledDispatchHandlerSchema,
	compiledDispatchTargetSchema,
	compiledSurfaceDispatchPlanSchema,
	compiledSurfaceDispatchPlanSetSchema,
	compiledSurfaceDispatchPlanVersionSchema,
	dispatchClauseOperatorSchema,
	dispatchClauseSchema,
	dispatchEntrypointKindSchema,
	dispatchErrorCodeSchema,
	dispatchErrorSchema,
	dispatchMatcherSchema,
	dispatchRequestSchema,
	dispatchTraceDecisionSchema,
	dispatchTraceEnvelopeSchema,
	dispatchTraceStepSchema,
	parseCompiledSurfaceDispatchPlanSet,
	parseDispatchError,
	parseDispatchRequest,
	parseDispatchTraceEnvelope,
};
export type { DispatchError, DispatchErrorCode } from "./error/contracts";
export type {
	DispatchClause,
	DispatchClauseOperator,
	DispatchMatcher,
} from "./plan/matchers";
export type {
	CompiledDispatchHandler,
	CompiledSurfaceDispatchPlan,
	CompiledSurfaceDispatchPlanSet,
	CompiledSurfaceDispatchPlanVersion,
} from "./plan/plans";
export type { DispatchRequest } from "./plan/request";
export type {
	CompiledDispatchTarget,
	DispatchEntrypointKind,
} from "./plan/target";
export type {
	DispatchTraceDecision,
	DispatchTraceEnvelope,
	DispatchTraceStep,
} from "./trace/dispatch-trace";

export const dispatch = Object.freeze({
	dispatchClauseOperatorSchema,
	dispatchClauseSchema,
	dispatchMatcherSchema,
	compiledDispatchHandlerSchema,
	compiledSurfaceDispatchPlanSchema,
	compiledSurfaceDispatchPlanVersionSchema,
	compiledSurfaceDispatchPlanSetSchema,
	parseCompiledSurfaceDispatchPlanSet,
	dispatchEntrypointKindSchema,
	compiledDispatchTargetSchema,
	dispatchErrorCodeSchema,
	dispatchErrorSchema,
	parseDispatchError,
	dispatchTraceDecisionSchema,
	dispatchTraceStepSchema,
	dispatchTraceEnvelopeSchema,
	parseDispatchTraceEnvelope,
	dispatchRequestSchema,
	parseDispatchRequest,
});

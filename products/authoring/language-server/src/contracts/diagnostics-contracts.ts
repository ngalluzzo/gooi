import { z } from "zod";

import { authoringReadContextSchema } from "./read-context";

/**
 * Diagnostics request contract for authoring read-path diagnostics generation.
 */
export const authoringDiagnosticsRequestSchema = z.object({
	context: authoringReadContextSchema,
	generatedAt: z.string().datetime().optional(),
});

/**
 * Reachability/delegation diagnostic codes.
 */
export const authoringReachabilityDiagnosticCodeSchema = z.enum([
	"reachability_mode_invalid",
	"reachability_capability_unknown",
	"reachability_capability_version_unknown",
	"reachability_delegate_route_unknown",
	"reachability_requirement_ambiguous",
]);

/**
 * Guard/scenario diagnostic codes.
 */
export const authoringGuardScenarioDiagnosticCodeSchema = z.enum([
	"guard_signal_unknown",
	"guard_flow_unknown",
	"guard_policy_invalid",
	"invariant_policy_invalid",
	"scenario_persona_unknown",
	"scenario_reference_unknown",
	"scenario_capture_source_invalid",
	"scenario_capture_path_invalid",
]);

/**
 * Parsed reachability/delegation diagnostic code.
 */
export type AuthoringReachabilityDiagnosticCode = z.infer<
	typeof authoringReachabilityDiagnosticCodeSchema
>;

/**
 * Parsed guard/scenario diagnostic code.
 */
export type AuthoringGuardScenarioDiagnosticCode = z.infer<
	typeof authoringGuardScenarioDiagnosticCodeSchema
>;

/**
 * Contract references used by reachability quick-fix payloads.
 */
export const reachabilityQuickFixContractRefs = Object.freeze({
	resolverInput: "CapabilityReachabilityRequirement@1.0.0",
	runtimeResolution: "CapabilityBindingResolution@1.0.0",
});

/**
 * Parsed diagnostics request.
 */
export type AuthoringDiagnosticsRequest = z.infer<
	typeof authoringDiagnosticsRequestSchema
>;

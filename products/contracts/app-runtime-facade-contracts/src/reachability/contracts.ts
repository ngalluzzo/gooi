/**
 * Canonical boundary contract API.
 */

import type {
	AppRuntimeBindingPlan,
	AppRuntimeBindingRequirements,
	AppRuntimeBindingResolution,
	AppRuntimeReachabilityOutcome,
	AppRuntimeReachabilityQuery,
} from "./reachability";
import * as reachability from "./reachability";

export type {
	AppRuntimeBindingPlan,
	AppRuntimeBindingRequirements,
	AppRuntimeBindingResolution,
	AppRuntimeReachabilityOutcome,
	AppRuntimeReachabilityQuery,
};

export const reachabilityContracts = Object.freeze({
	getCapabilityBindingResolution: reachability.getCapabilityBindingResolution,
});

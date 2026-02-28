import type {
	AppRuntime,
	AppRuntimeReachabilityOutcome,
	AppRuntimeReachabilityQuery,
} from "@gooi/app-runtime-facade-contracts/create";

export const getRuntimeReachability = (input: {
	readonly runtime: AppRuntime;
	readonly query: AppRuntimeReachabilityQuery;
}): AppRuntimeReachabilityOutcome =>
	input.runtime.describeReachability(input.query);

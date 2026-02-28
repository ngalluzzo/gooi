import type { ExecutionHost } from "@gooi/marketplace-contracts/binding-plan";

export interface AppRuntimeReachabilityQuery {
	readonly portId: string;
	readonly portVersion: string;
}

export type AppRuntimeReachabilityOutcome =
	| {
			readonly portId: string;
			readonly portVersion: string;
			readonly mode: "local";
			readonly source: "requirements" | "binding_plan";
			readonly targetHost?: ExecutionHost;
			readonly providerId?: string;
	  }
	| {
			readonly portId: string;
			readonly portVersion: string;
			readonly mode: "delegated";
			readonly source: "requirements" | "binding_plan";
			readonly targetHost?: ExecutionHost;
			readonly providerId?: string;
			readonly delegateRouteId?: string;
			readonly delegateRouteRequired: boolean;
	  }
	| {
			readonly portId: string;
			readonly portVersion: string;
			readonly mode: "unreachable";
			readonly source: "requirements" | "binding_plan";
			readonly reason?: string;
	  };

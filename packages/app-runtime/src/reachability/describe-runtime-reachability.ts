import type {
	AppRuntimeReachabilityOutcome,
	AppRuntimeReachabilityQuery,
} from "@gooi/app-runtime-facade-contracts/reachability";
import type { CompiledBindingRequirements } from "@gooi/app-spec-contracts/compiled";
import {
	type BindingPlan,
	bindingPlanContracts,
} from "@gooi/marketplace-contracts/binding-plan";

const requirementKey = (query: AppRuntimeReachabilityQuery): string =>
	`${query.portId}@${query.portVersion}`;

export const describeRuntimeReachability = (input: {
	readonly requirements: CompiledBindingRequirements;
	readonly query: AppRuntimeReachabilityQuery;
	readonly bindingPlan?: BindingPlan;
}): AppRuntimeReachabilityOutcome => {
	const requirement =
		input.requirements.requirements[requirementKey(input.query)];
	if (requirement === undefined) {
		return {
			portId: input.query.portId,
			portVersion: input.query.portVersion,
			mode: "unreachable",
			source: "requirements",
			reason: "missing_requirement",
		};
	}

	const resolution =
		input.bindingPlan === undefined
			? null
			: bindingPlanContracts.getCapabilityBindingResolution(
					input.bindingPlan,
					input.query.portId,
					input.query.portVersion,
				);
	if (resolution === null) {
		if (requirement.mode === "delegated") {
			return {
				portId: input.query.portId,
				portVersion: input.query.portVersion,
				mode: "delegated",
				source: "requirements",
				delegateRouteRequired: true,
			};
		}
		if (requirement.mode === "local") {
			return {
				portId: input.query.portId,
				portVersion: input.query.portVersion,
				mode: "local",
				source: "requirements",
			};
		}
		return {
			portId: input.query.portId,
			portVersion: input.query.portVersion,
			mode: "unreachable",
			source: "requirements",
			reason: "requirement_unreachable",
		};
	}

	if (resolution.mode === "delegated") {
		return {
			portId: input.query.portId,
			portVersion: input.query.portVersion,
			mode: "delegated",
			source: "binding_plan",
			targetHost: resolution.targetHost,
			providerId: resolution.providerId,
			delegateRouteId: resolution.delegateRouteId,
			delegateRouteRequired: false,
		};
	}
	if (resolution.mode === "local") {
		return {
			portId: input.query.portId,
			portVersion: input.query.portVersion,
			mode: "local",
			source: "binding_plan",
			targetHost: resolution.targetHost,
			providerId: resolution.providerId,
		};
	}
	return {
		portId: input.query.portId,
		portVersion: input.query.portVersion,
		mode: "unreachable",
		source: "binding_plan",
		...(resolution.reason === undefined ? {} : { reason: resolution.reason }),
	};
};

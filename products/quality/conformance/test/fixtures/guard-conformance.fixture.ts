import type {
	CompiledGuardDefinition,
	CompiledInvariantDefinition,
} from "@gooi/guard-contracts/plans/guard-plan";
import { evaluateGuard, evaluateInvariant } from "@gooi/guard-runtime/evaluate";
import { evaluateGuardConformanceBoundaryMatrix } from "./guard-conformance/domain-runtime-conformance.fixture";
import {
	actionGuard,
	collectionInvariant,
	flowGuard,
	projectionGuard,
	signalGuard,
} from "./guard-conformance/guard-definitions.fixture";

export const createGuardConformanceFixture = () => ({
	collectionInvariant,
	actionGuard,
	signalGuard,
	flowGuard,
	projectionGuard,
	evaluateInvariant,
	evaluateGuard,
	evaluateBoundaryMatrix: async (input: {
		readonly collectionInvariant: CompiledInvariantDefinition;
		readonly actionGuard: CompiledGuardDefinition;
		readonly signalGuard: CompiledGuardDefinition;
		readonly flowGuard: CompiledGuardDefinition;
		readonly projectionGuard: CompiledInvariantDefinition;
	}) =>
		evaluateGuardConformanceBoundaryMatrix({
			collectionInvariant: input.collectionInvariant,
			actionGuard: input.actionGuard,
			signalGuard: input.signalGuard,
			flowGuard: input.flowGuard,
			projectionGuard: input.projectionGuard,
		}),
});

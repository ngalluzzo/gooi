import type { KernelSemanticRuntimePort } from "@gooi/kernel-contracts/semantic-engine";
import { areDomainMutationEnvelopesComparable } from "../execution-core/envelopes";
import {
	executeDomainMutationCore,
	prepareDomainMutation,
} from "../mutation-path/run-mutation-core";
import { runMutationPath } from "../mutation-path/run-mutation-path";
import { runQueryPath } from "../query-path/run-query-path";
import {
	type CreateDomainRuntimeInput,
	type DomainRuntimeConformanceHarness,
	mapActionResolveFailureToCore,
	mapActionResolveFailureToPreparation,
	mapMutationEnvelopeToDomainResult,
	mapQueryEnvelopeToDomainResult,
	resolveMutationAction,
	toQueryExecution,
	toRunMutationInput,
	toRuntimeExecutionInput,
} from "./runtime-internals";

export type { CreateDomainRuntimeInput, DomainRuntimeConformanceHarness };

/**
 * Creates the domain semantic engine with envelope-level diagnostics hooks.
 */
export const createDomainRuntimeConformanceHarness = (
	input: CreateDomainRuntimeInput,
): DomainRuntimeConformanceHarness => {
	const executeMutationEnvelope: DomainRuntimeConformanceHarness["executeMutationEnvelope"] =
		async (execution) => {
			const resolved = resolveMutationAction({
				mutationEntrypointActionMap: input.mutationEntrypointActionMap,
				actions: input.actions,
				execution,
			});
			if (!resolved.ok) {
				return resolved.envelope;
			}

			return runMutationPath(
				toRunMutationInput(
					execution,
					resolved.action,
					input.guards,
					input.capabilities,
				),
			);
		};

	const executeQueryEnvelope: DomainRuntimeConformanceHarness["executeQueryEnvelope"] =
		async (execution) =>
			runQueryPath({
				execution: toQueryExecution(execution),
				...(input.queries === undefined ? {} : { queries: input.queries }),
			});

	const semanticRuntime: KernelSemanticRuntimePort = {
		executeQuery: async (queryInput) =>
			mapQueryEnvelopeToDomainResult(
				await executeQueryEnvelope(toRuntimeExecutionInput(queryInput)),
			),
		executeMutation: async (mutationInput) =>
			mapMutationEnvelopeToDomainResult(
				await executeMutationEnvelope(toRuntimeExecutionInput(mutationInput)),
			),
		prepareMutation: async (mutationInput) => {
			const execution = toRuntimeExecutionInput(mutationInput);
			const resolved = resolveMutationAction({
				mutationEntrypointActionMap: input.mutationEntrypointActionMap,
				actions: input.actions,
				execution,
			});
			if (!resolved.ok) {
				return mapActionResolveFailureToPreparation(resolved.envelope);
			}
			return prepareDomainMutation(
				toRunMutationInput(
					execution,
					resolved.action,
					input.guards,
					input.capabilities,
				),
			);
		},
		executeMutationCore: async (mutationInput) => {
			const execution = toRuntimeExecutionInput(mutationInput);
			const resolved = resolveMutationAction({
				mutationEntrypointActionMap: input.mutationEntrypointActionMap,
				actions: input.actions,
				execution,
			});
			if (!resolved.ok) {
				return mapActionResolveFailureToCore(resolved.envelope);
			}
			return executeDomainMutationCore(
				toRunMutationInput(
					execution,
					resolved.action,
					input.guards,
					input.capabilities,
				),
			);
		},
	};

	return {
		semanticRuntime,
		executeMutationEnvelope,
		executeQueryEnvelope,
		areComparable: areDomainMutationEnvelopesComparable,
	};
};

export type DomainRuntime = KernelSemanticRuntimePort;

/**
 * Creates the minimal domain semantic runtime consumed by kernel.
 */
export const createDomainRuntime = (
	input: CreateDomainRuntimeInput,
): DomainRuntime =>
	createDomainRuntimeConformanceHarness(input).semanticRuntime;

import type { HostReplayRecord } from "@gooi/host-contracts/replay";
import { replayContracts } from "@gooi/host-contracts/replay";
import {
	areHostPortConformanceChecksPassing,
	buildHostPortConformanceCheck,
} from "../host-port-conformance/host-port-conformance";
import type {
	EntrypointConformanceReport,
	RunEntrypointConformanceInput,
} from "./contracts";
import { runEntrypoint } from "./run-entrypoint-through-kernel";

/**
 * Runs the RFC-0002 entrypoint runtime conformance suite.
 *
 * @param input - Entrypoint conformance input.
 * @returns Entrypoint conformance report with named checks.
 *
 * @example
 * const report = await runEntrypointConformance(input);
 */
export const runEntrypointConformance = async (
	input: RunEntrypointConformanceInput,
): Promise<EntrypointConformanceReport> => {
	const checks: Array<EntrypointConformanceReport["checks"][number]> = [];
	const records = new Map<
		string,
		HostReplayRecord<Awaited<ReturnType<typeof runEntrypoint>>>
	>();
	const store = replayContracts.createHostReplayStorePort<
		Awaited<ReturnType<typeof runEntrypoint>>
	>({
		load: async (scopeKey: string) => records.get(scopeKey) ?? null,
		save: async ({ scopeKey, record }) => {
			records.set(scopeKey, record);
		},
	});
	const query = await runEntrypoint({
		bundle: input.bundle,
		binding: input.queryBinding,
		request: input.queryRequest,
		principal: input.authorizedPrincipal,
		domainRuntime: input.domainRuntime,
	});
	checks.push(
		buildHostPortConformanceCheck(
			"query_executes",
			query.ok,
			query.ok ? "Query executed successfully." : "Query execution failed.",
		),
	);

	const unauthorized = await runEntrypoint({
		bundle: input.bundle,
		binding: input.queryBinding,
		request: input.queryRequest,
		principal: input.unauthorizedPrincipal,
		domainRuntime: input.domainRuntime,
	});
	checks.push(
		buildHostPortConformanceCheck(
			"access_denied_enforced",
			!unauthorized.ok && unauthorized.error?.code === "access_denied_error",
			unauthorized.ok
				? "Unauthorized query unexpectedly succeeded."
				: `Received ${unauthorized.error?.code ?? "unknown"}.`,
		),
	);

	const bindingError = await runEntrypoint({
		bundle: input.bundle,
		binding: input.mutationBinding,
		request: {},
		principal: input.authorizedPrincipal,
		domainRuntime: input.domainRuntime,
	});
	checks.push(
		buildHostPortConformanceCheck(
			"binding_error_enforced",
			!bindingError.ok && bindingError.error?.code === "binding_error",
			bindingError.ok
				? "Missing mutation input unexpectedly succeeded."
				: `Received ${bindingError.error?.code ?? "unknown"}.`,
		),
	);

	const mutation = await runEntrypoint({
		bundle: input.bundle,
		binding: input.mutationBinding,
		request: input.mutationRequest,
		principal: input.authorizedPrincipal,
		domainRuntime: input.domainRuntime,
		replayStore: store,
		idempotencyKey: "conformance-key",
	});
	checks.push(
		buildHostPortConformanceCheck(
			"refresh_subscription_matched",
			mutation.ok &&
				mutation.meta.refreshTriggers.length > 0 &&
				mutation.meta.affectedQueryIds.includes(
					input.queryBinding.entrypointId,
				),
			mutation.ok
				? "Mutation refresh triggers and affected query ids were resolved."
				: "Mutation failed before refresh check.",
		),
	);

	const replay = await runEntrypoint({
		bundle: input.bundle,
		binding: input.mutationBinding,
		request: input.mutationRequest,
		principal: input.authorizedPrincipal,
		domainRuntime: input.domainRuntime,
		replayStore: store,
		idempotencyKey: "conformance-key",
	});
	checks.push(
		buildHostPortConformanceCheck(
			"idempotency_replay_enforced",
			replay.ok && replay.meta.replayed,
			replay.ok
				? "Replay returned cached result envelope."
				: "Replay request failed.",
		),
	);

	const conflict = await runEntrypoint({
		bundle: input.bundle,
		binding: input.mutationBinding,
		request: input.mutationConflictRequest,
		principal: input.authorizedPrincipal,
		domainRuntime: input.domainRuntime,
		replayStore: store,
		idempotencyKey: "conformance-key",
	});
	checks.push(
		buildHostPortConformanceCheck(
			"idempotency_conflict_enforced",
			!conflict.ok && conflict.error?.code === "idempotency_conflict_error",
			conflict.ok
				? "Conflict request unexpectedly succeeded."
				: `Received ${conflict.error?.code ?? "unknown"}.`,
		),
	);

	return {
		artifactHash: input.bundle.artifactHash,
		passed: areHostPortConformanceChecksPassing(checks),
		checks,
		...(mutation.ok ? { lastMutationResult: mutation } : {}),
	};
};

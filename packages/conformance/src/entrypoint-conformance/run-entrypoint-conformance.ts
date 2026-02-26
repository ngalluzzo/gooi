import { executeEntrypoint } from "@gooi/entrypoint-runtime";
import { createInMemoryIdempotencyStore } from "@gooi/entrypoint-runtime/idempotency-store";
import type {
	EntrypointConformanceCheckId,
	EntrypointConformanceCheckResult,
	EntrypointConformanceReport,
	RunEntrypointConformanceInput,
} from "./contracts";

const buildCheck = (
	id: EntrypointConformanceCheckId,
	passed: boolean,
	detail: string,
): EntrypointConformanceCheckResult => ({ id, passed, detail });

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
	const checks: EntrypointConformanceCheckResult[] = [];
	const store = createInMemoryIdempotencyStore();
	const query = await executeEntrypoint({
		bundle: input.bundle,
		binding: input.queryBinding,
		request: input.queryRequest,
		principal: input.authorizedPrincipal,
		domainRuntime: input.domainRuntime,
	});
	checks.push(
		buildCheck(
			"query_executes",
			query.ok,
			query.ok ? "Query executed successfully." : "Query execution failed.",
		),
	);

	const unauthorized = await executeEntrypoint({
		bundle: input.bundle,
		binding: input.queryBinding,
		request: input.queryRequest,
		principal: input.unauthorizedPrincipal,
		domainRuntime: input.domainRuntime,
	});
	checks.push(
		buildCheck(
			"access_denied_enforced",
			!unauthorized.ok && unauthorized.error?.code === "access_denied_error",
			unauthorized.ok
				? "Unauthorized query unexpectedly succeeded."
				: `Received ${unauthorized.error?.code ?? "unknown"}.`,
		),
	);

	const bindingError = await executeEntrypoint({
		bundle: input.bundle,
		binding: input.mutationBinding,
		request: {},
		principal: input.authorizedPrincipal,
		domainRuntime: input.domainRuntime,
	});
	checks.push(
		buildCheck(
			"binding_error_enforced",
			!bindingError.ok && bindingError.error?.code === "binding_error",
			bindingError.ok
				? "Missing mutation input unexpectedly succeeded."
				: `Received ${bindingError.error?.code ?? "unknown"}.`,
		),
	);

	const mutation = await executeEntrypoint({
		bundle: input.bundle,
		binding: input.mutationBinding,
		request: input.mutationRequest,
		principal: input.authorizedPrincipal,
		domainRuntime: input.domainRuntime,
		idempotencyStore: store,
		idempotencyKey: "conformance-key",
	});
	checks.push(
		buildCheck(
			"refresh_subscription_matched",
			mutation.ok &&
				mutation.meta.affectedQueryIds.includes(
					input.queryBinding.entrypointId,
				),
			mutation.ok
				? "Mutation refresh affected query ids were resolved."
				: "Mutation failed before refresh check.",
		),
	);

	const replay = await executeEntrypoint({
		bundle: input.bundle,
		binding: input.mutationBinding,
		request: input.mutationRequest,
		principal: input.authorizedPrincipal,
		domainRuntime: input.domainRuntime,
		idempotencyStore: store,
		idempotencyKey: "conformance-key",
	});
	checks.push(
		buildCheck(
			"idempotency_replay_enforced",
			replay.ok && replay.meta.replayed,
			replay.ok
				? "Replay returned cached result envelope."
				: "Replay request failed.",
		),
	);

	const conflict = await executeEntrypoint({
		bundle: input.bundle,
		binding: input.mutationBinding,
		request: input.mutationConflictRequest,
		principal: input.authorizedPrincipal,
		domainRuntime: input.domainRuntime,
		idempotencyStore: store,
		idempotencyKey: "conformance-key",
	});
	checks.push(
		buildCheck(
			"idempotency_conflict_enforced",
			!conflict.ok && conflict.error?.code === "idempotency_conflict_error",
			conflict.ok
				? "Conflict request unexpectedly succeeded."
				: `Received ${conflict.error?.code ?? "unknown"}.`,
		),
	);

	return {
		artifactHash: input.bundle.artifactHash,
		passed: checks.every((check) => check.passed),
		checks,
		...(mutation.ok ? { lastMutationResult: mutation } : {}),
	};
};

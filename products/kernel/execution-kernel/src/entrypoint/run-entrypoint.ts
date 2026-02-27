import { getMissingHostPortSetMembers } from "@gooi/host-contracts/portset";
import { sha256, stableStringify } from "@gooi/stable-json";
import type { ResultEnvelope } from "@gooi/surface-contracts/result-envelope";
import { bindSurfaceInput } from "@gooi/surface-runtime";
import {
	buildInvocationEnvelope,
	resolveEntrypoint,
} from "./entrypoint-resolution";
import { executeEntrypointTail } from "./entrypoint-tail";
import { errorEnvelope, errorResult } from "./errors";
import {
	buildInvalidReplayTtlResult,
	buildMissingHostPortsResult,
} from "./fallback-errors";
import { validateEntrypointInput } from "./input-validation";
import { resolvePolicyGate } from "./policy-gate";
import {
	buildInvocationMeta,
	defaultReplayTtlSeconds,
	isValidReplayTtlSeconds,
	resolveMutationReplayScope,
} from "./run-entrypoint-helpers";
import { buildRuntimeActivationReport } from "./runtime-activation-report";
import { validateSchemaProfile } from "./schema-profile";
import type { RunEntrypointInput } from "./types";
import { validateRuntimeArtifactManifest } from "./validate-artifact-manifest";

/**
 * Executes one compiled query or mutation entrypoint invocation.
 */
export const runEntrypointThroughKernel = async (
	input: RunEntrypointInput,
): Promise<ResultEnvelope<unknown, unknown>> => {
	const hostPorts = input.hostPorts;
	const replayTtlSeconds = input.replayTtlSeconds ?? defaultReplayTtlSeconds;
	if (!isValidReplayTtlSeconds(replayTtlSeconds)) {
		return buildInvalidReplayTtlResult({
			invocation: buildInvocationMeta(input),
			artifactHash: input.bundle.artifactHash,
			replayTtlSeconds,
		});
	}

	const missingHostPortMembers = getMissingHostPortSetMembers(hostPorts);
	if (missingHostPortMembers.length > 0) {
		return buildMissingHostPortsResult({
			invocation: buildInvocationMeta(input),
			artifactHash: input.bundle.artifactHash,
			missingHostPortMembers,
		});
	}

	const startedAt = input.now ?? hostPorts.clock.nowIso();
	const baseInvocation = buildInvocationEnvelope(input, startedAt, hostPorts);
	const manifestValidation = validateRuntimeArtifactManifest(input.bundle);
	if (!manifestValidation.ok) {
		const activationReport = buildRuntimeActivationReport({
			bundle: input.bundle,
			status: "mismatch",
			diagnostics: manifestValidation.diagnostics,
		});
		return errorResult(
			baseInvocation,
			input.bundle.artifactHash,
			startedAt,
			hostPorts.clock.nowIso,
			errorEnvelope(
				"validation_error",
				"Compiled artifact manifest validation failed during activation.",
				false,
				{
					code: "manifest_validation_error",
					diagnostics: manifestValidation.diagnostics,
					activation: activationReport,
				},
			),
		);
	}

	const entrypoint = resolveEntrypoint(
		input.binding.entrypointKind,
		input.binding.entrypointId,
		input.bundle.entrypoints,
	);
	if (entrypoint === undefined) {
		return errorResult(
			baseInvocation,
			input.bundle.artifactHash,
			startedAt,
			hostPorts.clock.nowIso,
			errorEnvelope(
				"entrypoint_not_found_error",
				"Compiled entrypoint was not found for binding.",
				false,
			),
		);
	}

	const bound = bindSurfaceInput({
		request: input.request,
		entrypoint,
		binding: input.binding,
	});
	if (!bound.ok) {
		return errorResult(
			baseInvocation,
			input.bundle.artifactHash,
			startedAt,
			hostPorts.clock.nowIso,
			errorEnvelope(
				"binding_error",
				bound.error.message,
				false,
				bound.error.details,
			),
		);
	}

	const resolvedInvocation = {
		...baseInvocation,
		entrypointId: entrypoint.id,
		entrypointKind: entrypoint.kind,
		input: bound.value,
	};

	const schemaValidation = validateSchemaProfile({
		bundle: input.bundle,
		entrypoint,
		invocation: resolvedInvocation,
		startedAt,
		nowIso: hostPorts.clock.nowIso,
	});
	if (!schemaValidation.ok) {
		return schemaValidation.result;
	}

	const validatedInput = validateEntrypointInput(entrypoint, bound.value);
	if (!validatedInput.ok) {
		return errorResult(
			resolvedInvocation,
			input.bundle.artifactHash,
			startedAt,
			hostPorts.clock.nowIso,
			errorEnvelope(
				"validation_error",
				"Entrypoint input validation failed.",
				false,
				validatedInput.details,
			),
		);
	}

	const policyGate = resolvePolicyGate({
		bundle: input.bundle,
		entrypoint,
		invocation: resolvedInvocation,
		hostPorts,
		principalInput: input.principal,
		startedAt,
		nowIso: hostPorts.clock.nowIso,
	});
	if (!policyGate.ok) {
		return policyGate.result;
	}

	const validatedInvocation = {
		...resolvedInvocation,
		principal: policyGate.principal,
		input: validatedInput.value,
	};

	let scope: string | null = null;
	let inputHash: string | null = null;
	if (
		entrypoint.kind === "mutation" &&
		input.idempotencyKey !== undefined &&
		input.replayStore
	) {
		inputHash = sha256(stableStringify(validatedInvocation.input));
		scope = resolveMutationReplayScope({
			entrypoint,
			principal: validatedInvocation.principal,
			idempotencyKey: input.idempotencyKey,
			input: validatedInvocation.input,
		});
		const existing = await input.replayStore.load(scope);
		if (existing !== null) {
			if (existing.inputHash !== inputHash) {
				return errorResult(
					resolvedInvocation,
					input.bundle.artifactHash,
					startedAt,
					hostPorts.clock.nowIso,
					errorEnvelope(
						"idempotency_conflict_error",
						"Idempotency key reuse conflict.",
						false,
					),
				);
			}
			return {
				...existing.result,
				meta: { ...existing.result.meta, replayed: true },
			};
		}
	}

	const result = await executeEntrypointTail({
		entrypoint,
		invocation: validatedInvocation,
		startedAt,
		artifactHash: input.bundle.artifactHash,
		domainRuntime: input.domainRuntime,
		refreshSubscriptions: input.bundle.refreshSubscriptions,
		nowIso: hostPorts.clock.nowIso,
	});

	if (
		entrypoint.kind === "mutation" &&
		scope !== null &&
		inputHash !== null &&
		input.replayStore
	) {
		await input.replayStore.save({
			scopeKey: scope,
			record: { inputHash, result },
			ttlSeconds: replayTtlSeconds,
		});
	}

	return result;
};

export type {
	DomainRuntimePort,
	HostPortContractIssue,
	HostPortSet,
	KernelEntrypointHostPortSet,
	KernelSemanticExecutionInput,
	KernelSemanticExecutionResult,
	KernelSemanticRuntimePort,
	RunEntrypointInput,
	RunEntrypointThroughKernelInput,
} from "./types";

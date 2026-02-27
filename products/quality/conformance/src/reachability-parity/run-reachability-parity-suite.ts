import { createProviderRuntime } from "@gooi/provider-runtime";
import { stableStringify } from "@gooi/stable-json";
import {
	areHostPortConformanceChecksPassing,
	buildHostPortConformanceCheck,
} from "../host-port-conformance/host-port-conformance";
import type {
	ReachabilityParityDiagnostic,
	ReachabilityParityReport,
	RunReachabilityParitySuiteInput,
} from "./contracts";

const defaultPrincipal = {
	subject: "reachability-parity-user",
	roles: ["authenticated"],
} as const;

const pushParityDiagnostic = (
	diagnostics: ReachabilityParityDiagnostic[],
	message: string,
	path: string,
): void => {
	diagnostics.push({
		code: "conformance_reachability_parity_error",
		message,
		path,
	});
};

/**
 * Runs parity checks between local and delegated capability execution paths.
 *
 * @param input - Reachability parity suite input.
 * @returns Reachability parity report with typed diagnostics.
 */
export const runReachabilityParitySuite = async (
	input: RunReachabilityParitySuiteInput,
): Promise<ReachabilityParityReport> => {
	const diagnostics: ReachabilityParityDiagnostic[] = [];
	const checks: Array<ReachabilityParityReport["checks"][number]> = [];
	const now = input.now ?? "2026-02-27T00:00:00.000Z";
	const principal = input.principal ?? defaultPrincipal;

	const localRuntime = createProviderRuntime({
		hostApiVersion: input.hostApiVersion,
		contracts: [input.contract],
		bindingPlan: input.localBindingPlan,
		lockfile: input.localLockfile,
	});
	const localActivation = await localRuntime.activate({
		providerModule: input.providerModule,
	});
	const localInvocation = localActivation.ok
		? await localRuntime.invoke(localActivation.value, {
				portId: input.contract.id,
				portVersion: input.contract.version,
				input: input.input,
				principal,
				ctx: {
					id: "reachability-local",
					traceId: "reachability-trace-local",
					now,
				},
			})
		: null;
	if (localActivation.ok) {
		await localRuntime.deactivate(localActivation.value);
	}

	checks.push(
		buildHostPortConformanceCheck(
			"local_execution_succeeds",
			localActivation.ok &&
				localInvocation !== null &&
				localInvocation.ok &&
				localInvocation.value.ok,
			localActivation.ok && localInvocation !== null
				? localInvocation.ok
					? localInvocation.value.ok
						? "Local capability invocation succeeded."
						: "Local capability invocation returned typed error payload."
					: `${localInvocation.error.kind}: ${localInvocation.error.message}`
				: "Local activation failed.",
		),
	);
	if (!(localActivation.ok && localInvocation !== null && localInvocation.ok)) {
		pushParityDiagnostic(
			diagnostics,
			"Local capability execution did not produce a successful baseline result.",
			"local_execution_succeeds",
		);
	}

	const delegatedRuntime = createProviderRuntime({
		hostApiVersion: input.hostApiVersion,
		contracts: [input.contract],
		bindingPlan: input.delegatedBindingPlan,
		lockfile: input.delegatedLockfile,
		hostPorts: input.delegatedHostPorts,
	});
	const delegatedActivation = await delegatedRuntime.activate({
		providerModule: input.providerModule,
	});
	const delegatedInvocation = delegatedActivation.ok
		? await delegatedRuntime.invoke(delegatedActivation.value, {
				portId: input.contract.id,
				portVersion: input.contract.version,
				input: input.input,
				principal,
				ctx: {
					id: "reachability-delegated",
					traceId: "reachability-trace-delegated",
					now,
				},
			})
		: null;
	if (delegatedActivation.ok) {
		await delegatedRuntime.deactivate(delegatedActivation.value);
	}

	checks.push(
		buildHostPortConformanceCheck(
			"delegated_execution_succeeds",
			delegatedActivation.ok &&
				delegatedInvocation !== null &&
				delegatedInvocation.ok &&
				delegatedInvocation.value.ok,
			delegatedActivation.ok && delegatedInvocation !== null
				? delegatedInvocation.ok
					? delegatedInvocation.value.ok
						? "Delegated capability invocation succeeded."
						: "Delegated capability invocation returned typed error payload."
					: `${delegatedInvocation.error.kind}: ${delegatedInvocation.error.message}`
				: "Delegated activation failed.",
		),
	);
	if (
		!(
			delegatedActivation.ok &&
			delegatedInvocation !== null &&
			delegatedInvocation.ok
		)
	) {
		pushParityDiagnostic(
			diagnostics,
			"Delegated capability execution did not produce a successful result.",
			"delegated_execution_succeeds",
		);
	}

	const localValue = localInvocation?.ok ? localInvocation.value : null;
	const delegatedValue = delegatedInvocation?.ok
		? delegatedInvocation.value
		: null;

	const outputParity =
		localValue !== null &&
		delegatedValue !== null &&
		stableStringify(localValue.output ?? null) ===
			stableStringify(delegatedValue.output ?? null);
	checks.push(
		buildHostPortConformanceCheck(
			"output_parity",
			outputParity,
			outputParity
				? "Local and delegated outputs are equivalent."
				: "Local and delegated outputs diverged.",
		),
	);
	if (!outputParity) {
		pushParityDiagnostic(
			diagnostics,
			"Local and delegated capability outputs are not semantically equivalent.",
			"output_parity",
		);
	}

	const normalizeEffects = (effects: readonly string[] | undefined): string[] =>
		[...(effects ?? [])].sort((left, right) => left.localeCompare(right));
	const effectParity =
		localValue !== null &&
		delegatedValue !== null &&
		stableStringify(normalizeEffects(localValue.observedEffects)) ===
			stableStringify(normalizeEffects(delegatedValue.observedEffects));
	checks.push(
		buildHostPortConformanceCheck(
			"effect_parity",
			effectParity,
			effectParity
				? "Local and delegated observed effects are equivalent."
				: "Local and delegated observed effects diverged.",
		),
	);
	if (!effectParity) {
		pushParityDiagnostic(
			diagnostics,
			"Local and delegated observed effect sets are not equivalent.",
			"effect_parity",
		);
	}

	const reachabilityTracePresent =
		localValue?.reachabilityMode === "local" &&
		delegatedValue?.reachabilityMode === "delegated";
	checks.push(
		buildHostPortConformanceCheck(
			"reachability_trace_present",
			reachabilityTracePresent,
			reachabilityTracePresent
				? "Runtime traces include explicit local/delegated reachability modes."
				: "Runtime traces are missing explicit local/delegated reachability modes.",
		),
	);
	if (!reachabilityTracePresent) {
		pushParityDiagnostic(
			diagnostics,
			"Reachability trace metadata did not report both local and delegated modes.",
			"reachability_trace_present",
		);
	}

	return {
		passed: areHostPortConformanceChecksPassing(checks),
		checks,
		diagnostics,
	};
};

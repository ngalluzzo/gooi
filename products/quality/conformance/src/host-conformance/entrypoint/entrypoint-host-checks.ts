import type { ResultEnvelope } from "@gooi/surface-contracts/result-envelope";
import {
	createDefaultConformanceHostPorts,
	runEntrypoint,
} from "../../entrypoint-conformance/run-entrypoint-through-kernel";
import { buildHostPortConformanceCheck } from "../../host-port-conformance/host-port-conformance";
import type {
	HostConformanceCheckId,
	HostConformanceCheckResult,
	RunHostConformanceInput,
} from "../contracts";
import { hasMissingHostPortDiagnostic } from "../shared/host-port-missing";

const buildEntrypointBindingChecks = (
	queryResult: ResultEnvelope<unknown, unknown>,
): Array<HostConformanceCheckResult> => {
	return [
		buildHostPortConformanceCheck(
			"entrypoint_host_identity_used",
			queryResult.traceId === "trace_host_conformance" &&
				queryResult.invocationId === "inv_host_conformance",
			queryResult.traceId === "trace_host_conformance" &&
				queryResult.invocationId === "inv_host_conformance"
				? "Entrypoint runtime used host-provided trace and invocation identities."
				: "Entrypoint runtime did not use host-provided identities.",
		),
		buildHostPortConformanceCheck(
			"entrypoint_host_clock_used",
			queryResult.timings.startedAt === "2026-02-26T00:00:00.000Z" &&
				queryResult.timings.completedAt === "2026-02-26T00:00:01.000Z",
			queryResult.timings.startedAt === "2026-02-26T00:00:00.000Z" &&
				queryResult.timings.completedAt === "2026-02-26T00:00:01.000Z"
				? "Entrypoint runtime used host-provided clock values."
				: "Entrypoint runtime did not use host-provided clock values.",
		),
	];
};

interface InvalidEntrypointHostPortCase {
	readonly id: HostConformanceCheckId;
	readonly path: string;
	readonly hostPorts: unknown;
}

export const runEntrypointHostChecks = async (
	input: RunHostConformanceInput,
): Promise<Array<HostConformanceCheckResult>> => {
	const checks: Array<HostConformanceCheckResult> = [];
	const entrypointClockValues = [
		"2026-02-26T00:00:00.000Z",
		"2026-02-26T00:00:01.000Z",
	];
	let entrypointClockIndex = 0;
	const entrypointHostPorts = {
		...createDefaultConformanceHostPorts(),
		clock: {
			nowIso: () => {
				const value =
					entrypointClockValues[entrypointClockIndex] ??
					entrypointClockValues[entrypointClockValues.length - 1];
				entrypointClockIndex += 1;
				return value ?? "2026-02-26T00:00:01.000Z";
			},
		},
		identity: {
			newTraceId: () => "trace_host_conformance",
			newInvocationId: () => "inv_host_conformance",
		},
	};
	const queryResult = await runEntrypoint({
		bundle: input.bundle,
		domainRuntime: input.domainRuntime,
		hostPorts: entrypointHostPorts,
		binding: input.queryBinding,
		request: input.queryRequest,
		principal: input.principal,
	});
	checks.push(...buildEntrypointBindingChecks(queryResult));

	const runEntrypointWithHostPorts = (hostPorts: unknown) =>
		runEntrypoint({
			bundle: input.bundle,
			domainRuntime: input.domainRuntime,
			hostPorts,
			binding: input.queryBinding,
			request: input.queryRequest,
			principal: input.principal,
		});

	const invalidCases: readonly InvalidEntrypointHostPortCase[] = [
		{
			id: "entrypoint_missing_clock_rejected",
			path: "clock.nowIso",
			hostPorts: {
				...createDefaultConformanceHostPorts(),
				clock: {},
			},
		},
		{
			id: "entrypoint_missing_identity_rejected",
			path: "identity.newTraceId",
			hostPorts: {
				...createDefaultConformanceHostPorts(),
				identity: {
					newInvocationId: () => "inv_missing_identity",
				},
			},
		},
		{
			id: "entrypoint_missing_principal_rejected",
			path: "principal.validatePrincipal",
			hostPorts: {
				...createDefaultConformanceHostPorts(),
				principal: {},
			},
		},
		{
			id: "entrypoint_missing_delegation_rejected",
			path: "capabilityDelegation.invokeDelegated",
			hostPorts: {
				...createDefaultConformanceHostPorts(),
				capabilityDelegation: {},
			},
		},
	];

	for (const invalidCase of invalidCases) {
		const invalidResult = await runEntrypointWithHostPorts(
			invalidCase.hostPorts,
		);
		const passed =
			!invalidResult.ok &&
			invalidResult.error?.code === "validation_error" &&
			hasMissingHostPortDiagnostic(
				invalidResult.error.details,
				invalidCase.path,
			);
		checks.push(
			buildHostPortConformanceCheck(
				invalidCase.id,
				passed,
				passed
					? `Entrypoint runtime rejected missing host port member ${invalidCase.path}.`
					: `Entrypoint runtime did not reject missing host port member ${invalidCase.path}.`,
			),
		);
	}

	return checks;
};

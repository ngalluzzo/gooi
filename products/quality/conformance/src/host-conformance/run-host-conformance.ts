import { areHostPortConformanceChecksPassing } from "../host-port-conformance/host-port-conformance";
import type {
	HostConformanceReport,
	RunHostConformanceInput,
} from "./contracts";
import { runEntrypointHostChecks } from "./entrypoint/entrypoint-host-checks";
import { runProviderHostChecks } from "./provider/provider-host-checks";

/**
 * Runs host conformance checks for runtime orchestration behavior.
 *
 * @param input - Host conformance input.
 * @returns Host conformance report with named checks.
 */
export const runHostConformance = async (
	input: RunHostConformanceInput,
): Promise<HostConformanceReport> => {
	const checks = [
		...(await runEntrypointHostChecks(input)),
		...(await runProviderHostChecks(input)),
	];

	return {
		passed: areHostPortConformanceChecksPassing(checks),
		checks,
	};
};

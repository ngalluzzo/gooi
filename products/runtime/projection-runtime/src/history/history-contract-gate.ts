import { createProjectionError } from "@gooi/projection-contracts/errors/projection-errors";
import type { ProjectionSourceRef } from "@gooi/projection-contracts/plans/projection-plan";
import type { HistoryPort } from "@gooi/projection-contracts/ports/history-port-contract";

type HistoryCapabilityId =
	| "history.append"
	| "history.scan"
	| "history.scan_as_of"
	| "history.rebuild"
	| "history.persist";

const capabilityMethodMap: Readonly<Record<HistoryCapabilityId, string>> = {
	"history.append": "append",
	"history.scan": "scan",
	"history.scan_as_of": "scanAsOf",
	"history.rebuild": "rebuild",
	"history.persist": "persist",
};

const requiredCoreCapabilities = [
	"history.append",
	"history.scan",
	"history.rebuild",
	"history.persist",
] as const satisfies readonly HistoryCapabilityId[];

const isHistoryCapabilityId = (value: string): value is HistoryCapabilityId =>
	Object.hasOwn(capabilityMethodMap, value);

const hasFunction = (port: HistoryPort, methodName: string): boolean =>
	typeof (port as unknown as Readonly<Record<string, unknown>>)[methodName] ===
	"function";

/**
 * Enforces runtime history operation contract availability for timeline execution.
 */
export const enforceHistoryContractGate = (input: {
	readonly historyPort: HistoryPort | undefined;
	readonly requiredCapabilities: readonly string[];
	readonly asOf: string | null;
	readonly sourceRef: ProjectionSourceRef;
}):
	| { readonly ok: true }
	| {
			readonly ok: false;
			readonly error: ReturnType<typeof createProjectionError>;
	  } => {
	if (input.historyPort === undefined) {
		return {
			ok: false,
			error: createProjectionError(
				"projection_history_capability_error",
				"Timeline projection requires a bound history port.",
				input.sourceRef,
			),
		};
	}

	const capabilities = new Set<HistoryCapabilityId>(requiredCoreCapabilities);
	for (const capability of input.requiredCapabilities) {
		if (isHistoryCapabilityId(capability)) {
			capabilities.add(capability);
		}
	}
	if (input.asOf !== null) {
		capabilities.add("history.scan_as_of");
	}

	const missing: HistoryCapabilityId[] = [];
	for (const capability of capabilities) {
		const methodName = capabilityMethodMap[capability];
		if (!hasFunction(input.historyPort, methodName)) {
			missing.push(capability);
		}
	}

	if (missing.length === 0) {
		return { ok: true };
	}

	return {
		ok: false,
		error: createProjectionError(
			"projection_history_capability_error",
			"Timeline projection is missing required history operations.",
			input.sourceRef,
			{ missingCapabilities: missing },
		),
	};
};

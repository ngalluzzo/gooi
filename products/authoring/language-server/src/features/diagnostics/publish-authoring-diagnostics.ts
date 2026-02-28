import {
	type AuthoringDiagnosticsEnvelope,
	envelopesContracts,
} from "@gooi/authoring-contracts/envelopes";

import { authoringDiagnosticsRequestSchema } from "../../contracts/diagnostics-contracts";
import { evaluateAuthoringReadParity } from "../../internal/lockfile-parity";
import { collectGuardScenarioDiagnostics } from "./collect-guard-scenario-diagnostics";
import { collectReachabilityDiagnostics } from "./collect-reachability-diagnostics";

const { parseAuthoringDiagnosticsEnvelope } = envelopesContracts;

const byDiagnosticOrder = (
	left: AuthoringDiagnosticsEnvelope["diagnostics"][number],
	right: AuthoringDiagnosticsEnvelope["diagnostics"][number],
): number => {
	if (left.path !== right.path) {
		return left.path.localeCompare(right.path);
	}
	if (left.code !== right.code) {
		return left.code.localeCompare(right.code);
	}
	return left.message.localeCompare(right.message);
};

/**
 * Builds deterministic read-path diagnostics, including lockfile mismatch diagnostics.
 *
 * @param value - Untrusted diagnostics request.
 * @returns Authoring diagnostics envelope.
 *
 * @example
 * const diagnostics = publishAuthoringDiagnostics({ context });
 */
export const publishAuthoringDiagnostics = (
	value: unknown,
): AuthoringDiagnosticsEnvelope => {
	const request = authoringDiagnosticsRequestSchema.parse(value);
	const parity = evaluateAuthoringReadParity(request.context);

	const parityDiagnostics = parity.issues.map((issue) => ({
		code: issue.code,
		severity: "error" as const,
		message: issue.message,
		path: issue.path,
		range: {
			start: { line: 0, character: 0 },
			end: { line: 0, character: 1 },
		},
		staleArtifacts: issue.staleArtifacts,
	}));
	const sourceSpecDiagnostics = [
		...collectReachabilityDiagnostics(request.context),
		...collectGuardScenarioDiagnostics(request.context),
	];

	const diagnostics = [...parityDiagnostics, ...sourceSpecDiagnostics].sort(
		byDiagnosticOrder,
	);

	return parseAuthoringDiagnosticsEnvelope({
		envelopeVersion: "1.0.0",
		documentUri: request.context.documentUri,
		generatedAt: request.generatedAt ?? new Date().toISOString(),
		parity: {
			status: parity.status,
			lockfileHash: parity.lockfileHash,
		},
		diagnostics,
	});
};

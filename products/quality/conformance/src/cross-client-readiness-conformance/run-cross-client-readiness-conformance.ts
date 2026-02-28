import { authoringClientDeviationCatalog } from "@gooi/language-server/contracts/client-readiness";
import { authoringProtocolMethodSchema } from "@gooi/language-server/contracts/protocol";
import { listAuthoringCompletionItems } from "@gooi/language-server/features/completion/list";
import { createAuthoringProtocolServer } from "@gooi/language-server/features/protocol/server";
import { applyAuthoringRename } from "@gooi/language-server/features/rename/apply";
import { stableStringify } from "@gooi/stable-json";

import {
	type CrossClientReadinessCheck,
	type CrossClientReadinessReport,
	crossClientReadinessCheckSchema,
	crossClientReadinessReportSchema,
	runCrossClientReadinessInputSchema,
} from "./contracts";

const makeCheck = (
	value: CrossClientReadinessCheck,
): CrossClientReadinessCheck => crossClientReadinessCheckSchema.parse(value);

/**
 * Runs the RFC-0004 cross-client readiness baseline suite.
 *
 * @param value - Untrusted cross-client readiness input.
 * @returns Cross-client readiness report.
 *
 * @example
 * const report = runCrossClientReadinessConformance(input);
 */
export const runCrossClientReadinessConformance = (
	value: unknown,
): CrossClientReadinessReport => {
	const input = runCrossClientReadinessInputSchema.parse(value);
	const checks: CrossClientReadinessCheck[] = [];

	const protocolMethods = authoringProtocolMethodSchema.options;
	const portableProtocolSurface = protocolMethods.every((method) =>
		[
			"$/",
			"gooi/",
			"textDocument/",
			"workspace/",
			"completionItem/",
			"codeLens/",
		].some((prefix) => method.startsWith(prefix)),
	);
	checks.push(
		makeCheck({
			id: "portable_protocol_surface",
			passed: portableProtocolSurface,
			detail:
				"Protocol method namespaces remain LSP/gooi portable and avoid client-specific method coupling.",
		}),
	);

	const protocolServer = createAuthoringProtocolServer({
		context: input.context,
		initialVersion: 1,
	});
	const didOpen = protocolServer.handleMessage({
		id: null,
		method: "textDocument/didOpen",
		params: {
			version: 2,
			documentText: input.context.documentText,
		},
	});
	const protocolCompletion = protocolServer.handleMessage({
		id: 1,
		method: "textDocument/completion",
		params: { position: input.positions.capabilityCompletion },
	});
	const protocolRename = protocolServer.handleMessage({
		id: 2,
		method: "textDocument/rename",
		params: {
			position: input.positions.expressionReference,
			newName: input.renameTarget,
		},
	});
	const directCompletion = listAuthoringCompletionItems({
		context: input.context,
		position: input.positions.capabilityCompletion,
	});
	const directRename = applyAuthoringRename({
		context: input.context,
		position: input.positions.expressionReference,
		newName: input.renameTarget,
	});
	const protocolFixtureParity =
		didOpen.error === undefined &&
		protocolCompletion.error === undefined &&
		protocolRename.error === undefined &&
		stableStringify(protocolCompletion.result) ===
			stableStringify(directCompletion) &&
		stableStringify(protocolRename.result) === stableStringify(directRename);
	checks.push(
		makeCheck({
			id: "protocol_fixture_parity",
			passed: protocolFixtureParity,
			detail:
				"Protocol fixture requests remain behaviorally equivalent to direct language-server handlers.",
		}),
	);

	const deviationIds = authoringClientDeviationCatalog.map((entry) => entry.id);
	const sortedDeviationIds = [...deviationIds].sort((left, right) =>
		left.localeCompare(right),
	);
	checks.push(
		makeCheck({
			id: "client_deviation_catalog",
			passed:
				deviationIds.every((id, index) => id === sortedDeviationIds[index]) &&
				authoringClientDeviationCatalog.every(
					(entry) => entry.deviation.length > 0 && entry.mitigation.length > 0,
				),
			detail:
				"Client-specific deviations are cataloged deterministically with explicit mitigation guidance.",
		}),
	);

	return crossClientReadinessReportSchema.parse({
		passed: checks.every((check) => check.passed),
		checks,
	});
};

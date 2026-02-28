import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
	type AuthoringLockfile,
	lockfileContracts,
} from "@gooi/authoring-contracts/lockfile";
import { buildCapabilityIndexSnapshot } from "@gooi/capability-index";
import type { BuildCapabilityIndexSnapshotInput } from "@gooi/capability-index/contracts";
import { buildSymbolGraphSnapshot } from "@gooi/symbol-graph";
import type { BuildSymbolGraphSnapshotInput } from "@gooi/symbol-graph/contracts";

// LOC-EXCEPTION: Single fixture file captures full authoring snapshot inputs for deterministic tests.
const createLockfile = (input: {
	compiledEntrypointBundleHash: string;
	capabilityIndexHash: string;
	symbolGraphHash: string;
	catalogHash: string;
}): AuthoringLockfile =>
	lockfileContracts.createAuthoringLockfile({
		artifactVersion: "1.0.0",
		sourceHash: "4".repeat(64),
		sourceKind: "workspace-local",
		requiredArtifacts: {
			compiledEntrypointBundle: {
				artifactId:
					lockfileContracts.authoringRequiredArtifactIds
						.compiledEntrypointBundle,
				artifactVersion: "1.0.0",
				artifactHash: input.compiledEntrypointBundleHash,
			},
			capabilityIndexSnapshot: {
				artifactId:
					lockfileContracts.authoringRequiredArtifactIds
						.capabilityIndexSnapshot,
				artifactVersion: "1.0.0",
				artifactHash: input.capabilityIndexHash,
			},
			symbolGraphSnapshot: {
				artifactId:
					lockfileContracts.authoringRequiredArtifactIds.symbolGraphSnapshot,
				artifactVersion: "1.0.0",
				artifactHash: input.symbolGraphHash,
			},
		},
		catalogSnapshot: {
			catalogSource: "demo-catalog",
			catalogVersion: "2026-02-26",
			catalogHash: input.catalogHash,
		},
		envelopeVersions: {
			authoringRequestEnvelope: "1.0.0",
			authoringResultEnvelope: "1.0.0",
			authoringErrorEnvelope: "1.0.0",
			authoringDiagnosticsEnvelope: "1.0.0",
		},
	});

const capabilityInput: BuildCapabilityIndexSnapshotInput = {
	sourceHash: "1".repeat(64),
	catalogIdentity: {
		catalogSource: "demo-catalog",
		catalogVersion: "2026-02-26",
		catalogHash: "2".repeat(64),
	},
	localCapabilities: [
		{
			capabilityId: "message.is_allowed",
			capabilityVersion: "1.0.0",
			declaredEffects: ["read"],
			ioSchemaRefs: {
				inputSchemaRef: "schema://local/message.is_allowed/input",
				outputSchemaRef: "schema://local/message.is_allowed/output",
				errorSchemaRef: "schema://local/message.is_allowed/error",
			},
			deprecation: { isDeprecated: false },
			examples: { input: { userId: "u_1" }, output: { allowed: true } },
			providerAvailability: [],
			certificationState: "uncertified",
			trustTier: "unknown",
			lastVerifiedAt: null,
		},
	],
	catalogCapabilities: [
		{
			capabilityId: "gooi-marketplace-bun-sqlite.insert_message",
			capabilityVersion: "1.0.0",
			declaredEffects: ["write", "emit"],
			ioSchemaRefs: {
				inputSchemaRef: "schema://catalog/sqlite.insert_message/input",
				outputSchemaRef: "schema://catalog/sqlite.insert_message/output",
				errorSchemaRef: "schema://catalog/sqlite.insert_message/error",
			},
			deprecation: { isDeprecated: false },
			examples: { input: { message: "hello" }, output: { id: "m_1" } },
			providerAvailability: [
				{
					providerId: "gooi-marketplace-bun-sqlite",
					providerVersion: "1.0.0",
					status: "available",
				},
			],
			certificationState: "certified",
			trustTier: "trusted",
			lastVerifiedAt: "2026-02-26T00:00:00.000Z",
		},
	],
};

const symbolInput: BuildSymbolGraphSnapshotInput = {
	sourceHash: "3".repeat(64),
	symbols: [
		{
			id: "action:guestbook.submit",
			kind: "action",
			name: "guestbook.submit",
			location: { path: "docs/demo.yml", line: 1, character: 2 },
		},
		{
			id: "capability:message.is_allowed",
			kind: "capability",
			name: "message.is_allowed",
			location: { path: "docs/demo.yml", line: 3, character: 8 },
		},
		{
			id: "signal:message.created",
			kind: "signal",
			name: "message.created",
			location: { path: "docs/demo.yml", line: 6, character: 4 },
		},
		{
			id: "entrypoint:home.data.messages",
			kind: "entrypoint",
			name: "home.data.messages",
			location: { path: "docs/demo.yml", line: 8, character: 2 },
		},
		{
			id: "step:generated_ids",
			kind: "step_binding",
			name: "generated_ids",
			location: { path: "docs/demo.yml", line: 15, character: 4 },
			ownerSymbolId: "action:guestbook.submit",
		},
		{
			id: "expr:generated_ids.ids.0",
			kind: "expression_variable",
			name: "generated_ids.ids.0",
			location: { path: "docs/demo.yml", line: 12, character: 4 },
			ownerSymbolId: "action:guestbook.submit",
		},
	],
	references: [
		{
			fromSymbolId: "expr:generated_ids.ids.0",
			toSymbolId: "step:generated_ids",
			relationship: "references",
		},
	],
	signalImpact: {
		actions: [
			{
				actionSymbolId: "action:guestbook.submit",
				emittedSignalSymbolIds: ["signal:message.created"],
			},
		],
		queries: [
			{
				querySymbolId: "entrypoint:home.data.messages",
				refreshOnSignalSymbolIds: ["signal:message.created"],
			},
		],
	},
	renameConstraints: [
		{
			symbolKind: "ambient_symbol",
			renameable: false,
			blockedReason: "Ambient runtime symbols are reserved.",
		},
		{ symbolKind: "step_binding", renameable: true },
		{ symbolKind: "signal", renameable: true },
	],
};

const documentText = `actions:\n  guestbook.submit:\n    do:\n      - message.is_allowed\n      - gooi-marketplace-bun-sqlite.insert_message\nemits:\n  - message.created\nqueries:\n  home.data.messages:\n    refresh_on_signals:\n      - message.created\nrefs:\n  - generated_ids.ids.0\n`;

/**
 * Creates a temporary fixture workspace with an authoring context artifact.
 */
export const createAuthoringWorkspaceFixture = (): {
	workspaceRoot: string;
	documentPath: string;
	documentUri: string;
	documentText: string;
	dispose: () => void;
} => {
	const workspaceRoot = mkdtempSync(join(tmpdir(), "gooi-vscode-"));
	const documentPath = join(workspaceRoot, "docs", "demo.yml");
	const contextPath = join(workspaceRoot, ".gooi", "authoring-context.json");
	mkdirSync(join(workspaceRoot, "docs"), { recursive: true });
	mkdirSync(join(workspaceRoot, ".gooi"), { recursive: true });
	writeFileSync(documentPath, documentText, "utf8");

	const capabilitySnapshot = buildCapabilityIndexSnapshot(capabilityInput);
	const symbolSnapshot = buildSymbolGraphSnapshot(symbolInput);
	const compiledEntrypointBundleIdentity = {
		artifactId:
			lockfileContracts.authoringRequiredArtifactIds.compiledEntrypointBundle,
		artifactVersion: "1.0.0",
		artifactHash: "5".repeat(64),
	} as const;
	const context = {
		documentUri: `file://${documentPath}`,
		documentPath: "docs/demo.yml",
		documentText,
		compiledEntrypointBundleIdentity,
		capabilityIndexSnapshot: capabilitySnapshot,
		symbolGraphSnapshot: symbolSnapshot,
		lockfile: createLockfile({
			compiledEntrypointBundleHash:
				compiledEntrypointBundleIdentity.artifactHash,
			capabilityIndexHash: capabilitySnapshot.artifactHash,
			symbolGraphHash: symbolSnapshot.artifactHash,
			catalogHash: capabilitySnapshot.catalogIdentity.catalogHash,
		}),
	};
	writeFileSync(contextPath, `${JSON.stringify(context, null, 2)}\n`, "utf8");

	return {
		workspaceRoot,
		documentPath,
		documentUri: `file://${documentPath}`,
		documentText,
		dispose: () => rmSync(workspaceRoot, { recursive: true, force: true }),
	};
};

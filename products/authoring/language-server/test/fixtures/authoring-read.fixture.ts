import {
	type AuthoringLockfile,
	lockfileContracts,
} from "@gooi/authoring-contracts/lockfile";
import { buildCapabilityIndexSnapshot } from "@gooi/capability-index";
import type { BuildCapabilityIndexSnapshotInput } from "@gooi/capability-index/contracts";
import { buildSymbolGraphSnapshot } from "@gooi/symbol-graph";
import type { BuildSymbolGraphSnapshotInput } from "@gooi/symbol-graph/contracts";

const capabilityIndexInput: BuildCapabilityIndexSnapshotInput = {
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
			examples: {
				input: { userId: "u_1" },
				output: { allowed: true },
			},
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
			examples: {
				input: { message: "hello" },
				output: { id: "m_1" },
			},
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

const symbolGraphInput: BuildSymbolGraphSnapshotInput = {
	sourceHash: "3".repeat(64),
	symbols: [
		{
			id: "action:guestbook.submit",
			kind: "action",
			name: "guestbook.submit",
			location: { path: "docs/demo.yml", line: 1, character: 2 },
		},
		{
			id: "signal:message.created",
			kind: "signal",
			name: "message.created",
			location: { path: "docs/demo.yml", line: 6, character: 2 },
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
			location: { path: "docs/demo.yml", line: 3, character: 8 },
			ownerSymbolId: "action:guestbook.submit",
		},
		{
			id: "expr:generated_ids.ids.0",
			kind: "expression_variable",
			name: "generated_ids.ids.0",
			location: { path: "docs/demo.yml", line: 12, character: 6 },
			ownerSymbolId: "action:guestbook.submit",
		},
		{
			id: "ambient:payload.user_id",
			kind: "ambient_symbol",
			name: "payload.user_id",
			location: { path: "docs/demo.yml", line: 3, character: 24 },
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
	],
};

const createLockfile = (input: {
	readonly compiledEntrypointBundleHash: string;
	readonly capabilityIndexHash: string;
	readonly symbolGraphHash: string;
	readonly catalogHash: string;
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
				artifactVersion: capabilityIndexSnapshot.artifactVersion,
				artifactHash: input.capabilityIndexHash,
			},
			symbolGraphSnapshot: {
				artifactId:
					lockfileContracts.authoringRequiredArtifactIds.symbolGraphSnapshot,
				artifactVersion: symbolGraphSnapshot.artifactVersion,
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

const capabilityIndexSnapshot =
	buildCapabilityIndexSnapshot(capabilityIndexInput);
const symbolGraphSnapshot = buildSymbolGraphSnapshot(symbolGraphInput);
const compiledEntrypointBundleIdentity = {
	artifactId:
		lockfileContracts.authoringRequiredArtifactIds.compiledEntrypointBundle,
	artifactVersion: "1.0.0",
	artifactHash: "5".repeat(64),
} as const;

const sourceSpec = {
	domain: {
		signals: {
			"message.created": {},
		},
		flows: {
			"flow.notify": {},
		},
		projections: {
			"messages.timeline": {},
		},
	},
	queries: [{ id: "home.data.messages" }],
	mutations: [{ id: "guestbook.submit" }],
	routes: [{ id: "home_route" }],
	personas: {
		moderator: {
			description: "Moderation operator persona.",
		},
	},
	scenarios: {
		"happy-path": {
			context: { persona: "moderator" },
			steps: [
				{
					capture: [
						{
							captureId: "latest_message",
							source: "context",
							path: "session.latestMessage",
						},
					],
				},
			],
		},
	},
	wiring: {
		requirements: {
			capabilities: [
				{
					portId: "message.is_allowed",
					portVersion: "1.0.0",
					mode: "local",
				},
			],
		},
	},
};

/**
 * Fixture bundle used across product authoring LSP read-path tests.
 */
export const authoringReadFixture = {
	documentUri: "spec://docs/demo.yml",
	documentPath: "docs/demo.yml",
	documentText: `actions:\n  guestbook.submit:\n    do:\n      - message.is_allowed\n      - gooi-marketplace-bun-sqlite.insert_message\nemits:\n  - message.created\nqueries:\n  home.data.messages:\n    refresh_on_signals:\n      - message.created\nrefs:\n  - generated_ids.ids.0\nguards:\n  onFail:\nscenarios:\n  happy-path:\n    context:\n      persona:\n    steps:\n      - capture:\n          - source:\n`,
	sourceSpec,
	compiledEntrypointBundleIdentity,
	capabilityIndexSnapshot,
	symbolGraphSnapshot,
	lockfile: createLockfile({
		compiledEntrypointBundleHash: compiledEntrypointBundleIdentity.artifactHash,
		capabilityIndexHash: capabilityIndexSnapshot.artifactHash,
		symbolGraphHash: symbolGraphSnapshot.artifactHash,
		catalogHash: capabilityIndexSnapshot.catalogIdentity.catalogHash,
	}),
	staleCatalogLockfile: createLockfile({
		compiledEntrypointBundleHash: compiledEntrypointBundleIdentity.artifactHash,
		capabilityIndexHash: capabilityIndexSnapshot.artifactHash,
		symbolGraphHash: symbolGraphSnapshot.artifactHash,
		catalogHash: "9".repeat(64),
	}),
	staleArtifactLockfile: createLockfile({
		compiledEntrypointBundleHash: compiledEntrypointBundleIdentity.artifactHash,
		capabilityIndexHash: "8".repeat(64),
		symbolGraphHash: symbolGraphSnapshot.artifactHash,
		catalogHash: capabilityIndexSnapshot.catalogIdentity.catalogHash,
	}),
};

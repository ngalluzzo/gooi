import { lockfileContracts } from "@gooi/authoring-contracts/lockfile";

import { authoringReadFixture } from "./authoring-read.fixture";

const { createAuthoringLockfile } = lockfileContracts;

export const positionForToken = (
	documentText: string,
	token: string,
	fallback: { line: number; character: number },
) => {
	const lines = documentText.split(/\r?\n/u);
	for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
		const line = lines[lineIndex] ?? "";
		const character = line.indexOf(token);
		if (character >= 0) {
			return { line: lineIndex, character: character + token.length };
		}
	}
	return fallback;
};

export const invalidReachabilitySourceSpec = {
	...(authoringReadFixture.sourceSpec as Record<string, unknown>),
	wiring: {
		requirements: {
			capabilities: [
				{
					portId: "missing.capability",
					portVersion: "9.9.9",
					mode: "remote",
				},
				{
					portId: "message.is_allowed",
					portVersion: "1.0.0",
					mode: "delegated",
					delegateRouteId: "missing_route",
				},
				{
					portId: "message.is_allowed",
					portVersion: "9.9.9",
					mode: "local",
				},
			],
		},
	},
};

export const invalidGuardScenarioSourceSpec = {
	...(authoringReadFixture.sourceSpec as Record<string, unknown>),
	domain: {
		...((authoringReadFixture.sourceSpec as { domain?: unknown })
			.domain as Record<string, unknown>),
		actions: {
			"guestbook.submit": {
				signalGuards: [
					{
						signalId: "message.deleted",
						definition: { onFail: "panic" },
					},
				],
				flowGuards: [
					{
						flowId: "flow.missing",
						definition: { onFail: "abort" },
					},
				],
				steps: [
					{
						invariants: [
							{
								onFail: "fail_action",
							},
						],
					},
				],
			},
		},
	},
	scenarios: {
		broken: {
			context: { persona: "unknown_persona" },
			steps: [
				{
					trigger: { mutation: "unknown.mutation" },
					expect: { signal: "unknown.signal" },
					capture: [
						{
							captureId: "bad_capture",
							source: "not_valid",
						},
					],
				},
			],
		},
	},
};

export const createMultiParityMismatchLockfile = () =>
	createAuthoringLockfile({
		...authoringReadFixture.lockfile,
		requiredArtifacts: {
			...authoringReadFixture.lockfile.requiredArtifacts,
			capabilityIndexSnapshot: {
				...authoringReadFixture.lockfile.requiredArtifacts
					.capabilityIndexSnapshot,
				artifactHash: "8".repeat(64),
			},
			symbolGraphSnapshot: {
				...authoringReadFixture.lockfile.requiredArtifacts.symbolGraphSnapshot,
				artifactHash: "7".repeat(64),
			},
		},
		catalogSnapshot: {
			...authoringReadFixture.lockfile.catalogSnapshot,
			catalogHash: "9".repeat(64),
		},
	});

export const createCompiledBundleMismatchLockfile = () =>
	createAuthoringLockfile({
		...authoringReadFixture.lockfile,
		requiredArtifacts: {
			...authoringReadFixture.lockfile.requiredArtifacts,
			compiledEntrypointBundle: {
				...authoringReadFixture.lockfile.requiredArtifacts
					.compiledEntrypointBundle,
				artifactHash: "6".repeat(64),
			},
		},
	});

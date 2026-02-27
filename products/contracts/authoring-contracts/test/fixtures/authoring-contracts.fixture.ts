import type { AuthoringDiagnosticsEnvelope } from "../../src/envelopes/authoring-diagnostics-envelope";
import type { AuthoringErrorEnvelope } from "../../src/envelopes/authoring-error-envelope";
import type { AuthoringRequestEnvelope } from "../../src/envelopes/authoring-request-envelope";
import type { AuthoringResultEnvelope } from "../../src/envelopes/authoring-result-envelope";
import {
	type AuthoringLockfileContent,
	authoringRequiredArtifactIds,
} from "../../src/lockfile/authoring-lockfile";

/**
 * Fixed timestamp used by phase-1 fixtures.
 */
export const fixtureTimestamp = "2026-02-26T00:00:00.000Z";

/**
 * Lockfile content fixture used to generate deterministic lockfile artifacts.
 */
export const authoringLockfileContentFixture: AuthoringLockfileContent = {
	artifactVersion: "1.0.0",
	sourceHash: "a".repeat(64),
	sourceKind: "workspace-local",
	requiredArtifacts: {
		compiledEntrypointBundle: {
			artifactId: authoringRequiredArtifactIds.compiledEntrypointBundle,
			artifactVersion: "1.0.0",
			artifactHash: "b".repeat(64),
		},
		capabilityIndexSnapshot: {
			artifactId: authoringRequiredArtifactIds.capabilityIndexSnapshot,
			artifactVersion: "1.0.0",
			artifactHash: "c".repeat(64),
		},
		symbolGraphSnapshot: {
			artifactId: authoringRequiredArtifactIds.symbolGraphSnapshot,
			artifactVersion: "1.0.0",
			artifactHash: "d".repeat(64),
		},
	},
	catalogSnapshot: {
		catalogSource: "demo-catalog",
		catalogVersion: "2026-02-26",
		catalogHash: "e".repeat(64),
	},
	envelopeVersions: {
		authoringRequestEnvelope: "1.0.0",
		authoringResultEnvelope: "1.0.0",
		authoringErrorEnvelope: "1.0.0",
		authoringDiagnosticsEnvelope: "1.0.0",
	},
};

/**
 * Request envelope fixture.
 */
export const authoringRequestEnvelopeFixture = {
	envelopeVersion: "1.0.0",
	requestId: "req-001",
	requestedAt: fixtureTimestamp,
	operation: "diagnose",
	payload: {
		specPath: "docs/demo.yml",
	},
	meta: {
		traceId: "trace-001",
		documentUri: "spec://docs/demo.yml",
	},
} satisfies AuthoringRequestEnvelope;

/**
 * Result envelope fixture.
 */
export const authoringResultEnvelopeFixture = {
	envelopeVersion: "1.0.0",
	requestId: "req-001",
	ok: true,
	result: {
		diagnosticsCount: 0,
	},
	timings: {
		startedAt: fixtureTimestamp,
		completedAt: "2026-02-26T00:00:00.010Z",
		durationMs: 10,
	},
} satisfies AuthoringResultEnvelope;

/**
 * Error envelope fixture.
 */
export const authoringErrorEnvelopeFixture = {
	envelopeVersion: "1.0.0",
	requestId: "req-001",
	ok: false,
	error: {
		code: "catalog_mismatch_error",
		message: "Capability catalog hash does not match lockfile.",
		retryable: false,
	},
} satisfies AuthoringErrorEnvelope;

/**
 * Diagnostics envelope fixture.
 */
export const authoringDiagnosticsEnvelopeFixture = {
	envelopeVersion: "1.0.0",
	documentUri: "spec://docs/demo.yml",
	generatedAt: fixtureTimestamp,
	parity: {
		status: "mismatch",
		lockfileHash: "f".repeat(64),
	},
	diagnostics: [
		{
			code: "catalog_mismatch_error",
			severity: "error",
			message: "Catalog hash mismatch.",
			path: "catalogSnapshot.catalogHash",
			range: {
				start: { line: 1, character: 1 },
				end: { line: 1, character: 10 },
			},
			staleArtifacts: true,
		},
	],
} satisfies AuthoringDiagnosticsEnvelope;

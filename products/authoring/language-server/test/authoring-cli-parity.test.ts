import { describe, expect, test } from "bun:test";

import { envelopesContracts } from "@gooi/authoring-contracts/envelopes";
import { buildCapabilityIndexSnapshot } from "@gooi/capability-index";
import type { BuildCapabilityIndexSnapshotInput } from "@gooi/capability-index/contracts";
import { executeAuthoringCliEnvelope } from "../src/features/cli/execute-authoring-cli-envelope";
import { listAuthoringCompletionItems } from "../src/features/completion/list-authoring-completion-items";
import { publishAuthoringDiagnostics } from "../src/features/diagnostics/publish-authoring-diagnostics";
import { applyAuthoringRename } from "../src/features/rename/apply-authoring-rename";
import { authoringActionAndRenameFixture } from "./fixtures/authoring-action-and-rename.fixture";
import { authoringReadFixture } from "./fixtures/authoring-read.fixture";

const { parseAuthoringErrorEnvelope, parseAuthoringResultEnvelope } =
	envelopesContracts;

const makeRequestEnvelope = (input: {
	readonly requestId: string;
	readonly operation: "diagnose" | "complete" | "rename" | "index.build";
	readonly payload: unknown;
}) => ({
	envelopeVersion: "1.0.0" as const,
	requestId: input.requestId,
	requestedAt: "2026-02-28T00:00:00.000Z",
	operation: input.operation,
	payload: input.payload,
});

describe("authoring cli parity", () => {
	test("keeps diagnose output equivalent to language-server diagnostics", () => {
		const expected = publishAuthoringDiagnostics({
			context: authoringReadFixture,
			generatedAt: "2026-02-28T00:00:00.000Z",
		});
		const response = executeAuthoringCliEnvelope(
			makeRequestEnvelope({
				requestId: "req-diagnose",
				operation: "diagnose",
				payload: {
					context: authoringReadFixture,
					generatedAt: "2026-02-28T00:00:00.000Z",
				},
			}),
		);
		const parsed = parseAuthoringResultEnvelope(response);
		expect(parsed.result).toEqual(expected);
	});

	test("keeps mismatch diagnostics equivalent between cli and language-server", () => {
		const context = {
			...authoringReadFixture,
			lockfile: authoringReadFixture.staleCatalogLockfile,
		};
		const expected = publishAuthoringDiagnostics({
			context,
			generatedAt: "2026-02-28T00:00:00.000Z",
		});
		const response = executeAuthoringCliEnvelope(
			makeRequestEnvelope({
				requestId: "req-diagnose-mismatch",
				operation: "diagnose",
				payload: {
					context,
					generatedAt: "2026-02-28T00:00:00.000Z",
				},
			}),
		);
		const parsed = parseAuthoringResultEnvelope(response);
		expect(parsed.result).toEqual(expected);
	});

	test("keeps completion output equivalent to language-server completion", () => {
		const payload = {
			context: authoringReadFixture,
			position: { line: 3, character: 10 },
		};
		const expected = listAuthoringCompletionItems(payload);
		const response = executeAuthoringCliEnvelope(
			makeRequestEnvelope({
				requestId: "req-complete",
				operation: "complete",
				payload,
			}),
		);
		const parsed = parseAuthoringResultEnvelope(response);
		expect(parsed.result).toEqual(expected);
	});

	test("returns typed rename error envelopes equivalent to rename contract errors", () => {
		const payload = {
			context: authoringActionAndRenameFixture,
			position: { line: 12, character: 10 },
			newName: "existing_ids",
		};
		const expected = applyAuthoringRename(payload);
		const response = executeAuthoringCliEnvelope(
			makeRequestEnvelope({
				requestId: "req-rename-conflict",
				operation: "rename",
				payload,
			}),
		);
		const parsed = parseAuthoringErrorEnvelope(response);
		expect(expected.ok).toBe(false);
		if (expected.ok) {
			throw new Error("Rename fixture must produce a conflict error.");
		}
		expect(parsed.error.code).toBe(expected.error.code);
		expect(parsed.error.message).toBe(expected.error.message);
	});

	test("supports index.build command with deterministic capability index output", () => {
		const input: BuildCapabilityIndexSnapshotInput = {
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
			catalogCapabilities: [],
		};
		const expected = buildCapabilityIndexSnapshot(input);
		const response = executeAuthoringCliEnvelope(
			makeRequestEnvelope({
				requestId: "req-index",
				operation: "index.build",
				payload: input,
			}),
		);
		const parsed = parseAuthoringResultEnvelope(response);
		expect(parsed.result).toEqual(expected);
	});
});

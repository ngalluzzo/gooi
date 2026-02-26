import { describe, expect, test } from "bun:test";

import { createAuthoringSession } from "../src/features/session/create-authoring-session";
import { authoringReadFixture } from "./fixtures/authoring-read.fixture";

describe("lsp session integration", () => {
	test("runs didChange -> diagnostics -> completion loop", () => {
		const session = createAuthoringSession({
			context: authoringReadFixture,
			initialVersion: 1,
		});

		const initialDiagnostics = session.publishDiagnostics();
		expect(initialDiagnostics.parity.status).toBe("matched");

		const changedText = authoringReadFixture.documentText.replace(
			"refresh_on_signals:",
			"do:",
		);
		session.didChange({
			version: 2,
			documentText: changedText,
		});

		const diagnosticsAfterChange = session.publishDiagnostics();
		expect(diagnosticsAfterChange.parity.status).toBe("matched");

		const completion = session.completion({
			position: { line: 10, character: 10 },
		});
		expect(completion.items.map((item) => item.label)).toEqual([
			"gooi-marketplace-bun-sqlite.insert_message",
			"message.is_allowed",
		]);
	});

	test("rejects out-of-order didChange versions", () => {
		const session = createAuthoringSession({
			context: authoringReadFixture,
			initialVersion: 3,
		});

		expect(() =>
			session.didChange({
				version: 2,
				documentText: authoringReadFixture.documentText,
			}),
		).toThrow(
			"Out-of-order didChange version '2' received; current version is '3'.",
		);
	});
});

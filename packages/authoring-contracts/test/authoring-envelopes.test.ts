import { describe, expect, test } from "bun:test";

import { parseAuthoringDiagnosticsEnvelope } from "../src/envelopes/authoring-diagnostics-envelope";
import { parseAuthoringErrorEnvelope } from "../src/envelopes/authoring-error-envelope";
import { parseAuthoringRequestEnvelope } from "../src/envelopes/authoring-request-envelope";
import { parseAuthoringResultEnvelope } from "../src/envelopes/authoring-result-envelope";
import {
	authoringDiagnosticsEnvelopeFixture,
	authoringErrorEnvelopeFixture,
	authoringRequestEnvelopeFixture,
	authoringResultEnvelopeFixture,
} from "./fixtures/authoring-contracts.fixture";

describe("authoring-contracts envelopes", () => {
	test("parses valid request, result, error, and diagnostics envelopes", () => {
		expect(
			parseAuthoringRequestEnvelope(authoringRequestEnvelopeFixture),
		).toEqual(authoringRequestEnvelopeFixture);
		expect(
			parseAuthoringResultEnvelope(authoringResultEnvelopeFixture),
		).toEqual(authoringResultEnvelopeFixture);
		expect(parseAuthoringErrorEnvelope(authoringErrorEnvelopeFixture)).toEqual(
			authoringErrorEnvelopeFixture,
		);
		expect(
			parseAuthoringDiagnosticsEnvelope(authoringDiagnosticsEnvelopeFixture),
		).toEqual(authoringDiagnosticsEnvelopeFixture);
	});

	test("rejects request envelopes with unknown operation", () => {
		const invalid = {
			...authoringRequestEnvelopeFixture,
			operation: "simulate",
		};

		expect(() => parseAuthoringRequestEnvelope(invalid)).toThrow();
	});

	test("rejects error envelopes with unknown error code", () => {
		const invalid = {
			...authoringErrorEnvelopeFixture,
			error: {
				...authoringErrorEnvelopeFixture.error,
				code: "unknown_error",
			},
		};

		expect(() => parseAuthoringErrorEnvelope(invalid)).toThrow();
	});
});

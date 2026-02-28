import { envelopesContracts } from "@gooi/authoring-contracts/envelopes";
import { stableStringify } from "@gooi/stable-json";

import {
	type AuthoringConformanceCheck,
	authoringConformanceCheckSchema,
} from "./contracts";

export const CONFORMANCE_GENERATED_AT = "2026-02-28T00:00:00.000Z";

export const makeCheck = (
	value: AuthoringConformanceCheck,
): AuthoringConformanceCheck => authoringConformanceCheckSchema.parse(value);

export const makeCliEnvelope = (input: {
	readonly requestId: string;
	readonly operation: "diagnose" | "complete";
	readonly payload: unknown;
}) => ({
	envelopeVersion: "1.0.0" as const,
	requestId: input.requestId,
	requestedAt: CONFORMANCE_GENERATED_AT,
	operation: input.operation,
	payload: input.payload,
});

export const parseCliResultEnvelope =
	envelopesContracts.parseAuthoringResultEnvelope;

export const stableEqual = (left: unknown, right: unknown): boolean =>
	stableStringify(left) === stableStringify(right);

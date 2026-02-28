import { createTrustError } from "./errors";
import {
	type PublishTrustRevocationResult,
	type PullTrustRevocationFeedResult,
	publishTrustRevocationInputSchema,
	pullTrustRevocationFeedInputSchema,
} from "./revocation-model";

const toProviderRef = (providerId: string, providerVersion: string): string =>
	`${providerId}@${providerVersion}`;

const toEventId = (input: {
	providerId: string;
	providerVersion: string;
	action: string;
	replayKey: string;
}): string =>
	`${input.providerId}@${input.providerVersion}:${input.action}:${input.replayKey}`;

export const publishTrustRevocation = (
	value: unknown,
): PublishTrustRevocationResult => {
	const parsedInput = publishTrustRevocationInputSchema.safeParse(value);
	if (!parsedInput.success) {
		return {
			ok: false,
			error: createTrustError(
				"trust_request_schema_error",
				"Trust revocation publish input failed schema validation.",
				parsedInput.error.issues,
			),
		};
	}

	const input = parsedInput.data;
	const existingByReplay = input.ledger.events.find(
		(event) => event.replayKey === input.replayKey,
	);
	if (existingByReplay !== undefined) {
		if (
			existingByReplay.providerId === input.providerId &&
			existingByReplay.providerVersion === input.providerVersion &&
			existingByReplay.action === input.action
		) {
			return {
				ok: true,
				ledger: input.ledger,
				event: existingByReplay,
			};
		}
		return {
			ok: false,
			error: createTrustError(
				"trust_policy_violation_error",
				"Replay key conflict detected for revocation event publish.",
				[
					{
						path: ["replayKey"],
						message: `Replay key '${input.replayKey}' was reused with different revocation payload.`,
					},
				],
			),
		};
	}

	const event = {
		eventId: toEventId(input),
		sequence: input.ledger.lastSequence + 1,
		occurredAt: input.occurredAt,
		actorId: input.actorId,
		action: input.action,
		providerId: input.providerId,
		providerVersion: input.providerVersion,
		reason: input.reason,
		replayKey: input.replayKey,
	};
	return {
		ok: true,
		ledger: {
			events: [...input.ledger.events, event],
			lastSequence: event.sequence,
		},
		event,
	};
};

export const pullTrustRevocationFeed = (
	value: unknown,
): PullTrustRevocationFeedResult => {
	const parsedInput = pullTrustRevocationFeedInputSchema.parse(value);
	const sorted = [...parsedInput.ledger.events].sort(
		(left, right) => left.sequence - right.sequence,
	);
	const events = sorted
		.filter((event) => event.sequence > parsedInput.sinceSequence)
		.slice(0, parsedInput.maxEvents);
	return {
		events,
		latestSequence: parsedInput.ledger.lastSequence,
	};
};

export const deriveRevokedProviderRefs = (
	events: readonly {
		sequence: number;
		action: "revoke" | "restore";
		providerId: string;
		providerVersion: string;
	}[],
): string[] => {
	const current = new Map<string, "revoke" | "restore">();
	[...events]
		.sort((left, right) => left.sequence - right.sequence)
		.forEach((event) => {
			current.set(
				toProviderRef(event.providerId, event.providerVersion),
				event.action,
			);
		});
	return [...current.entries()]
		.filter(([, action]) => action === "revoke")
		.map(([providerRef]) => providerRef)
		.sort((left, right) => left.localeCompare(right));
};

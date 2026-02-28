import { z } from "zod";
import { semverSchema } from "../shared/semver";
import { trustErrorSchema } from "./errors";

export const trustRevocationActionSchema = z.enum(["revoke", "restore"]);

export type TrustRevocationAction = z.infer<typeof trustRevocationActionSchema>;

export const trustRevocationEventSchema = z.object({
	eventId: z.string().min(1),
	sequence: z.number().int().positive(),
	occurredAt: z.string().datetime({ offset: true }),
	actorId: z.string().min(1),
	action: trustRevocationActionSchema,
	providerId: z.string().min(1),
	providerVersion: semverSchema,
	reason: z.string().min(1),
	replayKey: z.string().min(1),
});

export type TrustRevocationEvent = z.infer<typeof trustRevocationEventSchema>;

export const trustRevocationLedgerSchema = z.object({
	events: z.array(trustRevocationEventSchema).default([]),
	lastSequence: z.number().int().nonnegative().default(0),
});

export type TrustRevocationLedger = z.infer<typeof trustRevocationLedgerSchema>;

export const publishTrustRevocationInputSchema = z.object({
	ledger: trustRevocationLedgerSchema,
	actorId: z.string().min(1),
	occurredAt: z.string().datetime({ offset: true }),
	action: trustRevocationActionSchema.default("revoke"),
	providerId: z.string().min(1),
	providerVersion: semverSchema,
	reason: z.string().min(1),
	replayKey: z.string().min(1),
});

export type PublishTrustRevocationInput = z.input<
	typeof publishTrustRevocationInputSchema
>;

export const publishTrustRevocationSuccessSchema = z.object({
	ok: z.literal(true),
	ledger: trustRevocationLedgerSchema,
	event: trustRevocationEventSchema,
});

export const publishTrustRevocationFailureSchema = z.object({
	ok: z.literal(false),
	error: trustErrorSchema,
});

export const publishTrustRevocationResultSchema = z.discriminatedUnion("ok", [
	publishTrustRevocationSuccessSchema,
	publishTrustRevocationFailureSchema,
]);

export type PublishTrustRevocationResult = z.infer<
	typeof publishTrustRevocationResultSchema
>;

export const pullTrustRevocationFeedInputSchema = z.object({
	ledger: trustRevocationLedgerSchema,
	sinceSequence: z.number().int().nonnegative().default(0),
	maxEvents: z.number().int().positive().default(1_000),
});

export type PullTrustRevocationFeedInput = z.input<
	typeof pullTrustRevocationFeedInputSchema
>;

export const pullTrustRevocationFeedResultSchema = z.object({
	events: z.array(trustRevocationEventSchema),
	latestSequence: z.number().int().nonnegative(),
});

export type PullTrustRevocationFeedResult = z.infer<
	typeof pullTrustRevocationFeedResultSchema
>;

export const resolverRevocationStateSchema = z.object({
	lastSyncedAt: z.string().datetime({ offset: true }),
	evaluatedAt: z.string().datetime({ offset: true }),
	maxStalenessSeconds: z.number().int().positive().default(300),
	revokedProviderRefs: z.array(z.string().min(1)).default([]),
});

export type ResolverRevocationState = z.infer<
	typeof resolverRevocationStateSchema
>;

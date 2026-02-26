import type { ResultEnvelope } from "../entrypoint-runtime-contracts/entrypoint-runtime.contracts";

/**
 * Stored idempotency record used for replay and conflict detection.
 */
export interface IdempotencyRecord {
	/** Deterministic hash of bound invocation input payload. */
	readonly inputHash: string;
	/** Previously computed execution result envelope. */
	readonly result: ResultEnvelope<unknown, unknown>;
}

/**
 * Key-value store interface for mutation idempotency behavior.
 */
export interface IdempotencyStore {
	/** Loads a stored idempotency record by deterministic scope key. */
	readonly load: (scopeKey: string) => Promise<IdempotencyRecord | null>;
	/** Saves a deterministic scope key record for future replay checks. */
	readonly save: (scopeKey: string, record: IdempotencyRecord) => Promise<void>;
}

/**
 * Creates an in-memory idempotency store implementation.
 *
 * @returns Mutable in-memory idempotency store.
 *
 * @example
 * const store = createInMemoryIdempotencyStore();
 */
export const createInMemoryIdempotencyStore = (): IdempotencyStore => {
	const records = new Map<string, IdempotencyRecord>();
	return {
		load: async (scopeKey) => records.get(scopeKey) ?? null,
		save: async (scopeKey, record) => {
			records.set(scopeKey, record);
		},
	};
};

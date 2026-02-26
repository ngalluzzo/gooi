import {
	createHostReplayStorePort,
	createHostReplayStoreProvider,
	type HostReplayRecord,
	type HostReplayStorePort,
} from "@gooi/host-contracts/replay";

/**
 * Creates an in-memory replay-store port implementation.
 */
export const createMemoryReplayStorePort = <
	TResult = unknown,
>(): HostReplayStorePort<TResult> => {
	const records = new Map<string, HostReplayRecord<TResult>>();
	return createHostReplayStorePort({
		load: async (scopeKey) => records.get(scopeKey) ?? null,
		save: async ({ scopeKey, record }) => {
			records.set(scopeKey, record);
		},
	});
};

/**
 * Reference replay-store provider for marketplace contributor implementations.
 */
export const memoryReplayStoreProvider = createHostReplayStoreProvider({
	manifest: {
		providerId: "gooi.marketplace.memory",
		providerVersion: "1.0.0",
		hostApiRange: "^1.0.0",
	},
	createPort: createMemoryReplayStorePort,
});

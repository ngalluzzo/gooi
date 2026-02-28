import type {
	HostReplayRecord,
	HostReplayStorePort,
} from "@gooi/host-contracts/replay";
import { replayContracts } from "@gooi/host-contracts/replay";

/**
 * Creates an in-memory replay-store port implementation.
 */
export const createMemoryReplayStorePort = <
	TResult = unknown,
>(): HostReplayStorePort<TResult> => {
	const records = new Map<string, HostReplayRecord<TResult>>();
	return replayContracts.createHostReplayStorePort({
		load: async (scopeKey: string) => records.get(scopeKey) ?? null,
		save: async ({
			scopeKey,
			record,
		}: {
			scopeKey: string;
			record: HostReplayRecord<TResult>;
			ttlSeconds: number;
		}) => {
			records.set(scopeKey, record);
		},
	});
};

/**
 * Reference replay-store provider for marketplace contributor implementations.
 */
export const memoryReplayStoreProvider =
	replayContracts.createHostReplayStoreProvider({
		manifest: {
			providerId: "gooi.marketplace.memory",
			providerVersion: "1.0.0",
			hostApiRange: "^1.0.0",
		},
		createPort: createMemoryReplayStorePort,
	});

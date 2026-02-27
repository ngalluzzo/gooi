import {
	createHostReplayStorePort,
	type HostReplayRecord,
} from "@gooi/host-contracts/replay";
import type { runEntrypoint } from "../../../src/engine";

export const createReplayStore = () => {
	const records = new Map<
		string,
		HostReplayRecord<Awaited<ReturnType<typeof runEntrypoint>>>
	>();
	const savedTtls: number[] = [];
	const store = createHostReplayStorePort({
		load: async (scopeKey) => records.get(scopeKey) ?? null,
		save: async ({ scopeKey, record, ttlSeconds }) => {
			savedTtls.push(ttlSeconds);
			records.set(scopeKey, record);
		},
	});
	return { store, savedTtls };
};

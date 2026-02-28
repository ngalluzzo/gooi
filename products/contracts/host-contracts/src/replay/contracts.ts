/**
 * Canonical boundary contract API.
 */
import * as replay from "./replay";

export type {
	CreateHostReplayStorePortInput,
	CreateHostReplayStoreProviderInput,
	HostReplayRecord,
	HostReplayStorePort,
	HostReplayStoreProvider,
	HostReplayStoreProviderManifest,
} from "./replay";

export const replayContracts = Object.freeze({
	createHostReplayStorePort: replay.createHostReplayStorePort,
	createHostReplayStoreProvider: replay.createHostReplayStoreProvider,
});

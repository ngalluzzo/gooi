import {
	createHostPortProvider,
	createHostPortProviderManifest,
	type HostPortContractDescriptor,
	type HostPortProvider,
	type HostPortProviderManifest,
} from "../provider/provider";

/**
 * Replay record used for conflict detection and deterministic result replay.
 */
export interface HostReplayRecord<TResult = unknown> {
	/** Deterministic hash of bound invocation input payload. */
	readonly inputHash: string;
	/** Previously computed execution result envelope. */
	readonly result: TResult;
}

/**
 * Host replay store contract consumed by idempotent mutation orchestration.
 */
export interface HostReplayStorePort<TResult = unknown> {
	/** Loads one replay record by scope key. */
	readonly load: (
		scopeKey: string,
	) => Promise<HostReplayRecord<TResult> | null>;
	/** Saves one replay record with explicit TTL policy. */
	readonly save: (input: {
		readonly scopeKey: string;
		readonly record: HostReplayRecord<TResult>;
		readonly ttlSeconds: number;
	}) => Promise<void>;
}

/**
 * Input payload for host replay store construction.
 */
export interface CreateHostReplayStorePortInput<TResult = unknown> {
	readonly load: (
		scopeKey: string,
	) => Promise<HostReplayRecord<TResult> | null>;
	readonly save: (input: {
		readonly scopeKey: string;
		readonly record: HostReplayRecord<TResult>;
		readonly ttlSeconds: number;
	}) => Promise<void>;
}

/**
 * Creates a host replay store port from caller-provided callbacks.
 */
export const createHostReplayStorePort = <TResult = unknown>(
	input: CreateHostReplayStorePortInput<TResult>,
): HostReplayStorePort<TResult> => ({
	load: input.load,
	save: input.save,
});

/**
 * Stable replay-store host contract descriptor for provider manifests.
 */
const hostReplayStoreContract = {
	id: "gooi.host.replay-store",
	version: "1.0.0",
} as const satisfies HostPortContractDescriptor;

/**
 * Provider manifest for replay-store implementations.
 */
export type HostReplayStoreProviderManifest = HostPortProviderManifest<
	typeof hostReplayStoreContract
>;

/**
 * Replay-store provider contract consumed by marketplace contributors.
 */
export type HostReplayStoreProvider = HostPortProvider<
	<TReplayResult = unknown>() => HostReplayStorePort<TReplayResult>,
	typeof hostReplayStoreContract
>;

/**
 * Input payload for replay-store provider construction.
 */
export interface CreateHostReplayStoreProviderInput {
	readonly manifest: {
		readonly providerId: string;
		readonly providerVersion: string;
		readonly hostApiRange: string;
	};
	readonly createPort: <
		TReplayResult = unknown,
	>() => HostReplayStorePort<TReplayResult>;
}

/**
 * Creates a replay-store provider definition.
 */
export const createHostReplayStoreProvider = (
	input: CreateHostReplayStoreProviderInput,
): HostReplayStoreProvider =>
	createHostPortProvider({
		manifest: createHostPortProviderManifest({
			manifest: input.manifest,
			contract: hostReplayStoreContract,
		}),
		createPort: input.createPort,
	});

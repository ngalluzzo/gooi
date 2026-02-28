import { clockContracts, type HostClockPort } from "@gooi/host-contracts/clock";

/**
 * Input payload for in-memory clock configuration.
 */
export interface CreateMemoryClockPortInput {
	/** Initial timestamp used for the first `nowIso` call. */
	readonly startAtIso?: string;
	/** Milliseconds added after each `nowIso` call. */
	readonly stepMs?: number;
}

/**
 * Creates an in-memory clock port with deterministic tick behavior.
 */
export const createMemoryClockPort = (
	input?: CreateMemoryClockPortInput,
): HostClockPort => {
	const startAtMs = Date.parse(input?.startAtIso ?? "2026-01-01T00:00:00.000Z");
	const stepMs = input?.stepMs ?? 1;
	let currentMs = Number.isNaN(startAtMs)
		? Date.parse("2026-01-01T00:00:00.000Z")
		: startAtMs;
	return {
		nowIso: () => {
			const value = new Date(currentMs).toISOString();
			currentMs += stepMs;
			return value;
		},
	};
};

/**
 * Reference clock provider for marketplace contributor implementations.
 */
export const memoryClockProvider = clockContracts.createHostClockProvider({
	manifest: {
		providerId: "gooi.marketplace.memory",
		providerVersion: "1.0.0",
		hostApiRange: "^1.0.0",
	},
	createPort: createMemoryClockPort,
});

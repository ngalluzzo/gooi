import {
	areHostPortConformanceChecksPassing,
	buildHostPortConformanceCheck,
} from "../host-port-conformance/host-port-conformance";
import type {
	ReplayStoreConformanceReport,
	RunReplayStoreConformanceInput,
} from "./contracts";

/**
 * Runs replay-store conformance checks for marketplace providers.
 */
export const runReplayStoreConformance = async (
	input: RunReplayStoreConformanceInput,
): Promise<ReplayStoreConformanceReport> => {
	const checks: Array<ReplayStoreConformanceReport["checks"][number]> = [];
	const store = input.createPort<{ marker: string }>();

	const missing = await store.load("scope-missing");
	checks.push(
		buildHostPortConformanceCheck(
			"load_miss_returns_null",
			missing === null,
			missing === null
				? "Missing scope returned null."
				: "Missing scope returned a replay record.",
		),
	);

	await store.save({
		scopeKey: "scope-a",
		record: {
			inputHash: "hash-a",
			result: { marker: "a" },
		},
		ttlSeconds: 60,
	});
	const loadedA = await store.load("scope-a");
	checks.push(
		buildHostPortConformanceCheck(
			"save_then_load_roundtrip",
			loadedA?.inputHash === "hash-a" && loadedA.result.marker === "a",
			loadedA?.inputHash === "hash-a" && loadedA.result.marker === "a"
				? "Saved record loaded successfully."
				: "Saved record could not be loaded intact.",
		),
	);

	await store.save({
		scopeKey: "scope-b",
		record: {
			inputHash: "hash-b",
			result: { marker: "b" },
		},
		ttlSeconds: 60,
	});
	const loadedB = await store.load("scope-b");
	const loadedAAgain = await store.load("scope-a");
	checks.push(
		buildHostPortConformanceCheck(
			"scope_isolation_enforced",
			loadedB?.inputHash === "hash-b" && loadedAAgain?.inputHash === "hash-a",
			loadedB?.inputHash === "hash-b" && loadedAAgain?.inputHash === "hash-a"
				? "Multiple scopes remained isolated."
				: "Replay records leaked across scopes.",
		),
	);

	await store.save({
		scopeKey: "scope-a",
		record: {
			inputHash: "hash-a-2",
			result: { marker: "a-2" },
		},
		ttlSeconds: 60,
	});
	const overwritten = await store.load("scope-a");
	checks.push(
		buildHostPortConformanceCheck(
			"save_overwrites_existing_scope",
			overwritten?.inputHash === "hash-a-2" &&
				overwritten.result.marker === "a-2",
			overwritten?.inputHash === "hash-a-2" &&
				overwritten.result.marker === "a-2"
				? "Latest save replaced prior scope record."
				: "Scope overwrite behavior is incorrect.",
		),
	);

	return {
		passed: areHostPortConformanceChecksPassing(checks),
		checks,
	};
};

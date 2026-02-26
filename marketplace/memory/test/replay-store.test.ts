import { describe, expect, test } from "bun:test";
import { runReplayStoreConformance } from "@gooi/conformance/replay-store";
import {
	createMemoryReplayStorePort,
	memoryReplayStoreProvider,
} from "../src/replay-store/replay-store";

describe("marketplace-memory replay-store", () => {
	test("passes replay-store conformance", async () => {
		const report = await runReplayStoreConformance({
			createPort: createMemoryReplayStorePort,
		});
		expect(report.passed).toBe(true);
		expect(report.checks.every((check) => check.passed)).toBe(true);
	});

	test("publishes stable provider metadata", () => {
		expect(memoryReplayStoreProvider.manifest.providerId).toBe(
			"gooi.marketplace.memory",
		);
		expect(memoryReplayStoreProvider.manifest.contract.id).toBe(
			"gooi.host.replay-store",
		);
	});
});

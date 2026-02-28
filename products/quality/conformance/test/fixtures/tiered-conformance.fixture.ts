import type { RunTieredConformanceInput } from "../../src/tiered-conformance/contracts";
import { getTieredConformanceDefinition } from "../../src/tiered-conformance/definitions";

export const createTieredConformanceFixture =
	(): RunTieredConformanceInput => ({
		definition: getTieredConformanceDefinition("smoke"),
		executeSuite: async (suite) => ({
			suiteId: suite.suiteId,
			passed: true,
			runtimeMs: Math.floor(suite.maxRuntimeMs / 2),
			flakyRate: 0,
			detail: `${suite.suiteId} passed`,
		}),
	});

export const createTieredConformanceRuntimeFailureFixture =
	(): RunTieredConformanceInput => ({
		definition: getTieredConformanceDefinition("smoke"),
		executeSuite: async (suite) => ({
			suiteId: suite.suiteId,
			passed: true,
			runtimeMs: suite.maxRuntimeMs + 1,
			flakyRate: 0,
			detail: `${suite.suiteId} runtime exceeded`,
		}),
	});

export const createTieredConformanceFlakyFailureFixture =
	(): RunTieredConformanceInput => ({
		definition: getTieredConformanceDefinition("smoke"),
		executeSuite: async (suite) => ({
			suiteId: suite.suiteId,
			passed: true,
			runtimeMs: Math.floor(suite.maxRuntimeMs / 2),
			flakyRate: suite.maxFlakyRate + 0.1,
			detail: `${suite.suiteId} flaky-rate exceeded`,
		}),
	});

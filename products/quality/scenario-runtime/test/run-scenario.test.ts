import { describe, expect, test } from "bun:test";
import { reportPersonaCoverage } from "../src/reports/report-persona-coverage";
import { runScenario } from "../src/run/run-scenario";
import { runScenarioSuite } from "../src/suite/run-scenario-suite";
import {
	createScenarioInvokerFixture,
	scenarioLockSnapshotFixture,
	scenarioPlanSetFixture,
} from "./fixtures/scenario-runtime.fixture";

const getScenario = (scenarioId: "happy_path" | "rejection_path") => {
	const scenario = scenarioPlanSetFixture.scenarios[scenarioId];
	if (scenario === undefined) {
		throw new Error(`Missing scenario fixture: ${scenarioId}`);
	}
	return scenario;
};

describe("scenario-runtime", () => {
	test("runs trigger/expect/capture steps against canonical runtime callbacks", async () => {
		const invoker = createScenarioInvokerFixture();
		const run = await runScenario({
			scenario: getScenario("happy_path"),
			personas: scenarioPlanSetFixture.personas,
			lockSnapshot: scenarioLockSnapshotFixture,
			traceId: "trace_1",
			invocationId: "invocation_1",
			semanticJudge: {
				evaluate: async () => ({ pass: true }),
			},
			...invoker,
		});

		expect(run.ok).toBe(true);
		expect(run.stepResults.length).toBe(2);
		expect(run.captures.first_message).toBe("hello from lock snapshot");
	});

	test("keeps generated trigger inputs lockfile-backed and deterministic", async () => {
		const invoker = createScenarioInvokerFixture();
		const first = await runScenario({
			scenario: getScenario("happy_path"),
			personas: scenarioPlanSetFixture.personas,
			traceId: "trace_2",
			invocationId: "invocation_2",
			semanticJudge: {
				evaluate: async () => ({ pass: true }),
			},
			...invoker,
		});
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}

		const second = await runScenario({
			scenario: getScenario("happy_path"),
			personas: scenarioPlanSetFixture.personas,
			lockSnapshot: first.lockSnapshot,
			traceId: "trace_3",
			invocationId: "invocation_3",
			semanticJudge: {
				evaluate: async () => ({ pass: true }),
			},
			...invoker,
		});

		expect(second.ok).toBe(true);
		expect(second.lockSnapshot).toEqual(first.lockSnapshot);
	});

	test("returns typed scenario failures with step-level traceability", async () => {
		const invoker = createScenarioInvokerFixture();
		const run = await runScenario({
			scenario: getScenario("rejection_path"),
			personas: scenarioPlanSetFixture.personas,
			traceId: "trace_4",
			invocationId: "invocation_4",
			...invoker,
		});

		expect(run.ok).toBe(false);
		expect(run.error?.code).toBe("scenario_trigger_error");
		expect(run.error?.stepIndex).toBe(0);
	});

	test("runs deterministic suites and reports persona coverage", async () => {
		const invoker = createScenarioInvokerFixture();
		const suite = await runScenarioSuite({
			planSet: scenarioPlanSetFixture,
			tags: ["smoke"],
			profile: "simulation",
			runInput: {
				traceId: "trace_suite",
				invocationId: "invocation_suite",
				semanticJudge: {
					evaluate: async () => ({ pass: true }),
				},
				...invoker,
			},
		});

		expect(suite.selectedScenarioIds).toEqual(["happy_path", "rejection_path"]);
		const coverage = reportPersonaCoverage({
			planSet: scenarioPlanSetFixture,
			runs: suite.runs,
		});
		expect(coverage.rows[0]?.personaId).toBe("guest");
		expect(coverage.rows[0]?.totalScenarios).toBe(2);
	});

	test("blocks generated triggers in default_ci profile suites", async () => {
		const invoker = createScenarioInvokerFixture();
		const suite = await runScenarioSuite({
			planSet: scenarioPlanSetFixture,
			tags: ["happy"],
			runInput: {
				traceId: "trace_ci_suite",
				invocationId: "invocation_ci_suite",
				...invoker,
			},
		});

		expect(suite.ok).toBe(false);
		expect(suite.runs[0]?.error?.code).toBe("scenario_policy_error");
	});

	test("blocks provider overrides in default_ci profile runs", async () => {
		const invoker = createScenarioInvokerFixture();
		const run = await runScenario({
			scenario: {
				...getScenario("rejection_path"),
				context: {
					...getScenario("rejection_path").context,
					providerOverrides: { "collections.write": "memory" },
				},
			},
			personas: scenarioPlanSetFixture.personas,
			profile: "default_ci",
			traceId: "trace_ci_provider_override",
			invocationId: "invocation_ci_provider_override",
			...invoker,
		});

		expect(run.ok).toBe(false);
		expect(run.error?.code).toBe("scenario_policy_error");
	});
});

import type { AppTestingScenarioFixture } from "@gooi/app-testing-facade-contracts/fixtures";
import type { CompiledGuardDefinition } from "@gooi/guard-contracts/plans";
import type { ScenarioGeneratedInputLockSnapshot } from "@gooi/scenario-contracts/plans";
import { reportPersonaCoverage } from "@gooi/scenario-runtime/coverage";
import { runScenario } from "@gooi/scenario-runtime/run";
import { runScenarioSuite } from "@gooi/scenario-runtime/suite";
import { compileEntrypointBundle } from "@gooi/spec-compiler";

const signalGuard: CompiledGuardDefinition = {
	sourceRef: {
		primitiveKind: "signal",
		primitiveId: "message.created",
		path: "scenarios.happy_path.steps.1.expect.guard",
	},
	onFail: "abort",
	structural: [
		{
			guardId: "signal_message",
			description: "signal should include payload.message",
			operator: "exists",
			left: { kind: "path", path: "payload.message" },
		},
	],
	semantic: [
		{
			guardId: "signal_tone",
			description: "signal content should be human",
			rule: "Message should read naturally.",
			confidence: "low",
			sampling: { production: 1, simulation: 1, ci: 1 },
		},
	],
};

const compileScenarioPlanSet = () => {
	const compiled = compileEntrypointBundle({
		spec: {
			app: {
				id: "app_testing_fixture",
				name: "App Testing Fixture",
				tz: "UTC",
			},
			domain: { actions: { "guestbook.submit": {} } },
			session: { fields: {} },
			access: {
				default_policy: "deny" as const,
				roles: { authenticated: {} },
			},
			queries: [],
			mutations: [
				{
					id: "submit_message",
					access: { roles: ["authenticated"] },
					in: { message: "text!" },
					run: {
						actionId: "guestbook.submit",
						input: { message: { $expr: { var: "input.message" } } },
					},
				},
			],
			routes: [],
			personas: {
				guest: {
					description: "normal user",
					traits: { tone: "neutral" },
					history: [],
					tags: ["authenticated"],
				},
			},
			scenarios: {
				happy_path: {
					tags: ["smoke"],
					context: { persona: "guest", principal: { subject: "user_1" } },
					steps: [
						{ trigger: { mutation: "submit_message", generate: true } },
						{ expect: { signal: "message.created", guard: signalGuard } },
					],
				},
				rejection_path: {
					tags: ["smoke"],
					context: { persona: "guest", principal: { subject: "user_2" } },
					steps: [
						{
							trigger: {
								mutation: "submit_message",
								input: { message: "spam" },
							},
						},
						{ expect: { signal: "message.created" } },
					],
				},
			},
			wiring: { surfaces: {} },
			views: { nodes: [], screens: [] },
		},
		compilerVersion: "1.0.0",
	});

	if (!compiled.ok) {
		throw new Error(
			`Fixture compile failed: ${compiled.diagnostics.map((item) => item.code).join(",")}`,
		);
	}

	return compiled.bundle.scenarioIR;
};

const planSet = compileScenarioPlanSet();

const lockSnapshot: ScenarioGeneratedInputLockSnapshot = {
	generated: {
		happy_path: {
			0: { message: "hello from lock" },
		},
	},
};

const invokeEntrypoint = async (input: {
	readonly entrypointKind: "mutation" | "query";
	readonly input: Readonly<Record<string, unknown>>;
}) => {
	if (input.entrypointKind === "mutation") {
		const message = String(input.input.message ?? "");
		if (message.includes("spam")) {
			return {
				ok: false,
				error: { code: "moderation_rejected" },
				emittedSignals: [],
			};
		}
		return {
			ok: true,
			output: { message },
			emittedSignals: [{ signalId: "message.created", payload: { message } }],
		};
	}
	return { ok: true, output: { rows: [] } };
};

export const createAppTestingFixture = (): AppTestingScenarioFixture => ({
	planSet,
	lockSnapshot,
	harness: {
		runScenario: async (input) => {
			const scenario = planSet.scenarios[input.scenarioId];
			if (scenario === undefined) {
				throw new Error(`Unknown scenario: ${input.scenarioId}`);
			}
			return runScenario({
				scenario,
				personas: planSet.personas,
				...(input.lockSnapshot === undefined
					? {}
					: { lockSnapshot: input.lockSnapshot }),
				traceId: `trace_${input.scenarioId}`,
				invocationId: `invocation_${input.scenarioId}`,
				semanticJudge: { evaluate: async () => ({ pass: true }) },
				invokeEntrypoint,
			});
		},
		runSuite: async (input) =>
			runScenarioSuite({
				planSet,
				profile: "simulation",
				...(input.tags === undefined ? {} : { tags: input.tags }),
				...(input.lockSnapshot === undefined
					? {}
					: { lockSnapshot: input.lockSnapshot }),
				runInput: {
					traceId: "trace_suite",
					invocationId: "invocation_suite",
					semanticJudge: { evaluate: async () => ({ pass: true }) },
					invokeEntrypoint,
				},
			}),
		coverageReport: (input) =>
			reportPersonaCoverage({ planSet, runs: input.runs }),
	},
});

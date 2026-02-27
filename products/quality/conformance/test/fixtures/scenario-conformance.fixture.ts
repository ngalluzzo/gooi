import type { CompiledGuardDefinition } from "@gooi/guard-contracts/plans/guard-plan";
import type {
	CompiledPersonaDefinition,
	CompiledScenarioPlanSet,
	ScenarioGeneratedInputLockSnapshot,
} from "@gooi/scenario-contracts/plans/scenario-plan";
import { reportPersonaCoverage } from "@gooi/scenario-runtime/coverage";
import { runScenario } from "@gooi/scenario-runtime/run";
import { runScenarioSuite } from "@gooi/scenario-runtime/suite";

const signalGuard: CompiledGuardDefinition = {
	sourceRef: {
		primitiveKind: "signal",
		primitiveId: "message.created",
		path: "scenarios.happy_path.steps.1.guard",
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

const planSet: CompiledScenarioPlanSet = {
	artifactVersion: "1.0.0",
	artifactHash: "scenario_hash",
	sectionHash: "scenario_section_hash",
	personas: {
		guest: {
			personaId: "guest",
			description: "normal user",
			traits: { tone: "neutral" },
			history: [],
			tags: ["authenticated"],
		},
	},
	scenarios: {
		happy_path: {
			scenarioId: "happy_path",
			tags: ["smoke"],
			context: { personaId: "guest", principal: { subject: "user_1" } },
			steps: [
				{
					kind: "trigger",
					trigger: {
						entrypointKind: "mutation",
						entrypointId: "submit_message",
						generate: true,
					},
				},
				{
					kind: "expect",
					expect: { kind: "signal", signalId: "message.created" },
					guard: signalGuard,
				},
			],
		},
		rejection_path: {
			scenarioId: "rejection_path",
			tags: ["smoke"],
			context: { personaId: "guest", principal: { subject: "user_2" } },
			steps: [
				{
					kind: "trigger",
					trigger: {
						entrypointKind: "mutation",
						entrypointId: "submit_message",
						input: { message: "spam" },
					},
				},
			],
		},
	},
};

const lockSnapshot: ScenarioGeneratedInputLockSnapshot = {
	generated: {
		happy_path: {
			0: { message: "hello from lock" },
		},
	},
};

const invokeEntrypoint = async (input: {
	readonly entrypointKind: "mutation" | "query";
	readonly entrypointId: string;
	readonly input: Readonly<Record<string, unknown>>;
	readonly context: {
		readonly principal?: Readonly<Record<string, unknown>>;
		readonly session?: Readonly<Record<string, unknown>>;
		readonly persona?: CompiledPersonaDefinition;
		readonly providerOverrides?: Readonly<Record<string, unknown>>;
	};
}) => {
	if (input.entrypointKind === "mutation") {
		const message = String(input.input.message ?? "");
		if (message.includes("spam")) {
			return {
				ok: false,
				error: { code: "moderation_rejected" },
				emittedSignals: [
					{ signalId: "message.rejected", payload: { message } },
				],
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

export const createScenarioConformanceFixture = () => ({
	planSet,
	lockSnapshot,
	runScenario: async (input: {
		readonly scenarioId: string;
		readonly lockSnapshot?: ScenarioGeneratedInputLockSnapshot;
	}) => {
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
			semanticJudge: {
				evaluate: async () => ({ pass: true }),
			},
			invokeEntrypoint,
		});
	},
	runSuite: async (input: {
		readonly lockSnapshot?: ScenarioGeneratedInputLockSnapshot;
		readonly tags?: readonly string[];
	}) =>
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
				semanticJudge: {
					evaluate: async () => ({ pass: true }),
				},
				invokeEntrypoint,
			},
		}),
	coverageReport: (input: {
		readonly runs: readonly Awaited<ReturnType<typeof runScenario>>[];
	}) =>
		reportPersonaCoverage({
			planSet,
			runs: input.runs,
		}),
});

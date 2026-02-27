import type {
	CompiledGuardDefinition,
	GuardRuntimeEnvironment,
} from "@gooi/guard-contracts/plans/guard-plan";
import type {
	CompiledPersonaDefinition,
	CompiledScenarioPlanSet,
	ScenarioGeneratedInputLockSnapshot,
} from "@gooi/scenario-contracts/plans/scenario-plan";
import type { ScenarioExecutionProfile } from "../../src/run/contracts";

const signalExpectationGuard: CompiledGuardDefinition = {
	sourceRef: {
		primitiveKind: "signal",
		primitiveId: "message.created",
		path: "scenarios.happy_path.steps.1.expect.guards",
	},
	onFail: "abort",
	structural: [
		{
			guardId: "signal_has_message",
			description: "signal payload has message",
			operator: "exists",
			left: { kind: "path", path: "payload.message" },
		},
	],
	semantic: [
		{
			guardId: "signal_human_tone",
			description: "signal message should read naturally",
			rule: "Message should read as natural user text.",
			confidence: "low",
			sampling: { production: 1, simulation: 1, ci: 1 },
		},
	],
};

export const scenarioPlanSetFixture: CompiledScenarioPlanSet = {
	artifactVersion: "1.0.0",
	artifactHash: "scenario_artifact_hash",
	sectionHash: "scenario_section_hash",
	personas: {
		guest: {
			personaId: "guest",
			description: "Normal authenticated user",
			traits: { tone: "neutral" },
			history: [],
			tags: ["authenticated"],
		},
	},
	scenarios: {
		happy_path: {
			scenarioId: "happy_path",
			tags: ["smoke", "happy"],
			context: {
				personaId: "guest",
				principal: { subject: "user_1" },
			},
			steps: [
				{
					kind: "trigger",
					trigger: {
						entrypointKind: "mutation",
						entrypointId: "submit_message",
						generate: true,
					},
					capture: [
						{
							captureId: "first_message",
							source: "last_trigger_output",
							path: "message",
						},
					],
				},
				{
					kind: "expect",
					expect: {
						kind: "signal",
						signalId: "message.created",
					},
					guard: signalExpectationGuard,
				},
			],
		},
		rejection_path: {
			scenarioId: "rejection_path",
			tags: ["smoke", "rejection"],
			context: {
				personaId: "guest",
				principal: { subject: "user_2" },
			},
			steps: [
				{
					kind: "trigger",
					trigger: {
						entrypointKind: "mutation",
						entrypointId: "submit_message",
						input: { message: "spam" },
					},
				},
				{
					kind: "expect",
					expect: {
						kind: "signal",
						signalId: "message.created",
					},
				},
			],
		},
	},
};

export const scenarioLockSnapshotFixture: ScenarioGeneratedInputLockSnapshot = {
	generated: {
		happy_path: {
			0: { message: "hello from lock snapshot" },
		},
	},
};

export const createScenarioInvokerFixture = () => ({
	invokeEntrypoint: async (input: {
		readonly entrypointKind: "mutation" | "query";
		readonly entrypointId: string;
		readonly input: Readonly<Record<string, unknown>>;
		readonly context: {
			readonly profile?: ScenarioExecutionProfile;
			readonly environment?: GuardRuntimeEnvironment;
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
		return {
			ok: true,
			output: { rows: [{ id: "m1", message: "hello" }] },
		};
	},
});

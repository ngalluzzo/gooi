import type {
	CompiledGuardPolicyPlan,
	CompiledSemanticGuardDefinition,
	GuardRuntimeEnvironment,
	SemanticConfidence,
} from "@gooi/guard-contracts/plans/guard-plan";
import type { SemanticJudgePort } from "@gooi/guard-contracts/ports/semantic-judge-port";
import { sha256 } from "@gooi/stable-json";

interface EvaluateSemanticTierInput {
	readonly definitions: readonly CompiledSemanticGuardDefinition[];
	readonly environment: GuardRuntimeEnvironment;
	readonly policy: CompiledGuardPolicyPlan;
	readonly context: Readonly<Record<string, unknown>>;
	readonly judge?: SemanticJudgePort;
	readonly samplingSeed: string;
}

export interface SemanticEvaluationOutcome {
	readonly evaluated: number;
	readonly skipped: number;
	readonly unavailable: boolean;
	readonly unavailableError: boolean;
	readonly results: readonly {
		readonly guardId: string;
		readonly description: string;
		readonly blocking: boolean;
		readonly passed: boolean;
		readonly details?: Readonly<Record<string, unknown>>;
	}[];
}

const resolveConfidence = (
	value: SemanticConfidence | undefined,
): SemanticConfidence => value ?? "medium";

const resolveSampleRate = (input: {
	readonly definition: CompiledSemanticGuardDefinition;
	readonly environment: GuardRuntimeEnvironment;
	readonly policy: CompiledGuardPolicyPlan;
}): number => {
	const explicit = input.definition.sampling?.[input.environment];
	if (typeof explicit === "number") {
		return explicit;
	}
	return input.policy.semanticSamplingDefault[input.environment];
};

const shouldSample = (seed: string, sampleRate: number): boolean => {
	if (sampleRate >= 1) {
		return true;
	}
	if (sampleRate <= 0) {
		return false;
	}
	const digest = sha256(seed);
	const prefix = digest.slice(0, 8);
	const numeric = Number.parseInt(prefix, 16);
	const ratio = numeric / 0xffffffff;
	return ratio < sampleRate;
};

const requiredInvocations = (
	environment: GuardRuntimeEnvironment,
	confidence: SemanticConfidence,
): number => {
	if (environment === "ci" && confidence === "high") {
		return 3;
	}
	return 1;
};

export const evaluateSemanticTier = async (
	input: EvaluateSemanticTierInput,
): Promise<SemanticEvaluationOutcome> => {
	const results: Array<SemanticEvaluationOutcome["results"][number]> = [];
	let evaluated = 0;
	let skipped = 0;

	for (const definition of input.definitions) {
		const sampleRate = resolveSampleRate({
			definition,
			environment: input.environment,
			policy: input.policy,
		});
		if (
			!shouldSample(
				`${input.samplingSeed}:${definition.guardId}:${input.environment}`,
				sampleRate,
			)
		) {
			skipped += 1;
			continue;
		}

		const confidence = resolveConfidence(definition.confidence);
		if (input.judge === undefined) {
			const unavailableMode =
				input.policy.semanticJudgeUnavailable[input.environment];
			results.push({
				guardId: definition.guardId,
				description: definition.description,
				passed: unavailableMode === "warn",
				blocking: unavailableMode === "error",
				details: {
					reason: "semantic_judge_unavailable",
					confidence,
				},
			});
			continue;
		}

		evaluated += 1;
		const invocationCount = requiredInvocations(input.environment, confidence);
		const verdicts: boolean[] = [];
		for (let index = 0; index < invocationCount; index += 1) {
			const result = await input.judge.evaluate({
				guardId: definition.guardId,
				rule: definition.rule,
				confidence,
				invocationIndex: index,
				invocationCount,
				context: input.context,
			});
			verdicts.push(result.pass);
		}
		const passCount = verdicts.filter(Boolean).length;
		const passed =
			invocationCount === 1 ? verdicts[0] === true : passCount >= 2;
		const lowConfidenceCiWarning =
			input.environment === "ci" && confidence === "low";
		results.push({
			guardId: definition.guardId,
			description: definition.description,
			passed,
			blocking: !passed && !lowConfidenceCiWarning,
			details: {
				confidence,
				invocationCount,
				passCount,
			},
		});
	}

	return {
		evaluated,
		skipped,
		unavailable: results.some(
			(result) => result.details?.reason === "semantic_judge_unavailable",
		),
		unavailableError: results.some(
			(result) =>
				result.details?.reason === "semantic_judge_unavailable" &&
				result.blocking,
		),
		results,
	};
};

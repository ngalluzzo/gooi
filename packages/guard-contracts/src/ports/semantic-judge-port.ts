import type { SemanticConfidence } from "../plans/guard-plan";

export interface SemanticJudgeResult {
	readonly pass: boolean;
	readonly rationale?: string;
}

export interface SemanticJudgePort {
	readonly evaluate: (input: {
		readonly guardId: string;
		readonly rule: string;
		readonly confidence: SemanticConfidence;
		readonly invocationIndex: number;
		readonly invocationCount: number;
		readonly context: Readonly<Record<string, unknown>>;
	}) => Promise<SemanticJudgeResult>;
}

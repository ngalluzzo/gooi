import { describe, expect, test } from "bun:test";
import type { CompiledGuardDefinition } from "@gooi/guard-contracts/plans/guard-plan";
import {
	evaluateGuard,
	evaluateInvariant,
} from "../src/evaluate/evaluate-guard";

describe("guard-runtime layered matrix", () => {
	const baseGuard: CompiledGuardDefinition = {
		sourceRef: {
			primitiveKind: "action",
			primitiveId: "guestbook.submit",
			path: "domain.actions.guestbook.submit.guards",
		},
		onFail: "abort",
		structural: [
			{
				guardId: "message_non_empty",
				description: "message must not be empty",
				operator: "neq",
				left: { kind: "path", path: "input.message" },
				right: { kind: "literal", value: "" },
			},
		],
		semantic: [
			{
				guardId: "message_quality",
				description: "message is meaningful",
				rule: "Message should be a meaningful user submission.",
				confidence: "medium",
				sampling: { production: 1, simulation: 1, ci: 1 },
			},
		],
	};

	test("enforces structural-first evaluation and abort policy", async () => {
		const result = await evaluateGuard({
			definition: baseGuard,
			context: { input: { message: "" } },
			environment: "production",
		});

		expect(result.ok).toBe(false);
		expect(result.error?.code).toBe("action_guard_error");
		expect(result.meta.semanticEvaluated).toBe(0);
	});

	test("applies semantic confidence behavior in CI", async () => {
		let invocationCount = 0;
		const result = await evaluateGuard({
			definition: {
				...baseGuard,
				onFail: "log_and_continue",
				semantic: [
					{
						guardId: "message_quality",
						description: "message is meaningful",
						rule: "Message should be meaningful",
						confidence: "high",
						sampling: { production: 1, simulation: 1, ci: 1 },
					},
				],
			},
			context: { input: { message: "hello" } },
			environment: "ci",
			semanticJudge: {
				evaluate: async () => {
					invocationCount += 1;
					return { pass: invocationCount % 2 === 1 };
				},
			},
		});

		expect(invocationCount).toBe(3);
		expect(result.ok).toBe(true);
		expect(result.meta.semanticEvaluated).toBe(1);
	});

	test("degrades on missing semantic judge by environment policy", async () => {
		const production = await evaluateGuard({
			definition: {
				...baseGuard,
				onFail: "log_and_continue",
			},
			context: { input: { message: "hello" } },
			environment: "production",
		});
		expect(production.ok).toBe(true);
		expect(
			production.diagnostics.some(
				(diagnostic) => diagnostic.code === "semantic_guard_unavailable_error",
			),
		).toBe(true);

		const ci = await evaluateGuard({
			definition: {
				...baseGuard,
				onFail: "abort",
			},
			context: { input: { message: "hello" } },
			environment: "ci",
		});
		expect(ci.ok).toBe(false);
		expect(ci.error?.code).toBe("semantic_guard_unavailable_error");
	});

	test("evaluates collection invariants with typed invariant outcomes", () => {
		const result = evaluateInvariant({
			definition: {
				sourceRef: {
					primitiveKind: "collection",
					primitiveId: "hello_messages",
					path: "domain.collections.hello_messages.invariants",
				},
				onFail: "abort",
				structural: [
					{
						guardId: "message_exists",
						description: "message must exist",
						operator: "exists",
						left: { kind: "path", path: "message" },
					},
				],
			},
			context: { message: null },
		});

		expect(result.ok).toBe(false);
		expect(result.error?.code).toBe("collection_invariant_error");
	});

	test("emits guard.violated signals when policy is emit_violation", async () => {
		const result = await evaluateGuard({
			definition: {
				...baseGuard,
				onFail: "emit_violation",
				structural: [
					{
						guardId: "message_non_empty",
						description: "message must not be empty",
						operator: "neq",
						left: { kind: "path", path: "input.message" },
						right: { kind: "literal", value: "" },
					},
				],
				semantic: [],
			},
			context: { input: { message: "" } },
		});

		expect(result.ok).toBe(true);
		expect(result.emittedSignals.length).toBe(1);
		expect(result.emittedSignals[0]?.signalId).toBe("guard.violated");
	});
});

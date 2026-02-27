import { describe, expect, test } from "bun:test";
import { createGuardError } from "../src/errors/guard-errors";
import type { CompiledGuardDefinition } from "../src/plans/guard-plan";

describe("guard contracts", () => {
	test("expresses layered guard plan contracts", () => {
		const plan: CompiledGuardDefinition = {
			sourceRef: {
				primitiveKind: "action",
				primitiveId: "guestbook.submit",
				path: "domain.actions.guestbook.submit.guards",
			},
			onFail: "abort",
			structural: [
				{
					guardId: "message_non_empty",
					description: "message is required",
					operator: "neq",
					left: { kind: "path", path: "input.message" },
					right: { kind: "literal", value: "" },
				},
			],
			semantic: [
				{
					guardId: "message_quality",
					description: "message should be meaningful",
					rule: "The message should be a meaningful user submission.",
					confidence: "medium",
				},
			],
		};

		expect(plan.semantic?.length).toBe(1);
		expect(plan.structural[0]?.operator).toBe("neq");
	});

	test("creates typed guard errors", () => {
		const error = createGuardError(
			"action_guard_error",
			"Action guard failed.",
			{
				primitiveKind: "action",
				primitiveId: "guestbook.submit",
				path: "domain.actions.guestbook.submit.guards",
			},
			{ guardId: "message_non_empty" },
		);

		expect(error.code).toBe("action_guard_error");
		expect(error.details).toEqual({ guardId: "message_non_empty" });
	});
});

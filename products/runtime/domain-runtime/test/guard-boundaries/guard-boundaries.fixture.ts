import type {
	CompiledGuardDefinition,
	CompiledInvariantDefinition,
} from "@gooi/guard-contracts/plans/guard-plan";

export const createActionGuard = (input: {
	guardId: string;
	description: string;
	onFail: CompiledGuardDefinition["onFail"];
	path: string;
	semantic?: string;
}): CompiledGuardDefinition => ({
	sourceRef: {
		primitiveKind: "action",
		primitiveId: "guestbook.submit",
		path: input.path,
	},
	onFail: input.onFail,
	structural: [
		{
			guardId: input.guardId,
			description: input.description,
			operator: "exists",
			left: { kind: "path", path: "input.message" },
		},
	],
	...(input.semantic === undefined
		? {}
		: {
				semantic: [
					{
						guardId: `${input.guardId}.semantic`,
						description: "semantic message validity",
						rule: input.semantic,
					},
				],
			}),
});

export const collectionInvariant = {
	sourceRef: {
		primitiveKind: "collection",
		primitiveId: "hello_messages",
		path: "domain.collections.hello_messages.invariants",
	},
	onFail: "abort",
	structural: [
		{
			guardId: "collection.message.exists",
			description: "message exists on write",
			operator: "exists",
			left: { kind: "path", path: "message" },
		},
	],
} satisfies CompiledInvariantDefinition;

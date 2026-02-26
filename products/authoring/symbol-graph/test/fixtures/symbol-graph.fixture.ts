import type { BuildSymbolGraphSnapshotInput } from "../../src/symbol-graph-contracts/symbol-graph.contracts";

/**
 * Fixture build input used to generate deterministic symbol graph artifacts.
 */
export const symbolGraphBuildFixture: BuildSymbolGraphSnapshotInput = {
	sourceHash: "9".repeat(64),
	symbols: [
		{
			id: "action:guestbook.submit",
			kind: "action",
			name: "guestbook.submit",
			location: {
				path: "docs/demo.yml",
				line: 42,
				character: 1,
			},
		},
		{
			id: "signal:message.created",
			kind: "signal",
			name: "message.created",
			location: {
				path: "docs/demo.yml",
				line: 62,
				character: 1,
			},
		},
		{
			id: "entrypoint:home.data.messages",
			kind: "entrypoint",
			name: "home.data.messages",
			location: {
				path: "docs/demo.yml",
				line: 91,
				character: 1,
			},
		},
		{
			id: "step:generated_ids",
			kind: "step_binding",
			name: "generated_ids",
			location: {
				path: "docs/demo.yml",
				line: 49,
				character: 3,
			},
			ownerSymbolId: "action:guestbook.submit",
		},
		{
			id: "expr:var.generated_ids.ids.0",
			kind: "expression_variable",
			name: "generated_ids.ids.0",
			location: {
				path: "docs/demo.yml",
				line: 57,
				character: 18,
			},
			ownerSymbolId: "action:guestbook.submit",
		},
		{
			id: "ambient:payload.user_id",
			kind: "ambient_symbol",
			name: "payload.user_id",
			location: {
				path: "docs/demo.yml",
				line: 46,
				character: 20,
			},
		},
	],
	references: [
		{
			fromSymbolId: "expr:var.generated_ids.ids.0",
			toSymbolId: "step:generated_ids",
			relationship: "references",
		},
	],
	signalImpact: {
		actions: [
			{
				actionSymbolId: "action:guestbook.submit",
				emittedSignalSymbolIds: ["signal:message.created"],
			},
		],
		queries: [
			{
				querySymbolId: "entrypoint:home.data.messages",
				refreshOnSignalSymbolIds: ["signal:message.created"],
			},
		],
	},
	renameConstraints: [
		{
			symbolKind: "ambient_symbol",
			renameable: false,
			blockedReason: "Ambient runtime symbols are reserved.",
		},
		{
			symbolKind: "step_binding",
			renameable: true,
		},
	],
};
